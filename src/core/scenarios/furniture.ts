import type { FurnitureType, Gender } from '../model/types';

export interface FurnitureDef {
  type: FurnitureType;
  occupiable: boolean;
  /** Spanish noun with indefinite article, e.g. 'una planta'. */
  withArticle: string;
  /** Posture for occupiable furniture: 'sentado' | 'tumbado' | 'de pie'. Agrees with gender. */
  posture?: { m: string; f: string; prep: string };
  /** Provisional glyph for UI/CLI. */
  glyph: string;
  letter: string;
}

const SIT = { m: 'sentado', f: 'sentada', prep: 'en' };
const LIE = { m: 'tumbado', f: 'tumbada', prep: 'en' };
const STAND = { m: 'de pie', f: 'de pie', prep: 'sobre' };
const STAND_IN = { m: 'de pie', f: 'de pie', prep: 'en' };

export const FURNITURE: Record<FurnitureType, FurnitureDef> = {
  bed: { type: 'bed', occupiable: true, withArticle: 'una cama', posture: LIE, glyph: '🛏️', letter: 'b' },
  chair: { type: 'chair', occupiable: true, withArticle: 'una silla', posture: SIT, glyph: '🪑', letter: 'c' },
  rug: { type: 'rug', occupiable: true, withArticle: 'una alfombra', posture: STAND, glyph: '🟫', letter: 'r' },
  sofa: { type: 'sofa', occupiable: true, withArticle: 'un sofá', posture: SIT, glyph: '🛋️', letter: 's' },
  stool: { type: 'stool', occupiable: true, withArticle: 'un taburete', posture: SIT, glyph: '🍄', letter: 'k' },
  lounger: { type: 'lounger', occupiable: true, withArticle: 'una tumbona', posture: LIE, glyph: '🏖️', letter: 'l' },
  bench: { type: 'bench', occupiable: true, withArticle: 'un banco', posture: SIT, glyph: '🪵', letter: 'n' },
  plant: { type: 'plant', occupiable: false, withArticle: 'una planta', glyph: '🪴', letter: 'P' },
  tv: { type: 'tv', occupiable: false, withArticle: 'una televisión', glyph: '📺', letter: 'T' },
  shelf: { type: 'shelf', occupiable: false, withArticle: 'una estantería', glyph: '📚', letter: 'E' },
  table: { type: 'table', occupiable: false, withArticle: 'una mesa', glyph: '🟪', letter: 'M' },
  fridge: { type: 'fridge', occupiable: false, withArticle: 'una nevera', glyph: '🧊', letter: 'F' },
  counter: { type: 'counter', occupiable: false, withArticle: 'una barra', glyph: '🍸', letter: 'B' },
  piano: { type: 'piano', occupiable: false, withArticle: 'un piano', glyph: '🎹', letter: 'O' },
  speaker: { type: 'speaker', occupiable: false, withArticle: 'un altavoz', glyph: '🔊', letter: 'S' },
  bathtub: { type: 'bathtub', occupiable: false, withArticle: 'una bañera', glyph: '🛁', letter: 'U' },
  wardrobe: { type: 'wardrobe', occupiable: false, withArticle: 'un armario', glyph: '🚪', letter: 'A' },
  umbrella: { type: 'umbrella', occupiable: false, withArticle: 'una sombrilla', glyph: '⛱️', letter: 'Y' },
  rack: { type: 'rack', occupiable: false, withArticle: 'un perchero', glyph: '🧥', letter: 'R' },
  armchair: { type: 'armchair', occupiable: true, withArticle: 'un sillón', posture: SIT, glyph: '💺', letter: 'a' },
  toilet: { type: 'toilet', occupiable: true, withArticle: 'un inodoro', posture: SIT, glyph: '🚽', letter: 'i' },
  shower: { type: 'shower', occupiable: true, withArticle: 'una ducha', posture: STAND_IN, glyph: '🚿', letter: 'd' },
  treadmill: { type: 'treadmill', occupiable: true, withArticle: 'una cinta de correr', posture: STAND, glyph: '🏃', letter: 't' },
  exerciseBike: { type: 'exerciseBike', occupiable: true, withArticle: 'una bicicleta estática', posture: SIT, glyph: '🚲', letter: 'e' },
  weightBench: { type: 'weightBench', occupiable: true, withArticle: 'un banco de pesas', posture: LIE, glyph: '🏋️', letter: 'w' },
  yogaMat: { type: 'yogaMat', occupiable: true, withArticle: 'una esterilla', posture: STAND, glyph: '🧘', letter: 'y' },
  rowingMachine: { type: 'rowingMachine', occupiable: true, withArticle: 'una máquina de remo', posture: SIT, glyph: '🚣', letter: 'm' },
  sink: { type: 'sink', occupiable: false, withArticle: 'un lavabo', glyph: '🚰', letter: 'L' },
  washer: { type: 'washer', occupiable: false, withArticle: 'una lavadora', glyph: '🫧', letter: 'W' },
  towelRail: { type: 'towelRail', occupiable: false, withArticle: 'un toallero', glyph: '🧻', letter: 'H' },
  laundryBasket: { type: 'laundryBasket', occupiable: false, withArticle: 'un cesto de la ropa', glyph: '🧺', letter: 'C' },
  display: { type: 'display', occupiable: false, withArticle: 'un expositor', glyph: '🗄️', letter: 'I' },
  checkout: { type: 'checkout', occupiable: false, withArticle: 'una caja registradora', glyph: '🧾', letter: 'K' },
  cart: { type: 'cart', occupiable: false, withArticle: 'un carrito', glyph: '🛒', letter: 'Q' },
  clothesTable: { type: 'clothesTable', occupiable: false, withArticle: 'una mesa de ropa', glyph: '👕', letter: '#' },
  mannequin: { type: 'mannequin', occupiable: false, withArticle: 'un maniquí', glyph: '👗', letter: 'N' },
  basket: { type: 'basket', occupiable: false, withArticle: 'una cesta', glyph: '🛍️', letter: 'G' },
  securityGate: { type: 'securityGate', occupiable: false, withArticle: 'un arco antirrobo', glyph: '🚧', letter: 'Z' },
  dumbbellRack: { type: 'dumbbellRack', occupiable: false, withArticle: 'un mancuernero', glyph: '💪', letter: 'D' },
  punchingBag: { type: 'punchingBag', occupiable: false, withArticle: 'un saco de boxeo', glyph: '🥊', letter: 'X' },
  kettlebells: { type: 'kettlebells', occupiable: false, withArticle: 'unas pesas rusas', glyph: '🔔', letter: 'J' },
  lockers: { type: 'lockers', occupiable: false, withArticle: 'unas taquillas', glyph: '🔐', letter: 'V' },
};

export function postureText(type: FurnitureType, gender: Gender): string {
  const def = FURNITURE[type];
  if (!def.posture) throw new Error(`Furniture ${type} is not occupiable`);
  return `${def.posture[gender]} ${def.posture.prep} ${def.withArticle}`;
}
