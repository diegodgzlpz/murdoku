import { indexBoard } from '../../model/boardIndex';
import { orthogonalNeighbors } from '../../model/geometry';
import type { Board, CellIndex, FurnitureType } from '../../model/types';
import { FURNITURE, postureText } from '../../scenarios/furniture';
import { unaryDef } from '../clueDef';
import { roomPhrase } from '../text';
import type { NextToFurnitureClue, OnFurnitureClue } from '../types';

/** Furniture types orthogonally adjacent to `cell` within the same room. */
function adjacentFurnitureTypes(board: Board, cell: CellIndex): Set<FurnitureType> {
  const { furnitureAt } = indexBoard(board);
  const types = new Set<FurnitureType>();
  for (const n of orthogonalNeighbors(cell, board.size)) {
    const f = furnitureAt[n];
    if (f && board.roomOf[n] === board.roomOf[cell]) types.add(f.type);
  }
  return types;
}

export const nextToFurniture = unaryDef<NextToFurnitureClue>({
  kind: 'nextToFurniture',
  allows: (clue, board, cell) =>
    (clue.room === undefined || board.roomOf[cell] === clue.room) &&
    adjacentFurnitureTypes(board, cell).has(clue.furniture),
  text: (clue, ctx) => {
    const where = clue.room === undefined ? '' : ` en ${roomPhrase(ctx.board, clue.room)}`;
    return `${ctx.person(clue.person).name} estaba al lado de ${FURNITURE[clue.furniture].withArticle}${where}.`;
  },
  enumerateTrue: ({ board, suspects, solution }) =>
    suspects.flatMap((p) => {
      const cell = solution.positions[p.id]!;
      const room = board.roomOf[cell]!;
      return [...adjacentFurnitureTypes(board, cell)].flatMap((furniture): NextToFurnitureClue[] => [
        { kind: 'nextToFurniture', person: p.id, furniture },
        { kind: 'nextToFurniture', person: p.id, furniture, room },
      ]);
    }),
});

export const onFurniture = unaryDef<OnFurnitureClue>({
  kind: 'onFurniture',
  allows: (clue, board, cell) => indexBoard(board).furnitureAt[cell]?.type === clue.furniture,
  text: (clue, ctx) => {
    const person = ctx.person(clue.person);
    return `${person.name} estaba ${postureText(clue.furniture, person.gender)}.`;
  },
  enumerateTrue: ({ board, suspects, solution }) =>
    suspects.flatMap((p): OnFurnitureClue[] => {
      const f = indexBoard(board).furnitureAt[solution.positions[p.id]!];
      return f && f.occupiable ? [{ kind: 'onFurniture', person: p.id, furniture: f.type }] : [];
    }),
});
