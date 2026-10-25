import type { Board, CellIndex, Side } from './types';

export const SIDES: readonly Side[] = ['N', 'E', 'S', 'W'];

export function cellIndex(row: number, col: number, size: number): CellIndex {
  return row * size + col;
}

export function rowOf(cell: CellIndex, size: number): number {
  return Math.floor(cell / size);
}

export function colOf(cell: CellIndex, size: number): number {
  return cell % size;
}

/** Cell across `side`, or null when that side is the board's outer edge. */
export function neighborAt(cell: CellIndex, side: Side, size: number): CellIndex | null {
  const r = rowOf(cell, size);
  const c = colOf(cell, size);
  switch (side) {
    case 'N':
      return r > 0 ? cell - size : null;
    case 'S':
      return r < size - 1 ? cell + size : null;
    case 'W':
      return c > 0 ? cell - 1 : null;
    case 'E':
      return c < size - 1 ? cell + 1 : null;
  }
}

/**
 * THE single definition of "next to": orthogonal adjacency (N, E, S, W).
 * Diagonal cells are never adjacent. Every clue must go through this function.
 */
export function orthogonalNeighbors(cell: CellIndex, size: number): CellIndex[] {
  const out: CellIndex[] = [];
  for (const side of SIDES) {
    const n = neighborAt(cell, side, size);
    if (n !== null) out.push(n);
  }
  return out;
}

export function isAdjacent(a: CellIndex, b: CellIndex, size: number): boolean {
  return orthogonalNeighbors(a, size).includes(b);
}

/** True when `side` of `cell` is a room wall: board edge or a different room across it. */
export function isRoomWall(board: Board, cell: CellIndex, side: Side): boolean {
  const n = neighborAt(cell, side, board.size);
  return n === null || board.roomOf[n] !== board.roomOf[cell];
}

export function isOuterSide(cell: CellIndex, side: Side, size: number): boolean {
  return neighborAt(cell, side, size) === null;
}
