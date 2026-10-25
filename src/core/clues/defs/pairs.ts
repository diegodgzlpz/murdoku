import { colOf, rowOf } from '../../model/geometry';
import type { CellIndex, RoomId } from '../../model/types';
import type { ClueDef, PruneContext } from '../clueDef';
import type { DifferentRoomClue, Direction, RelativeClue, SameRoomClue } from '../types';

function roomsOf(ctx: PruneContext, p: number): Set<RoomId> {
  const rooms = new Set<RoomId>();
  for (const c of ctx.candidates(p)) rooms.add(ctx.board.roomOf[c]!);
  return rooms;
}

function pairs<T>(items: T[]): Array<[T, T]> {
  const out: Array<[T, T]> = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) out.push([items[i]!, items[j]!]);
  return out;
}

export const sameRoom: ClueDef<SameRoomClue> = {
  kind: 'sameRoom',
  persons: (c) => [c.a, c.b],
  evaluate: (c, board, pos) => board.roomOf[pos[c.a]!] === board.roomOf[pos[c.b]!],
  prune: (c, ctx) => {
    const a = ctx.index(c.a);
    const b = ctx.index(c.b);
    for (const [x, y] of [[a, b], [b, a]] as const) {
      const allowed = roomsOf(ctx, y);
      for (const cell of ctx.candidates(x)) if (!allowed.has(ctx.board.roomOf[cell]!)) ctx.remove(x, cell);
    }
  },
  text: (c, ctx) => `${ctx.person(c.a).name} y ${ctx.person(c.b).name} estaban en la misma habitación.`,
  enumerateTrue: ({ board, suspects, solution }) =>
    pairs(suspects)
      .filter(([x, y]) => board.roomOf[solution.positions[x.id]!] === board.roomOf[solution.positions[y.id]!])
      .map(([x, y]): SameRoomClue => ({ kind: 'sameRoom', a: x.id, b: y.id })),
};

export const differentRoom: ClueDef<DifferentRoomClue> = {
  kind: 'differentRoom',
  persons: (c) => [c.a, c.b],
  evaluate: (c, board, pos) => board.roomOf[pos[c.a]!] !== board.roomOf[pos[c.b]!],
  prune: (c, ctx) => {
    const a = ctx.index(c.a);
    const b = ctx.index(c.b);
    for (const [x, y] of [[a, b], [b, a]] as const) {
      const rooms = roomsOf(ctx, y);
      if (rooms.size !== 1) continue;
      const [only] = rooms;
      for (const cell of ctx.candidates(x)) if (ctx.board.roomOf[cell] === only) ctx.remove(x, cell);
    }
  },
  text: (c, ctx) => `${ctx.person(c.a).name} y ${ctx.person(c.b).name} estaban en habitaciones distintas.`,
  enumerateTrue: ({ board, suspects, solution }) =>
    pairs(suspects)
      .filter(([x, y]) => board.roomOf[solution.positions[x.id]!] !== board.roomOf[solution.positions[y.id]!])
      .map(([x, y]): DifferentRoomClue => ({ kind: 'differentRoom', a: x.id, b: y.id })),
};

/** Relation "a further `dir` than b" expressed as key(a) < key(b). */
function key(dir: Direction, cell: CellIndex, size: number): number {
  switch (dir) {
    case 'N':
      return rowOf(cell, size);
    case 'S':
      return -rowOf(cell, size);
    case 'W':
      return colOf(cell, size);
    case 'E':
      return -colOf(cell, size);
  }
}

const DIR_TEXT: Record<Direction, string> = { N: 'norte', S: 'sur', E: 'este', W: 'oeste' };

export const relative: ClueDef<RelativeClue> = {
  kind: 'relative',
  persons: (c) => [c.a, c.b],
  evaluate: (c, board, pos) => key(c.dir, pos[c.a]!, board.size) < key(c.dir, pos[c.b]!, board.size),
  prune: (c, ctx) => {
    const size = ctx.board.size;
    const a = ctx.index(c.a);
    const b = ctx.index(c.b);
    const aCells = ctx.candidates(a);
    const bCells = ctx.candidates(b);
    if (aCells.length === 0 || bCells.length === 0) return;
    const maxB = Math.max(...bCells.map((x) => key(c.dir, x, size)));
    const minA = Math.min(...aCells.map((x) => key(c.dir, x, size)));
    for (const cell of aCells) if (key(c.dir, cell, size) >= maxB) ctx.remove(a, cell);
    for (const cell of bCells) if (key(c.dir, cell, size) <= minA) ctx.remove(b, cell);
  },
  text: (c, ctx) => `${ctx.person(c.a).name} estaba más al ${DIR_TEXT[c.dir]} que ${ctx.person(c.b).name}.`,
  enumerateTrue: ({ board, suspects, solution }) =>
    pairs(suspects).flatMap(([x, y]): RelativeClue[] => {
      const px = solution.positions[x.id]!;
      const py = solution.positions[y.id]!;
      const size = board.size;
      // One row-relation and one column-relation per pair (rows/cols are always distinct).
      const ns: Direction = rowOf(px, size) < rowOf(py, size) ? 'N' : 'S';
      const we: Direction = colOf(px, size) < colOf(py, size) ? 'W' : 'E';
      return [
        { kind: 'relative', a: x.id, b: y.id, dir: ns },
        { kind: 'relative', a: x.id, b: y.id, dir: we },
      ];
    }),
};
