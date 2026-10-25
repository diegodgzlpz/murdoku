import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

const importsOf = (file: string) =>
  [...readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g)].map((m) => m[1] ?? m[2]!);

describe('layering', () => {
  it('core/ never imports ui/, cli/ or DOM-only modules', () => {
    for (const f of files(join(ROOT, 'src/core'))) {
      for (const imp of importsOf(f)) {
        expect(imp, relative(ROOT, f)).not.toMatch(/(^|\/)(ui|cli)(\/|$)/);
        // Only relative imports: no node:* and no npm packages, so core runs anywhere.
        expect(imp.startsWith('.'), `${relative(ROOT, f)} imports ${imp}`).toBe(true);
      }
      const src = readFileSync(f, 'utf8');
      expect(src, relative(ROOT, f)).not.toMatch(/\b(document|window\.|HTMLElement)\b/);
    }
  });

  it('ui/ and cli/ only use the public core API (core/index)', () => {
    for (const dir of ['src/ui', 'src/cli'])
      for (const f of files(join(ROOT, dir)))
        for (const imp of importsOf(f).filter((i) => i.includes('core')))
          expect(imp, relative(ROOT, f)).toBe('../core/index');
  });
});
