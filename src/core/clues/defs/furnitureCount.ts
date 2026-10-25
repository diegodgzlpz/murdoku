import { indexBoard } from '../../model/boardIndex';
import type { Board, CellIndex, FurnitureType } from '../../model/types';
import { FURNITURE, postureText } from '../../scenarios/furniture';
import type { ClueDef } from '../clueDef';
import type { OnlyOnFurnitureClue, SomeoneOnFurnitureClue } from '../types';

const isOn = (board: Board, cell: CellIndex | undefined, type: FurnitureType) =>
  cell !== undefined && indexBoard(board).furnitureAt[cell]?.type === type;

export const onlyOnFurniture: ClueDef<OnlyOnFurnitureClue> = {
  kind: 'onlyOnFurniture',
  persons: (c) => [c.person],
  evaluate: (c, board, pos) =>
    isOn(board, pos[c.person], c.furniture) &&
    Object.entries(pos).every(([id, cell]) => id === c.person || !isOn(board, cell, c.furniture)),
  prune: (c, ctx) => {
    const p = ctx.index(c.person);
    for (let q = 0; q < ctx.personCount; q++)
      for (const cell of ctx.candidates(q)) {
        const on = isOn(ctx.board, cell, c.furniture);
        // The person must be on it; everybody else must not.
        if (q === p ? !on : on) ctx.remove(q, cell);
      }
  },
  // "persona" is feminine in Spanish, whatever the person's gender.
  text: (c, ctx) => `${ctx.person(c.person).name} era la única persona ${postureText(c.furniture, 'f')}.`,
  enumerateTrue: ({ board, suspects, solution }) =>
    suspects.flatMap((p): OnlyOnFurnitureClue[] => {
      const f = indexBoard(board).furnitureAt[solution.positions[p.id]!];
      if (!f?.occupiable) return [];
      const others = Object.entries(solution.positions).filter(([id, cell]) => id !== p.id && isOn(board, cell, f.type));
      return others.length ? [] : [{ kind: 'onlyOnFurniture', person: p.id, furniture: f.type }];
    }),
};

/** 'la cama' when the board has a single piece of that type, else 'una cama'. */
function furniturePhrase(board: Board, type: FurnitureType): string {
  const indefinite = FURNITURE[type].withArticle;
  if (board.furniture.filter((f) => f.type === type).length !== 1) return indefinite;
  return indefinite.replace(/^una /, 'la ').replace(/^un /, 'el ');
}

export const someoneOnFurniture: ClueDef<SomeoneOnFurnitureClue> = {
  kind: 'someoneOnFurniture',
  persons: () => [],
  evaluate: (c, board, pos) => Object.values(pos).some((cell) => isOn(board, cell, c.furniture)),
  prune: (c, ctx) => {
    const holders: number[] = [];
    for (let q = 0; q < ctx.personCount; q++)
      if (ctx.candidates(q).some((cell) => isOn(ctx.board, cell, c.furniture))) holders.push(q);
    if (holders.length === 0) return ctx.fail();
    if (holders.length > 1) return;
    const only = holders[0]!;
    for (const cell of ctx.candidates(only)) if (!isOn(ctx.board, cell, c.furniture)) ctx.remove(only, cell);
  },
  text: (c, ctx) => `Alguien estaba sobre ${furniturePhrase(ctx.board, c.furniture)}.`,
  enumerateTrue: ({ board, solution }) => {
    const types = new Set<FurnitureType>();
    for (const cell of Object.values(solution.positions)) {
      const f = indexBoard(board).furnitureAt[cell];
      if (f?.occupiable) types.add(f.type);
    }
    return [...types].map((furniture): SomeoneOnFurnitureClue => ({ kind: 'someoneOnFurniture', furniture }));
  },
};
