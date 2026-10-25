/**
 * Imports AI-generated icon sheets (icons on a magenta background) into web-ready assets.
 *
 *   npm run icons:import [-- --inner 70 --outer 170]
 *
 * For every assets-src/icons/<sheet>.json manifest:
 *  1. keys out the magenta background (graded alpha between two "magenta score" thresholds),
 *  2. despills the pink halo on semi-transparent edge pixels,
 *  3. finds icons by connected components (fragments of one icon are grouped by the grid cell
 *     their centre falls in — the grid is only used for grouping, never for cropping),
 *  4. fails unless every grid cell yields exactly one icon,
 *  5. crops, centres on a transparent square with a uniform margin, writes public/icons/<id>.webp
 *     (128 px) and <id>@64.webp,
 * then writes src/ui/icons/manifest.generated.ts and public/icons-preview.html.
 * Idempotent: output is wiped and rewritten in a stable order. Sources are never modified.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

type Kind = 'furniture' | 'person' | 'victim' | 'window' | 'ui';

interface IconSpec {
  pos: [number, number];
  id?: string;
  kind?: Kind;
  occupiable?: boolean;
  variantOf?: string;
  skip?: boolean;
}

interface SheetManifest {
  sheet: string;
  grid: { cols: number; rows: number };
  tolerance?: { inner: number; outer: number };
  icons: IconSpec[];
}

const ROOT = resolve(import.meta.dirname, '../..');
const SRC_DIR = join(ROOT, 'assets-src/icons');
const OUT_DIR = join(ROOT, 'public/icons');
const MANIFEST_TS = join(ROOT, 'src/ui/icons/manifest.generated.ts');
const PREVIEW = join(ROOT, 'public/icons-preview.html');
const SIZES = [128, 64] as const;
/** Margin around the icon, as a fraction of the square side. */
const MARGIN = 0.06;
/** Components smaller than this fraction of the sheet area are noise. */
const MIN_AREA = 0.0004;
/** Alpha (0–255) above which a pixel counts as part of a component. */
const SOLID = 96;

class ImportError extends Error {}

function cliTolerance(): { inner?: number; outer?: number } {
  const args = process.argv.slice(2);
  const get = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? Number(args[i + 1]) : undefined;
  };
  return { inner: get('inner'), outer: get('outer') };
}

/** How magenta a pixel is: high red and blue, low green. Background ≈ 200+, icons ≲ 60. */
const magentaScore = (r: number, g: number, b: number) => Math.min(r, b) - g;

/** Steps 1–2: graded key + despill, in place on an RGBA buffer. */
function keyOut(px: Buffer, inner: number, outer: number): void {
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]!, g = px[i + 1]!, b = px[i + 2]!;
    const s = magentaScore(r, g, b);
    const alpha = s <= inner ? 1 : s >= outer ? 0 : (outer - s) / (outer - inner);
    px[i + 3] = Math.round(alpha * 255);
    if (alpha === 0) {
      px[i] = px[i + 1] = px[i + 2] = 0;
    } else if (alpha < 1) {
      // Despill: remove the magenta excess so edges don't glow pink on any background.
      const m = Math.max(0, s);
      px[i] = r - m;
      px[i + 2] = b - m;
    }
  }
}

interface Component {
  label: number;
  area: number;
  x0: number; y0: number; x1: number; y1: number;
  cx: number; cy: number;
}

/** Step 3a: 8-connected components over solid pixels. */
function components(px: Buffer, w: number, h: number): { labels: Int32Array; comps: Component[] } {
  const labels = new Int32Array(w * h);
  const comps: Component[] = [];
  const stack: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (labels[start] !== 0 || px[start * 4 + 3]! < SOLID) continue;
    const label = comps.length + 1;
    const c: Component = { label, area: 0, x0: w, y0: h, x1: -1, y1: -1, cx: 0, cy: 0 };
    labels[start] = label;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w, y = (p - x) / w;
      c.area++;
      c.cx += x;
      c.cy += y;
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y;
      if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (labels[q] === 0 && px[q * 4 + 3]! >= SOLID) {
            labels[q] = label;
            stack.push(q);
          }
        }
    }
    c.cx /= c.area;
    c.cy /= c.area;
    comps.push(c);
  }
  return { labels, comps };
}

interface Found {
  row: number;
  col: number;
  parts: Component[];
  x0: number; y0: number; x1: number; y1: number;
}

