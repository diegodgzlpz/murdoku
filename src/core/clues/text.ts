import type { Board, Room, RoomId } from '../model/types';

export function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function getRoom(board: Board, id: RoomId): Room {
  const room = board.rooms[id];
  if (!room || room.id !== id) throw new Error(`Unknown room ${id}`);
  return room;
}

/** 'la cocina', 'el salón'. */
export function roomPhrase(board: Board, id: RoomId): string {
  const room = getRoom(board, id);
  return `${room.article} ${lowerFirst(room.name)}`;
}

export function victimClueText(victimName: string): string {
  return `${victimName}, la víctima, estaba a solas con su asesino.`;
}
