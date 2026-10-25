import type { Board, CellIndex, Furniture, Side } from './types';

/** Derived per-cell lookups for a board (cached; boards are treated as immutable). */
export interface BoardIndex {
  furnitureAt: (Furniture | undefined)[];
  windowSides: Side[][];
  blocked: Uint8Array;
}

const cache = new WeakMap<Board, BoardIndex>();

export function indexBoard(board: Board): BoardIndex {
  let idx = cache.get(board);
  if (idx) return idx;
  const n = board.size * board.size;
  const furnitureAt: (Furniture | undefined)[] = new Array(n).fill(undefined);
  const windowSides: Side[][] = Array.from({ length: n }, () => []);
  const blocked = new Uint8Array(n);
  for (const f of board.furniture) {
    furnitureAt[f.cell] = f;
    if (!f.occupiable) blocked[f.cell] = 1;
  }
  for (const w of board.windows) windowSides[w.cell]!.push(w.side);
  idx = { furnitureAt, windowSides, blocked };
  cache.set(board, idx);
  return idx;
}

export function isBlocked(board: Board, cell: CellIndex): boolean {
  return indexBoard(board).blocked[cell] === 1;
}