/** Step 3b–4: group fragments by the approximate cell of their centre; validate the count. */
function findIcons(name: string, comps: Component[], w: number, h: number, grid: SheetManifest['grid']): Found[] {
  const big = comps.filter((c) => c.area >= MIN_AREA * w * h);
  const cells = new Map<string, Found>();
  for (const c of big) {
    const col = Math.min(grid.cols - 1, Math.floor((c.cx / w) * grid.cols));
    const row = Math.min(grid.rows - 1, Math.floor((c.cy / h) * grid.rows));
    const key = `${row},${col}`;
    const f = cells.get(key) ?? { row, col, parts: [], x0: w, y0: h, x1: -1, y1: -1 };
    f.parts.push(c);
    f.x0 = Math.min(f.x0, c.x0);
    f.y0 = Math.min(f.y0, c.y0);
    f.x1 = Math.max(f.x1, c.x1);
    f.y1 = Math.max(f.y1, c.y1);
    cells.set(key, f);
  }
  const expected = grid.cols * grid.rows;
  if (cells.size !== expected) {
    const empty: string[] = [];
    for (let r = 0; r < grid.rows; r++)
      for (let c = 0; c < grid.cols; c++) if (!cells.has(`${r},${c}`)) empty.push(`[${r}, ${c}]`);
    throw new ImportError(
      `Hoja "${name}": se esperaban ${expected} iconos (${grid.cols}×${grid.rows}) y se encontraron ${cells.size}` +
        (empty.length ? `; celdas vacías: ${empty.join(' ')}` : '') +
        `. Ajusta la tolerancia (--inner/--outer) o la rejilla del manifiesto.`,
    );
  }
  return [...cells.values()].sort((a, b) => a.row - b.row || a.col - b.col);
}

/** Step 5: crop one icon (dropping pixels of other components), centre it on a square. */
async function exportIcon(px: Buffer, labels: Int32Array, w: number, icon: Found, id: string): Promise<void> {
  const own = new Set(icon.parts.map((p) => p.label));
  const bw = icon.x1 - icon.x0 + 1, bh = icon.y1 - icon.y0 + 1;
  const side = Math.ceil(Math.max(bw, bh) / (1 - 2 * MARGIN));
  const ox = Math.floor((side - bw) / 2), oy = Math.floor((side - bh) / 2);
  const canvas = Buffer.alloc(side * side * 4);
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const p = (icon.y0 + y) * w + (icon.x0 + x);
      const label = labels[p]!;
      // Keep this icon's parts and soft edge pixels; drop solid pixels of anything else.
      if (label !== 0 && !own.has(label)) continue;
      px.copy(canvas, ((oy + y) * side + ox + x) * 4, p * 4, p * 4 + 4);
    }
  for (const size of SIZES) {
    const file = join(OUT_DIR, size === 128 ? `${id}.webp` : `${id}@${size}.webp`);
    await sharp(canvas, { raw: { width: side, height: side, channels: 4 } })
      .resize(size, size, { kernel: 'lanczos3' })
      .webp({ quality: 90, alphaQuality: 100, effort: 6 })
      .toFile(file);
  }
}

interface Entry {
  id: string;
  kind: Kind;
  occupiable?: boolean;
  variantOf?: string;
  sheet: string;
  pos: [number, number];
}

function validateSpecs(m: SheetManifest, name: string): void {
  const seen = new Set<string>();
  for (const s of m.icons) {
    const key = s.pos.join(',');
    if (seen.has(key)) throw new ImportError(`Hoja "${name}": posición [${key}] repetida en el manifiesto.`);
    seen.add(key);
    if (s.skip) continue;
    if (!s.id || !s.kind) throw new ImportError(`Hoja "${name}": el icono en [${key}] necesita "id" y "kind".`);
    if (s.kind === 'furniture' && s.occupiable === undefined && !s.variantOf)
      throw new ImportError(`Hoja "${name}": el mueble "${s.id}" necesita "occupiable" o "variantOf".`);
  }
  if (seen.size !== m.grid.cols * m.grid.rows)
    throw new ImportError(`Hoja "${name}": el manifiesto describe ${seen.size} posiciones y la rejilla tiene ${m.grid.cols * m.grid.rows}.`);
}

function writeManifest(entries: Entry[]): void {
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const e of entries)
    if (e.variantOf && byId.get(e.variantOf)?.kind !== 'furniture')
      throw new ImportError(`La variante "${e.id}" apunta a "${e.variantOf}", que no es un mueble definido.`);
  const bases = entries.filter((e) => !e.variantOf).sort((a, b) => a.id.localeCompare(b.id));
  const lines = bases.map((e) => {
    const variants = entries.filter((v) => v.variantOf === e.id).sort((a, b) => a.id.localeCompare(b.id));
    const fields = [
      `kind: '${e.kind}'`,
      ...(e.kind === 'furniture' ? [`occupiable: ${e.occupiable}`] : []),
      `src: 'icons/${e.id}.webp'`,
      `src64: 'icons/${e.id}@64.webp'`,
      ...(e.kind === 'furniture' ? [`variants: [${variants.map((v) => `{ src: 'icons/${v.id}.webp', src64: 'icons/${v.id}@64.webp' }`).join(', ')}]`] : []),
    ];
    return `  ${/^[a-z][a-zA-Z0-9]*$/.test(e.id) ? e.id : `'${e.id}'`}: { ${fields.join(', ')} },`;
  });
  const ts = `// AUTO-GENERATED by \`npm run icons:import\` from assets-src/icons/*.json. Do not edit.
export type IconKind = 'furniture' | 'person' | 'victim' | 'window' | 'ui';

export interface IconImage {
  /** Paths relative to the site base (resolve with import.meta.env.BASE_URL). */
  src: string;
  src64: string;
}

export interface IconEntry extends IconImage {
  kind: IconKind;
  occupiable?: boolean;
  variants?: readonly IconImage[];
}

export const ICONS = {
${lines.join('\n')}
} as const satisfies Record<string, IconEntry>;

export type IconId = keyof typeof ICONS;
`;
  mkdirSync(join(ROOT, 'src/ui/icons'), { recursive: true });
  writeFileSync(MANIFEST_TS, ts);
}

