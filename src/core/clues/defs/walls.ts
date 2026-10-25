import { indexBoard } from '../../model/boardIndex';
import { isRoomWall, SIDES } from '../../model/geometry';
import type { Board, CellIndex } from '../../model/types';
import { unaryDef } from '../clueDef';
import { roomPhrase } from '../text';
import type { ByWallClue, InCornerClue, NextToWindowClue } from '../types';

export function hasWindow(board: Board, cell: CellIndex): boolean {
  return indexBoard(board).windowSides[cell]!.length > 0;
}

export function isByWall(board: Board, cell: CellIndex): boolean {
  return SIDES.some((s) => isRoomWall(board, cell, s));
}

/** Room corner: walls on two perpendicular sides (N/S plus E/W). Parallel walls don't count. */
export function isRoomCorner(board: Board, cell: CellIndex): boolean {
  const vertical = isRoomWall(board, cell, 'N') || isRoomWall(board, cell, 'S');
  const horizontal = isRoomWall(board, cell, 'E') || isRoomWall(board, cell, 'W');
  return vertical && horizontal;
}

export const nextToWindow = unaryDef<NextToWindowClue>({
  kind: 'nextToWindow',
  allows: (clue, board, cell) =>
    (clue.room === undefined || board.roomOf[cell] === clue.room) && hasWindow(board, cell),
  text: (clue, ctx) => {
    const where = clue.room === undefined ? '' : ` en ${roomPhrase(ctx.board, clue.room)}`;
    return `${ctx.person(clue.person).name} estaba junto a una ventana${where}.`;
  },
  enumerateTrue: ({ board, suspects, solution }) =>
    suspects.flatMap((p): NextToWindowClue[] => {
      const cell = solution.positions[p.id]!;
      if (!hasWindow(board, cell)) return [];
      return [
        { kind: 'nextToWindow', person: p.id },
        { kind: 'nextToWindow', person: p.id, room: board.roomOf[cell]! },
      ];
    }),
});

export const byWall = unaryDef<ByWallClue>({
  kind: 'byWall',
  allows: (_clue, board, cell) => isByWall(board, cell),
  text: (clue, ctx) => `${ctx.person(clue.person).name} estaba junto a una pared.`,
  enumerateTrue: ({ board, suspects, solution }) =>
    suspects
      .filter((p) => isByWall(board, solution.positions[p.id]!))
      .map((p): ByWallClue => ({ kind: 'byWall', person: p.id })),
});

export const inCorner = unaryDef<InCornerClue>({
  kind: 'inCorner',
  allows: (_clue, board, cell) => isRoomCorner(board, cell),
  text: (clue, ctx) => `${ctx.person(clue.person).name} estaba en una esquina de la habitación.`,
  enumerateTrue: ({ board, suspects, solution }) =>
    suspects
      .filter((p) => isRoomCorner(board, solution.positions[p.id]!))
      .map((p): InCornerClue => ({ kind: 'inCorner', person: p.id })),
});
