// Public API of the game core. ui/ and cli/ must import only from here.
export * from './model/types';
export type { Clue, ClueKind, Direction } from './clues/types';
export { cellIndex, rowOf, colOf, orthogonalNeighbors, isAdjacent, isRoomWall, neighborAt, SIDES } from './model/geometry';
export { indexBoard, isBlocked } from './model/boardIndex';
export { createPeople } from './model/people';
export { murdererOf, findConflicts, placementViolations, samePositions, type Conflict } from './model/rules';
export { clueText, evaluateClue, CLUE_KINDS } from './clues/registry';
export { VICTIM_CLUE_TEXT } from './clues/text';
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

import { clueText } from './clues/registry';
import { VICTIM_CLUE_TEXT } from './clues/text';
import type { Puzzle } from './model/types';

/** All clue sentences to show the player: the victim's fixed clue first. */
export function puzzleClueTexts(puzzle: Puzzle): string[] {
  return [VICTIM_CLUE_TEXT, ...puzzle.clues.map((c) => clueText(c, puzzle.board, puzzle.people))];
}
