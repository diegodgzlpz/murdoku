import type { PersonId } from '../core/index';

/** Pawn colours, classic board-game style. */
const PERSON_COLORS: Record<PersonId, { fill: string; ink: string }> = {
  A: { fill: '#b8322a', ink: '#fff' },
  B: { fill: '#d6a531', ink: '#2a1d0e' },
  C: { fill: '#2c6aa8', ink: '#fff' },
  D: { fill: '#2f7d4f', ink: '#fff' },
  E: { fill: '#7a3f9b', ink: '#fff' },
  F: { fill: '#d4692a', ink: '#fff' },
  G: { fill: '#1d8585', ink: '#fff' },
  H: { fill: '#6a4a33', ink: '#fff' },
  V: { fill: '#f4efe3', ink: '#1b1b1b' },
};

export function personColor(id: PersonId): { fill: string; ink: string } {
  return PERSON_COLORS[id] ?? { fill: '#888', ink: '#fff' };
}

/** Colour for small pencil-mark letters (the white victim pawn needs dark ink). */
export function noteColor(id: PersonId): string {
  const { fill } = personColor(id);
  return id === 'V' ? '#1b1b1b' : fill;
}

/** Soft floor-plan tints, one per room id (12 = max rooms per scenario). */
const ROOM_TINTS = [
  '#ecdcb0', '#cfdfb8', '#efc9b8', '#c3d8e2', '#ddcde4', '#f2e3bb',
  '#d3e4d3', '#ebd3c3', '#cbd4ea', '#e6d6b9', '#d6e6dc', '#eed5da',
];

export function roomTint(roomId: number): string {
  return ROOM_TINTS[roomId % ROOM_TINTS.length]!;
}
