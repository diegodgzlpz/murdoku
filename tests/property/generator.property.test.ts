import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  checkLevelInvariants,
  countSolutions,
  DIFFICULTIES,
  generateLevel,
  isBlocked,
  levelFromJson,
  levelToJson,
  murdererOf,
  SCENARIO_IDS,
  type GenerationParams,
  type Level,
} from '../../src/core/index';
import { isContiguous, partitionRooms } from '../../src/core/generator/partition';
import { createRng } from '../../src/core/rng/rng';

const RUNS = Number(process.env.MURDOKU_PROPERTY_RUNS ?? 240);
const SIZES = [6, 7, 8, 9];

function paramsFor(i: number): GenerationParams {
  return {
    size: SIZES[i % SIZES.length]!,
    seed: `prop-${i}`,
    scenarioId: SCENARIO_IDS[i % SCENARIO_IDS.length]!,
    difficulty: DIFFICULTIES[Math.floor(i / SIZES.length) % DIFFICULTIES.length]!,
  };
}

const stripTiming = (l: Level) => ({ ...l, stats: { ...l.stats, ms: 0 } });

describe('generator invariants (property)', () => {
  it(`${RUNS} distinct seeds over N=6..9: unique solution, unique murderer, true clues, no blocked`, () => {
    const timings = new Map<number, number[]>();
    for (let i = 0; i < RUNS; i++) {
      const params = paramsFor(i);
      const level = generateLevel(params);
      const { puzzle, solution } = level;

      expect(checkLevelInvariants(level), JSON.stringify(params)).toEqual([]);
      expect(countSolutions(puzzle, 2)).toBe(1);
      expect(murdererOf(puzzle.board, solution.positions)).toBe(solution.murderer);
      for (const cell of Object.values(solution.positions)) expect(isBlocked(puzzle.board, cell)).toBe(false);
      if (params.difficulty === 'easy') expect(level.stats.guesses).toBe(0);

      const list = timings.get(params.size) ?? [];
      list.push(level.stats.ms);
      timings.set(params.size, list);
    }
    const report = [...timings].map(([n, ms]) => `${n}x${n}: ${(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(0)} ms avg (${ms.length})`);
    console.log(`Generation times: ${report.join(' | ')}`);
  });

  it('same seed + params => same level', () => {
    for (const i of [0, 1, 2, 3, 17, 42]) {
      const a = generateLevel(paramsFor(i));
      const b = generateLevel(paramsFor(i));
      expect(stripTiming(a)).toEqual(stripTiming(b));
    }
    expect(stripTiming(generateLevel(paramsFor(0)))).not.toEqual(
      stripTiming(generateLevel({ ...paramsFor(0), seed: 'other' })),
    );
  });

  it('levels round-trip through JSON and stay valid', () => {
    const level = generateLevel(paramsFor(5));
    const back = levelFromJson(levelToJson(level));
    expect(back).toEqual(level);
    expect(checkLevelInvariants(back)).toEqual([]);
  });

  it('rejects invalid params explicitly', () => {
    expect(() => generateLevel({ ...paramsFor(0), size: 5 })).toThrow(/size/);
    expect(() => generateLevel({ ...paramsFor(0), size: 10 })).toThrow(/size/);
    expect(() => generateLevel({ ...paramsFor(0), scenarioId: 'moon' })).toThrow(/scenario/);
    expect(() => generateLevel(paramsFor(3), { timeoutMs: 0 })).toThrow(/timeout/);
  });
});

describe('partition (property)', () => {
  it('rooms are contiguous and within size bounds', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1e6 }), fc.integer({ min: 6, max: 9 }), (seed, size) => {
        const rng = createRng(`part-${seed}`);
        const roomCount = Math.round((size * size) / 7);
        const roomOf = partitionRooms(rng, size, { roomCount, minRoomSize: 4, maxRoomSize: 12 });
        if (!roomOf) return true; // allowed to fail; the generator retries
        for (let r = 0; r < roomCount; r++) {
          const cells = roomOf.flatMap((x, c) => (x === r ? [c] : []));
          if (cells.length < 4 || cells.length > 12 || !isContiguous(cells, size)) return false;
        }
        return roomOf.every((r) => r >= 0 && r < roomCount);
      }),
      { numRuns: 300 },
    );
  });
});
