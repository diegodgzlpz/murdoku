import { DIFFICULTIES, generateLevel, GenerationError, levelToJson, randomSeed, SCENARIO_IDS, type Difficulty } from '../core/index';
import { parseArgs } from './args';
import { renderLevel } from './ascii';

const USAGE = `Uso: npm run generate -- [--n 7] [--seed 123] [--scenario ${SCENARIO_IDS.join('|')}]
                       [--difficulty ${DIFFICULTIES.join('|')}] [--json] [--no-solution]`;

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}

const size = Number(args.n ?? 7);
const seed = typeof args.seed === 'string' ? args.seed : randomSeed();
const scenarioId = typeof args.scenario === 'string' ? args.scenario : 'house';
const difficulty = (typeof args.difficulty === 'string' ? args.difficulty : 'medium') as Difficulty;

try {
  const level = generateLevel({ size, seed, scenarioId, difficulty });
  console.log(args.json ? levelToJson(level, true) : renderLevel(level, !args['no-solution']));
} catch (e) {
  if (e instanceof GenerationError || e instanceof Error) {
    console.error(`Error: ${e.message}\n${USAGE}`);
    process.exit(1);
  }
  throw e;
}
