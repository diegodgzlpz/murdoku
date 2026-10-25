import type { ClueDef } from '../clueDef';
import type { EmptyRoomCountClue } from '../types';

export const emptyRoomCount: ClueDef<EmptyRoomCountClue> = {
  kind: 'emptyRoomCount',
  persons: () => [],
  evaluate: (c, board, pos) => {
    const occupied = new Set(Object.values(pos).map((cell) => board.roomOf[cell]));
    return board.rooms.length - occupied.size === c.count;
  },
  prune: (c, ctx) => {
    const roomCount = ctx.board.rooms.length;
    const target = roomCount - c.count; // rooms that must be occupied
    const possible: number[][] = Array.from({ length: roomCount }, () => []);
    const certain = new Set<number>();
    for (let p = 0; p < ctx.personCount; p++) {
      const rooms = new Set(ctx.candidates(p).map((cell) => ctx.board.roomOf[cell]!));
      for (const r of rooms) possible[r]!.push(p);
      if (rooms.size === 1) certain.add([...rooms][0]!);
    }
    const possibleRooms = possible.filter((ps) => ps.length > 0).length;
    if (certain.size > target || possibleRooms < target) return ctx.fail();

    if (certain.size === target) {
      // Every other room must stay empty.
      for (let p = 0; p < ctx.personCount; p++)
        for (const cell of ctx.candidates(p)) if (!certain.has(ctx.board.roomOf[cell]!)) ctx.remove(p, cell);
    }
    if (possibleRooms === target) {
      // Every possibly-occupied room must be occupied; a sole candidate is forced into it.
      possible.forEach((ps, room) => {
        if (ps.length !== 1) return;
        const p = ps[0]!;
        for (const cell of ctx.candidates(p)) if (ctx.board.roomOf[cell] !== room) ctx.remove(p, cell);
      });
    }
  },
  text: (c) => {
    if (c.count === 0) return 'Ninguna habitación estaba vacía.';
    if (c.count === 1) return 'Había exactamente una habitación vacía.';
    return `Había exactamente ${c.count} habitaciones vacías.`;
  },
  enumerateTrue: ({ board, solution }) => {
    const occupied = new Set(Object.values(solution.positions).map((cell) => board.roomOf[cell]));
    return [{ kind: 'emptyRoomCount', count: board.rooms.length - occupied.size }];
  },
};