function writePreview(entries: Entry[]): void {
  const tiles = [...entries]
    .sort((a, b) => a.sheet.localeCompare(b.sheet) || a.pos[0] - b.pos[0] || a.pos[1] - b.pos[1])
    .map(
      (e) => `<figure><div class="pair"><span class="light"><img src="icons/${e.id}.webp" alt=""></span><span class="dark"><img src="icons/${e.id}.webp" alt=""></span><span class="small light"><img src="icons/${e.id}@64.webp" width="32" height="32" alt=""></span><span class="small dark"><img src="icons/${e.id}@64.webp" width="32" height="32" alt=""></span></div><figcaption><b>${e.id}</b><br>${e.sheet} [${e.pos.join(', ')}] · ${e.kind}${e.occupiable ? ' · ocupable' : ''}${e.variantOf ? ` · variante de ${e.variantOf}` : ''}</figcaption></figure>`,
    )
    .join('\n');
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Iconos Murdoku</title>
<style>
  body { font: 14px/1.4 system-ui, sans-serif; margin: 16px; background: #f4f1ea; color: #222; }
  main { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
  figure { margin: 0; background: #fff; border-radius: 10px; padding: 10px; box-shadow: 0 1px 3px #0002; }
  .pair { display: flex; gap: 6px; align-items: center; }
  .pair span { display: grid; place-items: center; border-radius: 6px; }
  .light { background: #fdfbf5; } .dark { background: #22252b; }
  .pair span:not(.small) { width: 96px; height: 96px; } .pair img { width: 80px; height: 80px; }
  .small { width: 40px; height: 40px; } .small img { width: 32px; height: 32px; }
  figcaption { margin-top: 6px; color: #555; } figcaption b { color: #222; }
</style>
</head>
<body>
<h1>Iconos importados (${entries.length})</h1>
<p>Cada icono a 80 px y a 32 px (tamaño de casilla en móvil), sobre fondo claro y oscuro.</p>
<main>
${tiles}
</main>
</body>
</html>
`;
  writeFileSync(PREVIEW, html);
}

async function main(): Promise<void> {
  const cli = cliTolerance();
  const sheets = readdirSync(SRC_DIR).filter((f) => f.endsWith('.json')).sort();
  if (!sheets.length) throw new ImportError(`No hay manifiestos en ${SRC_DIR}`);
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const entries: Entry[] = [];
  const owner = new Map<string, string>();
  for (const file of sheets) {
    const name = file.replace(/\.json$/, '');
    const m = JSON.parse(readFileSync(join(SRC_DIR, file), 'utf8')) as SheetManifest;
    validateSpecs(m, name);
    for (const s of m.icons) {
      if (s.skip) continue;
      const prev = owner.get(s.id!);
      if (prev) throw new ImportError(`El id "${s.id}" está definido en "${prev}" y en "${name}".`);
      owner.set(s.id!, name);
    }

    const inner = cli.inner ?? m.tolerance?.inner ?? 70;
    const outer = cli.outer ?? m.tolerance?.outer ?? 170;
    const { data, info } = await sharp(join(SRC_DIR, m.sheet)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const px = Buffer.from(data);
    keyOut(px, inner, outer);
    const { labels, comps } = components(px, info.width, info.height);
    const found = findIcons(name, comps, info.width, info.height, m.grid);

    for (const icon of found) {
      const spec = m.icons.find((s) => s.pos[0] === icon.row && s.pos[1] === icon.col)!;
      if (spec.skip) continue;
      await exportIcon(px, labels, info.width, icon, spec.id!);
      entries.push({
        id: spec.id!,
        kind: spec.kind!,
        occupiable: spec.occupiable,
        variantOf: spec.variantOf,
        sheet: name,
        pos: spec.pos,
      });
    }
    console.log(`✓ ${name}: ${found.length} iconos (${found.filter((f) => f.parts.length > 1).length} con varias piezas)`);
  }
  writeManifest(entries);
  writePreview(entries);
  console.log(`→ ${entries.length} iconos en public/icons, manifiesto en src/ui/icons/manifest.generated.ts`);
}

main().catch((err: unknown) => {
  console.error(err instanceof ImportError ? `✗ ${err.message}` : err);
  process.exit(1);
});
