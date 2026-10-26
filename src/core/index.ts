// Public API of the game core. ui/ and cli/ must import only from here.
export * from './model/types';
export type { Clue, ClueKind, Direction } from './clues/types';
export { cellIndex, rowOf, colOf, orthogonalNeighbors, isAdjacent, isRoomWall, neighborAt, SIDES } from './model/geometry';
export { indexBoard, isBlocked } from './model/boardIndex';
export { castForSeed, createPeople, NAME_POOLS, VICTIM_NAMES, type PersonName } from './model/people';
export { murdererOf, findConflicts, placementViolations, samePositions, type Conflict } from './model/rules';
export { clueText, evaluateClue, CLUE_KINDS } from './clues/registry';
export { victimClueText } from './clues/text';
export { clueFocusCells } from './clues/focus';
export { puzzleClueGroups, puzzleClueTexts, type ClueGroup, type ClueLine } from './clues/groups';
export { FURNITURE } from './scenarios/furniture';
export { SCENARIOS, getScenario } from './scenarios/catalog';
export { createRng, randomSeed, type Rng } from './rng/rng';
export { countSolutions, solve, solveWithLog, propagateOnly, type SearchResult } from './solver/solver';
export type { Deduction, DeductionCause } from './solver/engine';
export {
  generateLevel,
  GenerationError,
  MIN_SIZE,
  MAX_SIZE,
  DIFFICULTIES,
  SCENARIO_IDS,
  type GenerateOptions,
} from './generator/generate';
export { checkLevelInvariants } from './generator/invariants';
export { levelToJson, levelFromJson, LevelFormatError } from './serialize/json';

