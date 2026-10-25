import { FURNITURE, type CellIndex, type FurnitureType } from '../../core/index';
import { ICONS, type IconEntry, type IconImage } from './manifest.generated';

/** Resolved image URLs for one icon (128 px and 64 px). */
export interface IconUrls {
  src: string;
  src64: string;
}

const entries: Readonly<Record<string, IconEntry>> = ICONS;
const resolveUrls = (img: IconImage): IconUrls => ({
  src: import.meta.env.BASE_URL + img.src,
  src64: import.meta.env.BASE_URL + img.src64,
});

/** Furniture types the level generator can place that have no icon (shown with the provisional glyph). */
export function missingFurnitureIcons(): FurnitureType[] {
  return (Object.keys(FURNITURE) as FurnitureType[]).filter((t) => entries[t]?.kind !== 'furniture');
}

const warned = new Set<FurnitureType>();
function warnMissing(type: FurnitureType): void {
  if (!import.meta.env.DEV || warned.has(type)) return;
  if (warned.size === 0)
    console.warn(`[icons] Muebles sin icono (se usa el emoji provisional): ${missingFurnitureIcons().join(', ')}`);
  warned.add(type);
}

/**
 * Icon for a furniture piece, or null (with a dev-only warning) when the type has none.
 * Variants are picked per cell, so a board looks varied but renders the same every time.
 */
export function furnitureIcon(type: FurnitureType, cell: CellIndex): IconUrls | null {
  const entry = entries[type];
  if (entry?.kind !== 'furniture') {
    warnMissing(type);
    return null;
  }
  const options: readonly IconImage[] = [entry, ...(entry.variants ?? [])];
  return resolveUrls(options[(cell * 2654435761) % 2 ** 32 % options.length]!);
}

export function personIcon(isVictim: boolean): IconUrls {
  return resolveUrls(isVictim ? ICONS.victim : ICONS.person);
}

export const windowIcon = (): IconUrls => resolveUrls(ICONS.window);
export const markIcon = (): IconUrls => resolveUrls(ICONS.mark);
export const magnifierIcon = (): IconUrls => resolveUrls(ICONS.magnifier);

/** `<img>` attributes: the 64 px file for small cells, 128 px on dense screens or big cells. */
export function imgAttrs(urls: IconUrls, cssClass: string): string {
  return `class="${cssClass}" src="${urls.src64}" srcset="${urls.src64} 64w, ${urls.src} 128w" sizes="(max-width: 600px) 40px, 64px" alt="" draggable="false"`;
}
