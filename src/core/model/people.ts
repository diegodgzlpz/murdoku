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

export const MAX_SIZE = SUSPECTS.length + 1;

/** N people: suspects A.. plus the victim V last. */
export function createPeople(size: number): Person[] {
  if (size < 2 || size > MAX_SIZE) throw new Error(`Unsupported size ${size}`);
  const people: Person[] = SUSPECTS.slice(0, size - 1).map((s) => ({ ...s, isVictim: false }));
  people.push({ id: VICTIM_ID, name: 'la víctima', gender: 'f', isVictim: true });
  return people;
}
