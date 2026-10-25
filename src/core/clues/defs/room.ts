import { unaryDef } from '../clueDef';
import { roomPhrase } from '../text';
import type { InRoomClue, NotInRoomClue } from '../types';

export const inRoom = unaryDef<InRoomClue>({
  kind: 'inRoom',
  allows: (clue, board, cell) => board.roomOf[cell] === clue.room,
  text: (clue, ctx) => `${ctx.person(clue.person).name} estaba en ${roomPhrase(ctx.board, clue.room)}.`,
  enumerateTrue: ({ board, suspects, solution }) =>
    suspects.map((p) => ({ kind: 'inRoom', person: p.id, room: board.roomOf[solution.positions[p.id]!]! })),
});

export const notInRoom = unaryDef<NotInRoomClue>({
  kind: 'notInRoom',
  allows: (clue, board, cell) => board.roomOf[cell] !== clue.room,
  text: (clue, ctx) => `${ctx.person(clue.person).name} no estaba en ${roomPhrase(ctx.board, clue.room)}.`,
  enumerateTrue: ({ board, suspects, solution }) =>
    suspects.flatMap((p) => {
      const actual = board.roomOf[solution.positions[p.id]!];
      return board.rooms
        .filter((r) => r.id !== actual)
        .map((r): NotInRoomClue => ({ kind: 'notInRoom', person: p.id, room: r.id }));
    }),
});
