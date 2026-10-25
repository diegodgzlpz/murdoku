import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FURNITURE } from '../src/core/scenarios/furniture';
import { SCENARIOS } from '../src/core/scenarios/catalog';
import type { FurnitureType } from '../src/core/model/types';
import { ICONS } from '../src/ui/icons/manifest.generated';

const SRC = resolve(__dirname, '../assets-src/icons');

interface Spec { id?: string; kind?: string; occupiable?: boolean; variantOf?: string; skip?: boolean }
const specs: Spec[] = readdirSync(SRC)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => (JSON.parse(readFileSync(join(SRC, f), 'utf8')) as { icons: Spec[] }).icons)
  .filter((s) => !s.skip);

describe('icon manifests vs core furniture catalog', () => {
  it('every furniture icon is a core furniture type with the same occupiable flag', () => {
    for (const s of specs.filter((x) => x.kind === 'furniture' && !x.variantOf)) {
      const def = FURNITURE[s.id as FurnitureType];
      expect(def, `icon "${s.id}" has no furniture type in core`).toBeDefined();
      expect(def.occupiable, `occupiable mismatch for "${s.id}"`).toBe(s.occupiable);
    }
  });

  it('variants point at a furniture icon', () => {
    const bases = new Set(specs.filter((s) => s.kind === 'furniture' && !s.variantOf).map((s) => s.id));
    for (const s of specs.filter((x) => x.variantOf)) expect(bases.has(s.variantOf), s.id).toBe(true);
  });

  it('generated manifest is in sync with the source manifests', () => {
    const bases = specs.filter((s) => !s.variantOf).map((s) => s.id).sort();
    expect(Object.keys(ICONS).sort()).toEqual(bases);
    for (const [id, e] of Object.entries(ICONS))
      if (e.kind === 'furniture') expect(e.occupiable, id).toBe(FURNITURE[id as FurnitureType].occupiable);
  });

  it('the game assets exist (person, victim, window, mark, magnifier)', () => {
    for (const id of ['person', 'victim', 'window', 'mark', 'magnifier']) expect(ICONS).toHaveProperty(id);
  });

  it('every furniture type the generator can place has an icon', () => {
    const used = new Set(SCENARIOS.flatMap((s) => s.rooms.flatMap((r) => r.furniture)));
    const missing = [...used].filter((t) => (ICONS as Record<string, { kind: string }>)[t]?.kind !== 'furniture').sort();
    expect(missing).toEqual([]);
  });
});
