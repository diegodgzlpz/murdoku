import { evaluateClue } from '../clues/registry';
import { isBlocked } from './boardIndex';
import { colOf, rowOf } from './geometry';
import { VICTIM_ID, type Board, type PersonId, type Positions, type Puzzle } from './types';

/**
 * The murderer is the only person alone with the victim: the victim's room holds exactly
 * one other person. Returns null when the rule is not satisfied.
 */
export function murdererOf(board: Board, positions: Positions): PersonId | null {
  const vCell = positions[VICTIM_ID];
  if (vCell === undefined) return null;
  const vRoom = board.roomOf[vCell];
  const others = Object.entries(positions).filter(
    ([id, cell]) => id !== VICTIM_ID && board.roomOf[cell] === vRoom,
  );
  return others.length === 1 ? others[0]![0] : null;
}

export interface Conflict {
  kind: 'row' | 'col' | 'cell' | 'blocked';
  persons: PersonId[];
  /** Row/col index, or cell index for 'cell'/'blocked'. */
  at: number;
}

/** Real-time conflicts of a (possibly partial) placement. */
export function findConflicts(board: Board, positions: Partial<Positions>): Conflict[] {
  const size = board.size;
  const byRow = new Map<number, PersonId[]>();
  const byCol = new Map<number, PersonId[]>();
  const byCell = new Map<number, PersonId[]>();
  const conflicts: Conflict[] = [];
  for (const [id, cell] of Object.entries(positions)) {
    if (cell === undefined) continue;
    push(byRow, rowOf(cell, size), id);
    push(byCol, colOf(cell, size), id);
    push(byCell, cell, id);
    if (isBlocked(board, cell)) conflicts.push({ kind: 'blocked', persons: [id], at: cell });
  }
  for (const [at, persons] of byCell) if (persons.length > 1) conflicts.push({ kind: 'cell', persons, at });
  for (const [at, persons] of byRow) if (persons.length > 1) conflicts.push({ kind: 'row', persons, at });
  for (const [at, persons] of byCol) if (persons.length > 1) conflicts.push({ kind: 'col', persons, at });
  return conflicts;
}

function push(map: Map<number, PersonId[]>, key: number, id: PersonId): void {
  const list = map.get(key);
  if (list) list.push(id);
  else map.set(key, [id]);
}

/** Every rule violation of a complete placement; empty array = valid solution. */
export function placementViolations(puzzle: Puzzle, positions: Positions): string[] {
  const { board, people, clues } = puzzle;
  const errors: string[] = [];
  for (const p of people) if (positions[p.id] === undefined) errors.push(`${p.id} not placed`);
  if (errors.length) return errors;
  for (const c of findConflicts(board, positions)) errors.push(`${c.kind} conflict: ${c.persons.join(',')}`);
  if (murdererOf(board, positions) === null) errors.push('victim is not alone with exactly one person');
  clues.forEach((clue, i) => {
    if (!evaluateClue(clue, board, positions)) errors.push(`clue #${i} (${clue.kind}) is false`);
  });
  return errors;
}

export function samePositions(a: Positions, b: Positions): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}
