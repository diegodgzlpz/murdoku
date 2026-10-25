import { createPeople, MAX_SIZE, victimForSeed } from '../model/people';
import type { Difficulty, GenerationParams, Level, Puzzle } from '../model/types';
import { createRng } from '../rng/rng';
import { getScenario, SCENARIOS } from '../scenarios/catalog';
import { solveWithLog } from '../solver/solver';
import { selectClues } from './clueSelection';
import { decorate, DEFAULT_DECORATE, type DecorateOptions } from './decorate';
import { checkLevelInvariants } from './invariants';
import { partitionRooms } from './partition';
import { generateSolution } from './placement';

export const MIN_SIZE = 6;
export { MAX_SIZE };
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export interface GenerateOptions {
  timeoutMs?: number;
  maxAttempts?: number;
  minRoomSize?: number;
  maxRoomSize?: number;
  decorate?: DecorateOptions;
}

export class GenerationError extends Error {
  constructor(
    message: string,
    readonly params: GenerationParams,
  ) {
    super(message);
    this.name = 'GenerationError';
  }
}

export function defaultRoomSizes(size: number): { min: number; max: number } {
  return { min: 4, max: Math.max(8, Math.ceil(size * 1.6)) };
}

/**
 * Solution-first generator. Same params => same level (all randomness flows from the seed).
 * Never returns an invalid level: throws GenerationError on timeout or exhausted attempts.
 */
export function generateLevel(params: GenerationParams, options: GenerateOptions = {}): Level {
  const { size, seed, scenarioId, difficulty } = params;
  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE)
    throw new GenerationError(`size must be an integer in [${MIN_SIZE}, ${MAX_SIZE}]`, params);
  if (!DIFFICULTIES.includes(difficulty)) throw new GenerationError(`unknown difficulty ${difficulty}`, params);
  const scenario = getScenario(scenarioId);
  const sizes = defaultRoomSizes(size);
  const minRoom = options.minRoomSize ?? sizes.min;
  const maxRoom = options.maxRoomSize ?? sizes.max;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxAttempts = options.maxAttempts ?? 200;

  const start = Date.now();
  const deadline = start + timeoutMs;
  const root = createRng(`murdoku|${seed}|${size}|${scenarioId}|${difficulty}`);
  const people = createPeople(size, victimForSeed(seed));
  const cells = size * size;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (Date.now() > deadline) break;
    const rng = root.fork(`attempt-${attempt}`);

    const avg = (minRoom + maxRoom) / 2;
    const roomCount = Math.min(
      scenario.rooms.length,
      Math.max(3, Math.round(cells / avg) + rng.range(-1, 1)),
    );
    const roomOf = partitionRooms(rng, size, { roomCount, minRoomSize: minRoom, maxRoomSize: maxRoom });
    if (!roomOf) continue;

    const board = decorate(rng, size, roomOf, scenario, options.decorate ?? DEFAULT_DECORATE);
    const solution = generateSolution(rng, board, people);
    if (!solution) continue;

    const selected = selectClues(rng, board, people, solution, difficulty, deadline);
    if (!selected) continue;

    const puzzle: Puzzle = { schemaVersion: 1, scenarioId, board, people, clues: selected.clues };
    const guesses = solveWithLog(puzzle, 1).guesses;
    const level: Level = {
      puzzle,
      solution,
      params: { ...params },
      stats: { attempts: attempt, ms: Date.now() - start, guesses },
    };
    const errors = checkLevelInvariants(level);
    if (errors.length) {
      // Should be impossible; never deliver, but surface it loudly.
      throw new GenerationError(`internal invariant failure: ${errors.join('; ')}`, params);
    }
    return level;
  }
  throw new GenerationError(
    Date.now() > deadline ? `timeout after ${timeoutMs} ms` : `no valid level after ${maxAttempts} attempts`,
    params,
  );
}

export const SCENARIO_IDS = SCENARIOS.map((s) => s.id);
