import type { Board, CellIndex, FurnitureType, RoomId } from '../model/types';
import type { Clue } from './types';

const roomCells = (board: Board, room: RoomId): CellIndex[] => board.rooms.find((r) => r.id === room)?.cells ?? [];

function furnitureCells(board: Board, type: FurnitureType, room?: RoomId): CellIndex[] {
  return board.furniture
    .filter((f) => f.type === type && (room === undefined || board.roomOf[f.cell] === room))
    .map((f) => f.cell);
}

/**
 * Cells a clue talks about (its rooms, furniture, windows, row or column), for highlighting.
 * Purely descriptive: says nothing about where the person can be. Empty when the clue names no place.
 */
export function clueFocusCells(clue: Clue, board: Board): CellIndex[] {
  switch (clue.kind) {
    case 'inRoom':
    case 'notInRoom':
      return roomCells(board, clue.room);
    case 'nextToFurniture':
      return furnitureCells(board, clue.furniture, clue.room);
    case 'onFurniture':
    case 'onlyOnFurniture':
    case 'someoneOnFurniture':
      return furnitureCells(board, clue.furniture);
    case 'nextToWindow':
      return [
        ...new Set(
          board.windows.map((w) => w.cell).filter((c) => clue.room === undefined || board.roomOf[c] === clue.room),
        ),
      ];
    case 'inLine':
      return Array.from({ length: board.size }, (_, i) =>
        clue.axis === 'row' ? clue.index * board.size + i : i * board.size + clue.index,
      );
    default:
      return [];
  }
}
