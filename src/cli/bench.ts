import { DIFFICULTIES, generateLevel, SCENARIO_IDS } from '../core/index';
import { parseArgs } from './args';

/** npm run bench -- [--count 30] [--sizes 6,7,8,9] */
const args = parseArgs(process.argv.slice(2));
const count = Number(args.count ?? 30);
const sizes = String(args.sizes ?? '6,7,8,9').split(',').map(Number);

const stats = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const avg = s.reduce((a, b) => a + b, 0) / s.length;
  return `avg ${avg.toFixed(0).padStart(5)} ms | p50 ${String(s[Math.floor(s.length / 2)]).padStart(5)} | max ${String(s.at(-1)).padStart(5)}`;
};

console.log(`${count} niveles por N y dificultad (escenarios rotando)\n`);
for (const size of sizes) {
  const all: number[] = [];
  for (const difficulty of DIFFICULTIES) {
    const ms: number[] = [];
    const clues: number[] = [];
    for (let i = 0; i < count; i++) {
      const level = generateLevel({ size, seed: `bench-${i}`, scenarioId: SCENARIO_IDS[i % SCENARIO_IDS.length]!, difficulty });
      ms.push(level.stats.ms);
      clues.push(level.puzzle.clues.length);
    }
    all.push(...ms);
    const avgClues = (clues.reduce((a, b) => a + b, 0) / clues.length).toFixed(1);
    console.log(`${size}x${size} ${difficulty.padEnd(6)} ${stats(ms)} | pistas ${avgClues}`);
  }
  console.log(`${size}x${size} TOTAL  ${stats(all)}\n`);
}
