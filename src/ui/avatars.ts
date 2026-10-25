import type { Gender, Person, PersonId } from '../core/index';

/**
 * Hand-built SVG portraits (64×64). Each character combines a hairstyle, colours and an
 * accessory so it stays recognisable at small sizes; the shirt takes the person's pawn colour.
 */

interface Character {
  skin: string;
  hair: string;
  /** Drawn behind the head (long hair, afro, bun…). */
  back?: (hair: string) => string;
  /** Drawn over the head (fringe, top hair). */
  front: (hair: string) => string;
  extras?: string[];
}

const SKIN = { light: '#f6d3b3', fair: '#eabf98', tan: '#d39b6e', brown: '#a8724a', dark: '#7a4f30' };
const HAIR = {
  brown: '#6b4226', black: '#26201c', blonde: '#e2b85c', red: '#b5532a',
  grey: '#a3a3a3', white: '#c9c9c9', dark: '#3b2516', auburn: '#8a3b1f',
};

const path = (d: string, fill: string, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;

// ---- hairstyles ----
const shortTop = (h: string) => path('M19 28C18 16 24 11 32 11C40 11 46 16 45 28C43 22 39 18 32 18C25 18 21 22 19 28Z', h);
const buzz = (h: string) => path('M19.5 26C19 17 25 14 32 14C39 14 45 17 44.5 26C42 21 38 19 32 19C26 19 22 21 19.5 26Z', h, ' opacity=".75"');
const sidePart = (h: string) => path('M19 29C17 15 26 10 33 10C42 10 47 16 45 29C44 23 42 20 39 17C33 21 26 21 21 22C20 24 19.5 26 19 29Z', h);
const slick = (h: string) =>
  path('M19 27C19 15 26 11 33 11C41 11 46 16 45 27C44 20 38 16 32 16C26 16 21 20 19 27Z', h) +
  '<path d="M25 14Q32 12 39 14" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" fill="none"/>';
const spiky = (h: string) =>
  path('M18 28L19 16L23 18L26 10L30 16L34 9L37 16L42 11L42 19L46 17L45 28C43 22 39 19 32 19C25 19 21 22 18 28Z', h);
const curlsTop = (h: string) =>
  [[21, 22, 5], [25, 16, 5.5], [32, 13.5, 6], [39, 16, 5.5], [43, 22, 5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${h}"/>`).join('');
const sideTufts = (h: string) => `<ellipse cx="19.5" cy="27" rx="2.6" ry="5" fill="${h}"/><ellipse cx="44.5" cy="27" rx="2.6" ry="5" fill="${h}"/>`;
const thinTop = (h: string) => sideTufts(h) + path('M22 20Q32 13 42 20Q32 17 22 20Z', h);

const longBack = (h: string) => path('M17 30C15 14 24 9 32 9C40 9 49 14 47 30L49 54L15 54Z', h);
const wavyBack = (h: string) => path('M17 30C15 14 24 9 32 9C40 9 49 14 47 30C50 38 46 44 50 52L14 52C18 44 14 38 17 30Z', h);
const sweptFringe = (h: string) => path('M18 31C17 16 25 11 32 11C39 11 47 16 46 31C43 24 38 20 33 18C29 23 23 26 18 31Z', h);
const bobBack = (h: string) => path('M15.5 42C13 15 24 10 32 10C40 10 51 15 48.5 42L43 42L43 30L21 30L21 42Z', h);
const bangs = (h: string) => path('M19 26C19 14 26 12 32 12C38 12 45 14 45 26C38 22 26 22 19 26Z', h);
const bunBack = (h: string) => `<circle cx="32" cy="9" r="6.5" fill="${h}"/>`;
const afroBack = (h: string) => `<circle cx="32" cy="25" r="20" fill="${h}"/>`;
const ponytailBack = (h: string) => `<ellipse cx="47" cy="36" rx="4.5" ry="12" fill="${h}" transform="rotate(-12 47 36)"/>`;
const braidsBack = (h: string) =>
  [18, 46].flatMap((x) => [36, 42, 48, 54].map((y) => `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="3.6" fill="${h}"/>`)).join('');
const pixie = (h: string) => path('M19 28C17 15 25 11 32 11C40 11 47 15 45 26L41 21L37 24L34 19L29 23L25 19L21 25Z', h);

// ---- accessories ----
const glasses = (c = '#222') =>
  `<g fill="none" stroke="${c}" stroke-width="1.4"><circle cx="27" cy="30" r="3.8"/><circle cx="37" cy="30" r="3.8"/><path d="M30.8 30H33.2M23.2 29.5L19.5 28.5M40.8 29.5L44.5 28.5"/></g>`;
const roundGlasses = () => glasses('#8a6a2a');
const earrings = (c = '#e6b422') => `<circle cx="19.5" cy="37" r="1.6" fill="${c}"/><circle cx="44.5" cy="37" r="1.6" fill="${c}"/>`;
const hoops = () => `<g fill="none" stroke="#e6b422" stroke-width="1.3"><circle cx="19" cy="38.5" r="2.8"/><circle cx="45" cy="38.5" r="2.8"/></g>`;
const mustache = (h: string) => path('M26.5 37C28.5 34.5 31 35 32 36C33 35 35.5 34.5 37.5 37C35 36.5 33.5 37.3 32 37.3C30.5 37.3 29 36.5 26.5 37Z', h);
const thinMustache = (h: string) => `<path d="M27.5 36.2Q32 34.6 36.5 36.2" stroke="${h}" stroke-width="1.3" fill="none"/>`;
const beard = (h: string, opacity = 1) =>
  path('M19 30C19.5 44 25 47.5 32 47.5C39 47.5 44.5 44 45 30C43.5 39 39 41.5 32 41.5C25 41.5 20.5 39 19 30Z', h, ` opacity="${opacity}"`) +
  (opacity === 1 ? mustache(h) : '');
const freckles = () =>
  [[25, 34], [27, 35.5], [24, 36], [39, 34], [37, 35.5], [40, 36]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".7" fill="#a0522d" opacity=".7"/>`).join('');
const necklace = () => [25, 28.5, 32, 35.5, 39].map((x, i) => `<circle cx="${x}" cy="${48 + (i === 0 || i === 4 ? 0 : i === 2 ? 2 : 1.3)}" r="1.3" fill="#fff" stroke="#bbb" stroke-width=".4"/>`).join('');
const bowTie = () => path('M27 48L32 50.5L37 48L37 54L32 51.5L27 54Z', '#2a2a2a');
const headband = (c = '#c2185b') => `<path d="M19 22Q32 12 45 22" stroke="${c}" stroke-width="2.6" fill="none"/>`;
const flower = () => `<circle cx="42" cy="17" r="2.6" fill="#e05a7a"/><circle cx="42" cy="17" r="1" fill="#ffd54f"/>`;
const lips = () => path('M28.5 38.2Q32 36.6 35.5 38.2Q32 41 28.5 38.2Z', '#c0392b');

const FEMALE: Character[] = [
  { skin: SKIN.light, hair: HAIR.brown, back: longBack, front: sweptFringe, extras: [earrings()] },
  { skin: SKIN.fair, hair: HAIR.black, back: bobBack, front: bangs, extras: [glasses()] },
  { skin: SKIN.light, hair: HAIR.blonde, back: bunBack, front: slick, extras: [lips(), earrings('#fff')] },
  { skin: SKIN.dark, hair: HAIR.black, back: afroBack, front: () => '', extras: [hoops()] },
  { skin: SKIN.light, hair: HAIR.red, back: ponytailBack, front: sweptFringe, extras: ['FRECKLES'] },
  { skin: SKIN.fair, hair: HAIR.white, front: pixie, extras: [roundGlasses(), 'NECKLACE'] },
  { skin: SKIN.tan, hair: HAIR.dark, back: wavyBack, front: sweptFringe, extras: [headband(), lips()] },
  { skin: SKIN.brown, hair: HAIR.black, back: braidsBack, front: bangs, extras: [flower()] },
];

const MALE: Character[] = [
  { skin: SKIN.light, hair: HAIR.brown, front: shortTop, extras: ['MUSTACHE'] },
  { skin: SKIN.fair, hair: HAIR.grey, front: sideTufts, extras: ['BEARD'] },
  { skin: SKIN.light, hair: HAIR.blonde, front: sidePart, extras: [glasses()] },
  { skin: SKIN.dark, hair: HAIR.black, front: curlsTop, extras: [] },
  { skin: SKIN.tan, hair: HAIR.dark, front: buzz, extras: ['STUBBLE'] },
  { skin: SKIN.fair, hair: HAIR.black, front: slick, extras: ['THIN_MUSTACHE', bowTie()] },
  { skin: SKIN.light, hair: HAIR.auburn, front: spiky, extras: ['FRECKLES'] },
  { skin: SKIN.fair, hair: HAIR.white, front: thinTop, extras: [roundGlasses(), 'MUSTACHE'] },
];

/** Accessories that depend on the character's hair colour are resolved here. */
function extra(token: string, hair: string): string {
  switch (token) {
    case 'MUSTACHE': return mustache(hair);
    case 'THIN_MUSTACHE': return thinMustache(hair);
    case 'BEARD': return beard(hair);
    case 'STUBBLE': return beard(hair, 0.35);
    case 'FRECKLES': return freckles();
    case 'NECKLACE': return necklace();
    default: return token;
  }
}

export const AVATAR_COUNT: Record<Gender, number> = { f: FEMALE.length, m: MALE.length };

export function avatarSvg(gender: Gender, variant: number, shirt: string): string {
  const list = gender === 'f' ? FEMALE : MALE;
  const c = list[variant % list.length]!;
  const isF = gender === 'f';
  const brow = isF ? 1 : 1.8;
  const face = [
    `<rect x="28" y="38" width="8" height="10" fill="${c.skin}"/>`,
    path('M8 64C8 52 18 46 32 46C46 46 56 52 56 64Z', shirt),
    path('M27 46L32 52L37 46Z', c.skin),
    c.back?.(c.hair) ?? '',
    `<ellipse cx="19.5" cy="31" rx="2.5" ry="3.5" fill="${c.skin}"/><ellipse cx="44.5" cy="31" rx="2.5" ry="3.5" fill="${c.skin}"/>`,
    `<ellipse cx="32" cy="30" rx="12.5" ry="15" fill="${c.skin}"/>`,
    c.front(c.hair),
    `<circle cx="27" cy="30" r="1.6" fill="#222"/><circle cx="37" cy="30" r="1.6" fill="#222"/>`,
    `<path d="M24.5 25.6Q27 24.4 29.5 25.6M34.5 25.6Q37 24.4 39.5 25.6" stroke="#3a2a20" stroke-width="${brow}" fill="none" stroke-linecap="round"/>`,
    isF ? '<path d="M24.6 28.6L23.6 27.8M39.4 28.6L40.4 27.8" stroke="#222" stroke-width=".9"/>' : '',
    `<path d="M29 38.3Q32 40.6 35 38.3" stroke="#7a3b2e" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
    `<circle cx="24" cy="35" r="2" fill="#e88" opacity="${isF ? 0.35 : 0.15}"/><circle cx="40" cy="35" r="2" fill="#e88" opacity="${isF ? 0.35 : 0.15}"/>`,
    ...(c.extras ?? []).map((t) => extra(t, c.hair)),
  ];
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${face.join('')}</svg>`;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Avatar variant per person: deterministic for a given cast and distinct within each gender
 * (8 variants per gender ≥ the 9 people of the biggest board split by gender, except an
 * all-one-gender 9-person cast, where variants wrap around).
 */
export function assignAvatars(people: readonly Person[]): Map<PersonId, number> {
  const out = new Map<PersonId, number>();
  for (const gender of ['f', 'm'] as const) {
    const group = people.filter((p) => p.gender === gender);
    const n = AVATAR_COUNT[gender];
    const used = new Set<number>();
    for (const p of group) {
      let v = hash(p.name) % n;
      while (used.has(v) && used.size < n) v = (v + 1) % n;
      used.add(v);
      out.set(p.id, v);
    }
  }
  return out;
}
