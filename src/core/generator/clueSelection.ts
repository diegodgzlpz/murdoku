import { enumerateTrueClues } from '../clues/registry';
import type { Clue } from '../clues/types';
import type { Board, Difficulty, Person, Solution } from '../model/types';
import type { Rng } from '../rng/rng';
import { countSolutions, propagateOnly } from '../solver/solver';

type Weights = Record<string, number>;

/**
 * Preference per clue kind and difficulty. Keys are clue kinds, with a '+room' variant for
 * clues whose optional room is set. Weight 0 excludes the kind.
 */
export const DIFFICULTY_WEIGHTS: Record<Difficulty, Weights> = {
  easy: {
    inRoom: 3, notInRoom: 0.5, 'nextToFurniture+room': 2.5, nextToFurniture: 1.5, onFurniture: 3,
    'nextToWindow+room': 2, nextToWindow: 1.5, byWall: 0.5, inCorner: 1, sameRoom: 1,
    differentRoom: 0.5, relative: 0.5, emptyRoomCount: 2,
    inLine: 0.5, onlyOnFurniture: 2, roomWithGender: 1.5, someoneOnFurniture: 2,
  },
  medium: {
    inRoom: 1.5, notInRoom: 1, 'nextToFurniture+room': 1.2, nextToFurniture: 1.2, onFurniture: 1.2,
    'nextToWindow+room': 1, nextToWindow: 1, byWall: 1, inCorner: 1, sameRoom: 1,
    differentRoom: 1, relative: 1, emptyRoomCount: 1,
    inLine: 0.35, onlyOnFurniture: 1.5, roomWithGender: 2, someoneOnFurniture: 2.5,
  },
  hard: {
    inRoom: 0.3, notInRoom: 1.5, 'nextToFurniture+room': 0.8, nextToFurniture: 1.5, onFurniture: 0.5,
    'nextToWindow+room': 0.6, nextToWindow: 1.2, byWall: 1, inCorner: 1.2, sameRoom: 1.5,
    differentRoom: 1.5, relative: 2, emptyRoomCount: 0.5,
    inLine: 0.2, onlyOnFurniture: 1, roomWithGender: 2.5, someoneOnFurniture: 3,
  },
};

export function weightKey(clue: Clue): string {
  return 'room' in clue && clue.room !== undefined && (clue.kind === 'nextToFurniture' || clue.kind === 'nextToWindow')
    ? `${clue.kind}+room`
    : clue.kind;
}

export interface ClueSelectionResult {
  clues: Clue[];
}

/** Max candidates scored per greedy step (bounds the cost on big boards). */
const SAMPLE = 60;

/**
 * Greedy: repeatedly add the true clue that removes the most candidates (times its difficulty
 * weight) until the solution is unique, then minimize. Easy levels must also be solvable by
 * propagation alone (no guessing). Returns null if uniqueness can't be reached.
 */
export function selectClues(
  rng: Rng,
  board: Board,
  people: Person[],
  solution: Solution,
  difficulty: Difficulty,
  deadline: number,
): ClueSelectionResult | null {
  const weights = DIFFICULTY_WEIGHTS[difficulty];
  const suspects = people.filter((p) => !p.isVictim);
  let pool = enumerateTrueClues({ board, suspects, people, solution }).filter((c) => (weights[weightKey(c)] ?? 0) > 0);
  const chosen: Clue[] = [];
  const needsNoGuess = difficulty === 'easy';
  const puzzleOf = (clues: Clue[]) => ({ schemaVersion: 1 as const, scenarioId: '', board, people, clues });
  const done = (clues: Clue[]) =>
    needsNoGuess ? propagateOnly(board, people, clues).solved && countSolutions(puzzleOf(clues)) === 1 : countSolutions(puzzleOf(clues)) === 1;

  let remaining = propagateOnly(board, people, chosen).remaining;
  while (!done(chosen)) {
    if (Date.now() > deadline || pool.length === 0) return null;
    let best: Clue | null = null;
    let bestScore = -Infinity;
    let bestRemaining = remaining;
    for (const cand of rng.shuffle(pool).slice(0, SAMPLE)) {
      const r = propagateOnly(board, people, [...chosen, cand]);
      if (!r.ok) continue; // cannot happen for true clues; defensive
      const gain = remaining - r.remaining;
      // Small random term keeps variety; zero-gain clues may still cut the search space.
      const score = (gain + 0.25) * weights[weightKey(cand)]! + rng.next() * 0.5;
      if (score > bestScore) {
        best = cand;
        bestScore = score;
        bestRemaining = r.remaining;
      }
    }
    if (!best) return null;
    chosen.push(best);
    remaining = bestRemaining;
    pool = pool.filter((c) => c !== best);
  }

  // Minimization: drop every clue that is not needed (random order, seeded).
  let clues = chosen;
  for (const clue of rng.shuffle(chosen)) {
    if (Date.now() > deadline) return null;
    const without = clues.filter((c) => c !== clue);
    if (done(without)) clues = without;
  }
  return { clues };
}
