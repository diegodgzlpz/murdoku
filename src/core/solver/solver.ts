import type { Clue } from '../clues/types';
import { placementViolations } from '../model/rules';
import type { Board, Person, Positions, Puzzle, Solution } from '../model/types';
import { murdererOf } from '../model/rules';
import { compileModel, Propagator, State, type Deduction, type Model } from './engine';

export interface SearchResult {
  /** Number of solutions found, capped at the requested limit. */
  count: number;
  solutions: Solution[];
  /** Branching decisions taken (0 = solved by propagation alone). */
  guesses: number;
  log: Deduction[] | null;
}

interface SearchOptions {
  limit: number;
  withLog: boolean;
}

function toPositions(model: Model, state: State): Positions {
  const positions: Positions = {};
  for (let p = 0; p < model.personCount; p++) {
    const base = p * model.cellCount;
    for (let c = 0; c < model.cellCount; c++) if (state.dom[base + c]) positions[model.people[p]!.id] = c;
  }
  return positions;
}

function search(model: Model, opts: SearchOptions): SearchResult {
  const log: Deduction[] | null = opts.withLog ? [] : null;
  const prop = new Propagator(model, log);
  const solutions: Solution[] = [];
  let guesses = 0;
  const puzzleView: Puzzle = {
    schemaVersion: 1,
    scenarioId: '',
    board: model.board,
    people: model.people,
    clues: model.clues,
  };

  const dfs = (state: State, depth: number): void => {
    if (!prop.propagate(state)) return;
    // MRV: unassigned person with the fewest candidates.
    let best = -1;
    for (let p = 0; p < model.personCount; p++) {
      const n = state.count[p]!;
      if (n > 1 && (best < 0 || n < state.count[best]!)) best = p;
    }
    if (best < 0) {
      const positions = toPositions(model, state);
      // Safety net: propagation is sound but not necessarily complete, so verify every rule.
      if (placementViolations(puzzleView, positions).length === 0) {
        solutions.push({ positions, murderer: murdererOf(model.board, positions)! });
      }
      return;
    }
    const person = model.people[best]!.id;
    const base = best * model.cellCount;
    for (let c = 0; c < model.cellCount && solutions.length < opts.limit; c++) {
      if (!state.dom[base + c]) continue;
      guesses++;
      log?.push({ type: 'guess', person, cell: c, depth });
      const child = state.clone();
      if (prop.assign(child, best, c)) dfs(child, depth + 1);
      if (solutions.length < opts.limit) log?.push({ type: 'backtrack', person, cell: c, depth });
    }
  };

  const root = State.initial(model);
  if (prop.applyStatic(root)) dfs(root, 0);
  return { count: solutions.length, solutions, guesses, log };
}

function modelOf(puzzle: Puzzle): Model {
  return compileModel(puzzle.board, puzzle.people, puzzle.clues);
}

/** 0, 1, or `limit` (meaning "at least limit"). Stops as soon as `limit` solutions are found. */
export function countSolutions(puzzle: Puzzle, limit = 2): number {
  return search(modelOf(puzzle), { limit, withLog: false }).count;
}

export function solve(puzzle: Puzzle): Solution | null {
  return search(modelOf(puzzle), { limit: 1, withLog: false }).solutions[0] ?? null;
}

/** Search for up to 2 solutions recording every deduction, guess and backtrack. */
export function solveWithLog(puzzle: Puzzle, limit = 2): SearchResult {
  return search(modelOf(puzzle), { limit, withLog: true });
}

export interface PropagationResult {
  ok: boolean;
  /** Total remaining candidates over all people (N = fully determined). */
  remaining: number;
  solved: boolean;
}

/**
 * Root propagation only (no search). Used by the generator to score clues and by the
 * difficulty estimate ("solvable without guessing").
 */
export function propagateOnly(board: Board, people: Person[], clues: Clue[]): PropagationResult {
  const model = compileModel(board, people, clues);
  const prop = new Propagator(model);
  const state = State.initial(model);
  const ok = prop.applyStatic(state) && prop.propagate(state);
  let remaining = 0;
  for (let p = 0; p < model.personCount; p++) remaining += state.count[p]!;
  return { ok, remaining, solved: ok && remaining === model.personCount };
}
