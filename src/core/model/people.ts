import { createRng } from '../rng/rng';
import { VICTIM_ID, type Gender, type Person } from './types';

export interface PersonName {
  name: string;
  gender: Gender;
}

const f = (name: string): PersonName => ({ name, gender: 'f' });
const m = (name: string): PersonName => ({ name, gender: 'm' });

/** Name pools per suspect letter (both genders), plus the victim's 'V' pool. */
export const NAME_POOLS: Readonly<Record<string, readonly PersonName[]>> = {
  A: [f('Alba'), f('Ana'), f('Aurora'), f('Adriana'), m('Alberto'), m('Andrés'), m('Álvaro'), m('Arturo')],
  B: [f('Beatriz'), f('Blanca'), f('Belén'), f('Bárbara'), m('Benjamín'), m('Bruno'), m('Bernardo'), m('Bautista')],
  C: [f('Carla'), f('Clara'), f('Carmen'), f('Cristina'), m('Carlos'), m('César'), m('Cristian'), m('Claudio')],
  D: [f('Daniela'), f('Diana'), f('Dolores'), f('Débora'), m('Diego'), m('David'), m('Daniel'), m('Darío')],
  E: [f('Emma'), f('Elena'), f('Eva'), f('Estela'), m('Eduardo'), m('Esteban'), m('Emilio'), m('Enrique')],
  F: [f('Fernanda'), f('Fátima'), f('Flora'), f('Francisca'), m('Fernando'), m('Felipe'), m('Federico'), m('Fabián')],
  G: [f('Gloria'), f('Gabriela'), f('Gema'), f('Graciela'), m('Gonzalo'), m('Gabriel'), m('Gustavo'), m('Germán')],
  H: [f('Helena'), f('Hilda'), f('Hortensia'), f('Henar'), m('Hugo'), m('Héctor'), m('Horacio'), m('Hernán')],
  V: [f('Vera'), f('Valeria'), f('Violeta'), f('Verónica'), m('Víctor'), m('Vicente'), m('Valentín'), m('Vladimir')],
};

const SUSPECT_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

/** Fixed default cast (used when no seed is given, e.g. hand-made fixtures). */
const DEFAULT_CAST: readonly PersonName[] = SUSPECT_IDS.map((id, i) => NAME_POOLS[id]![i % 2 === 0 ? 0 : 4]!);

export const VICTIM_NAMES: readonly PersonName[] = NAME_POOLS[VICTIM_ID]!;

export const MAX_SIZE = SUSPECT_IDS.length + 1;

function build(size: number, suspects: readonly PersonName[], victim: PersonName): Person[] {
  if (size < 2 || size > MAX_SIZE) throw new Error(`Unsupported size ${size}`);
  const people: Person[] = SUSPECT_IDS.slice(0, size - 1).map((id, i) => ({ id, ...suspects[i]!, isVictim: false }));
  people.push({ id: VICTIM_ID, ...victim, isVictim: true });
  return people;
}

/** N people: suspects A.. plus the victim V last, with a fixed default cast. */
export function createPeople(size: number, victim: PersonName = VICTIM_NAMES[0]!): Person[] {
  return build(size, DEFAULT_CAST, victim);
}

/**
 * Cast drawn from the seed on its own stream (one name per letter, random gender),
 * so it never perturbs the board RNG.
 */
export function castForSeed(size: number, seed: string): Person[] {
  const rng = createRng(`cast|${seed}`);
  const suspects = SUSPECT_IDS.map((id) => rng.pick(NAME_POOLS[id]!));
  return build(size, suspects, rng.pick(VICTIM_NAMES));
}
