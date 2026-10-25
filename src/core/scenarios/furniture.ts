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
};

export function postureText(type: FurnitureType, gender: Gender): string {
  const def = FURNITURE[type];
  if (!def.posture) throw new Error(`Furniture ${type} is not occupiable`);
  return `${def.posture[gender]} ${def.posture.prep} ${def.withArticle}`;
}
