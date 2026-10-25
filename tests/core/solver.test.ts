import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { enumerateTrueClues } from '../../src/core/clues/registry';
import { createPeople } from '../../src/core/model/people';
import { findConflicts, murdererOf, placementViolations } from '../../src/core/model/rules';
import { createRng } from '../../src/core/rng/rng';
import { levelFromJson, levelToJson } from '../../src/core/serialize/json';
import { countSolutions, propagateOnly, solve, solveWithLog } from '../../src/core/solver/solver';
import { handmadeBoard, handmadePuzzle, handmadeSolution } from '../fixtures/handmade';
import { bruteForceSolutions, makePuzzle, randomBoard, randomPositions } from '../helpers';

describe('rules', () => {
  it('murderer is the only person alone with the victim', () => {
    expect(murdererOf(handmadeBoard, handmadeSolution)).toBe('C');
    // Move D into the Dormitorio too: 3 people with V -> no murderer.
    expect(murdererOf(handmadeBoard, { ...handmadeSolution, D: 8 + 6 })).toBeNull();
  });

  it('detects row/col conflicts', () => {
    const conflicts = findConflicts(handmadeBoard, { A: 0, B: 3, C: 12 });
    expect(conflicts.map((c) => c.kind).sort()).toEqual(['col', 'row']);
  });

  it('hand-made solution is valid', () => {
    expect(placementViolations(handmadePuzzle, handmadeSolution)).toEqual([]);
  });
});

describe('solver on the hand-made puzzle', () => {
  it('finds exactly the known solution', () => {
    expect(countSolutions(handmadePuzzle)).toBe(1);
    const sol = solve(handmadePuzzle);
    expect(sol?.positions).toEqual(handmadeSolution);
    expect(sol?.murderer).toBe('C');
  });

  it('agrees with brute force', () => {
    const all = bruteForceSolutions(handmadePuzzle);
    expect(all).toEqual([handmadeSolution]);
  });

  it('dropping the relative clue yields multiple solutions', () => {
    const p = { ...handmadePuzzle, clues: handmadePuzzle.clues.filter((c) => c.kind !== 'relative') };
    expect(countSolutions(p)).toBe(2);
    expect(bruteForceSolutions(p).length).toBe(2);
  });

  it('contradictory clues yield 0', () => {
    const p = { ...handmadePuzzle, clues: [...handmadePuzzle.clues, { kind: 'inRoom' as const, person: 'A', room: 1 }] };
    expect(countSolutions(p)).toBe(0);
  });

  it('records a deduction log', () => {
    const res = solveWithLog(handmadePuzzle);
    expect(res.count).toBe(1);
    expect(res.log!.length).toBeGreaterThan(0);
    expect(res.log!.some((d) => d.type === 'eliminate' && d.cause.rule === 'clue')).toBe(true);
    expect(res.log!.some((d) => d.type === 'eliminate' && d.cause.rule === 'blocked')).toBe(true);
  });

  it('is solvable by propagation alone', () => {
    const r = propagateOnly(handmadePuzzle.board, handmadePuzzle.people, handmadePuzzle.clues);
    expect(r.ok).toBe(true);
    expect(r.solved).toBe(true);
    expect(solveWithLog(handmadePuzzle).guesses).toBe(0);
  });

  it('serializes and parses back', () => {
    const level = {
      puzzle: handmadePuzzle,
      solution: { positions: handmadeSolution, murderer: 'C' },
      params: { size: 6, seed: 'handmade', scenarioId: 'test', difficulty: 'easy' as const },
      stats: { attempts: 1, ms: 0, guesses: 0 },
    };
    const back = levelFromJson(levelToJson(level));
    expect(back).toEqual(level);
    expect(countSolutions(back.puzzle)).toBe(1);
  });
});

/** Solver count must match brute force on random small puzzles with random true clue subsets. */
function solverMatchesBruteForce(seed: number): boolean {
  const rng = createRng(`bf-${seed}`);
  const size = rng.range(3, 5);
  const board = randomBoard(rng, size, rng.range(2, size + 1));
  const positions = randomPositions(rng, board);
  if (!positions) return true;
  const people = createPeople(size);
  const all = enumerateTrueClues({
    board,
    suspects: people.filter((p) => !p.isVictim),
    solution: { positions, murderer: 'A' },
  });
  const clues = rng.shuffle(all).slice(0, rng.range(0, Math.min(8, all.length)));
  const puzzle = makePuzzle(board, clues);
  const bf = bruteForceSolutions(puzzle, 3).length;
  return countSolutions(puzzle, 3) === bf;
}

describe('solver vs brute force (property)', () => {
  it('counts match on random puzzles', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 1_000_000 }), solverMatchesBruteForce), { numRuns: 300 });
  });
});
