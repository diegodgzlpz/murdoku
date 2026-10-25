import type { Gender, RoomId } from '../../model/types';
import type { ClueDef, PruneContext } from '../clueDef';
import type { RoomWithGenderClue } from '../types';

const NUMBERS = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho'];

function peoplePhrase(gender: Gender, count: number): string {
  if (count === 1) return gender === 'm' ? 'un hombre' : 'una mujer';
  return `${NUMBERS[count] ?? count} ${gender === 'm' ? 'hombres' : 'mujeres'}`;
}

function roomsOf(ctx: PruneContext, q: number): Set<RoomId> {
  return new Set(ctx.candidates(q).map((c) => ctx.board.roomOf[c]!));
}

export const roomWithGender: ClueDef<RoomWithGenderClue> = {
  kind: 'roomWithGender',
  persons: (c) => [c.person],
  evaluate: (c, board, pos, people) => {
    const room = board.roomOf[pos[c.person]!];
    const n = people.filter((q) => q.id !== c.person && q.gender === c.gender && board.roomOf[pos[q.id]!] === room).length;
    return n === c.count;
  },
  prune: (c, ctx) => {
    const p = ctx.index(c.person);
    const others: Array<{ q: number; rooms: Set<RoomId> }> = [];
    ctx.people.forEach((person, q) => {
      if (q !== p && person.gender === c.gender) others.push({ q, rooms: roomsOf(ctx, q) });
    });
    const certainIn = (r: RoomId) => others.filter((o) => o.rooms.size === 1 && o.rooms.has(r));
    const possibleIn = (r: RoomId) => others.filter((o) => o.rooms.has(r));

    // The person can only be in rooms that can still hold exactly `count` such people.
    for (const cell of ctx.candidates(p)) {
      const r = ctx.board.roomOf[cell]!;
      if (certainIn(r).length > c.count || possibleIn(r).length < c.count) ctx.remove(p, cell);
    }
    // Once the person's room is known, push the others in or out of it.
    const myRooms = roomsOf(ctx, p);
    if (myRooms.size !== 1) return;
    const room = [...myRooms][0]!;
    const certain = certainIn(room);
    const possible = possibleIn(room);
    if (certain.length === c.count)
      for (const o of possible)
        if (!certain.includes(o)) for (const cell of ctx.candidates(o.q)) if (ctx.board.roomOf[cell] === room) ctx.remove(o.q, cell);
    if (possible.length === c.count)
      for (const o of possible) for (const cell of ctx.candidates(o.q)) if (ctx.board.roomOf[cell] !== room) ctx.remove(o.q, cell);
  },
  text: (c, ctx) => `${ctx.person(c.person).name} estaba en una habitación con ${peoplePhrase(c.gender, c.count)}.`,
  enumerateTrue: ({ board, suspects, people, solution }) =>
    suspects.flatMap((p): RoomWithGenderClue[] => {
      const room = board.roomOf[solution.positions[p.id]!];
      const out: RoomWithGenderClue[] = [];
      for (const gender of ['m', 'f'] as const) {
        const count = people.filter(
          (q) => q.id !== p.id && q.gender === gender && board.roomOf[solution.positions[q.id]!] === room,
        ).length;
        if (count > 0) out.push({ kind: 'roomWithGender', person: p.id, gender, count });
      }
      return out;
    }),
};
