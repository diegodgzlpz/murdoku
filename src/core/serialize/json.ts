import { CLUE_KINDS } from '../clues/registry';
import type { Level } from '../model/types';

export const SCHEMA_VERSION = 1;

export function levelToJson(level: Level, pretty = false): string {
  return JSON.stringify(level, null, pretty ? 2 : undefined);
}

export class LevelFormatError extends Error {}

/** Parses and structurally validates a level. Does not re-run the solver (see checkLevelInvariants). */
export function levelFromJson(json: string): Level {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new LevelFormatError(`Invalid JSON: ${(e as Error).message}`);
  }
  const fail = (msg: string): never => {
    throw new LevelFormatError(msg);
  };
  const lvl = data as Level;
  if (!lvl || typeof lvl !== 'object') fail('Level must be an object');
  const { puzzle, solution, params } = lvl;
  if (!puzzle || puzzle.schemaVersion !== SCHEMA_VERSION) fail('Unsupported schemaVersion');
  const { board, people, clues } = puzzle;
  const size = board?.size;
  if (!Number.isInteger(size) || size < 2) fail('Invalid board size');
  const cells = size * size;
  if (!Array.isArray(board.roomOf) || board.roomOf.length !== cells) fail('roomOf length mismatch');
  if (!Array.isArray(board.rooms)) fail('rooms missing');
  board.rooms.forEach((r, i) => r.id === i || fail(`rooms[${i}] has id ${r.id}`));
  for (const r of board.roomOf) if (!board.rooms[r]) fail(`roomOf references unknown room ${r}`);
  const inRange = (c: unknown) => Number.isInteger(c) && (c as number) >= 0 && (c as number) < cells;
  for (const f of board.furniture ?? fail('furniture missing')) inRange(f.cell) || fail('furniture cell out of range');
  for (const w of board.windows ?? fail('windows missing')) inRange(w.cell) || fail('window cell out of range');
  if (!Array.isArray(people) || people.length !== size) fail('people count must equal size');
  if (people.filter((p) => p.isVictim).length !== 1) fail('exactly one victim required');
  if (!Array.isArray(clues)) fail('clues missing');
  for (const c of clues) (CLUE_KINDS as string[]).includes(c.kind) || fail(`unknown clue kind ${c.kind}`);
  if (!solution?.positions || !solution.murderer) fail('solution missing');
  for (const p of people) inRange(solution.positions[p.id]) || fail(`solution position for ${p.id} invalid`);
  if (!params) fail('params missing');
  return lvl;
}
