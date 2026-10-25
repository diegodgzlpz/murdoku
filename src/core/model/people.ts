import { createRng } from '../rng/rng';
import { VICTIM_ID, type Gender, type Person } from './types';

const SUSPECTS: ReadonlyArray<{ id: string; name: string; gender: Gender }> = [
  { id: 'A', name: 'Alba', gender: 'f' },
  { id: 'B', name: 'Benjamín', gender: 'm' },
  { id: 'C', name: 'Carla', gender: 'f' },
  { id: 'D', name: 'Diego', gender: 'm' },
  { id: 'E', name: 'Emma', gender: 'f' },
  { id: 'F', name: 'Fernando', gender: 'm' },
  { id: 'G', name: 'Gloria', gender: 'f' },
  { id: 'H', name: 'Hugo', gender: 'm' },
];

export interface VictimName {
  name: string;
  gender: Gender;
}

export const VICTIM_NAMES: readonly VictimName[] = [
  { name: 'Vera', gender: 'f' },
  { name: 'Víctor', gender: 'm' },
  { name: 'Valeria', gender: 'f' },
  { name: 'Vicente', gender: 'm' },
  { name: 'Violeta', gender: 'f' },
  { name: 'Valentín', gender: 'm' },
];

export const MAX_SIZE = SUSPECTS.length + 1;

/** Victim name derived from the seed on its own stream, so it never perturbs level generation. */
export function victimForSeed(seed: string): VictimName {
  return createRng(`victim|${seed}`).pick(VICTIM_NAMES);
}

/** N people: suspects A.. plus the victim V last. */
export function createPeople(size: number, victim: VictimName = VICTIM_NAMES[0]!): Person[] {
  if (size < 2 || size > MAX_SIZE) throw new Error(`Unsupported size ${size}`);
  const people: Person[] = SUSPECTS.slice(0, size - 1).map((s) => ({ ...s, isVictim: false }));
  people.push({ id: VICTIM_ID, name: victim.name, gender: victim.gender, isVictim: true });
  return people;
}
