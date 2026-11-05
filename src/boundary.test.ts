import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Walks the import graph of the package source: @hoard-engine/directors has
// no dependencies — only relative imports inside the package are allowed
// (test files may additionally import 'vitest' and node builtins).
const srcDir = join(__dirname);

const packageFiles = readdirSync(srcDir)
  .filter((file) => file.endsWith('.ts') && file !== 'boundary.test.ts')
  .map((file) => join(srcDir, file));

const importPattern =
  /(?:import|export)\s+(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

describe('package boundary', () => {
  it('covers at least the source modules', () => {
    expect(packageFiles.length).toBeGreaterThan(3);
  });

  it('only allows relative imports inside the package (tests may use vitest)', () => {
    const offenders: string[] = [];
    for (const file of packageFiles) {
      const isTest = file.endsWith('.test.ts');
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(importPattern)) {
        const specifier = match[1] ?? match[2];
        if (!specifier) continue;
        if (specifier.startsWith('.')) continue;
        if (isTest && specifier === 'vitest') continue;
        if (isTest && specifier.startsWith('node:')) continue;
        offenders.push(`${file}: ${specifier}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never references browser or window globals (dispatch is pure)', () => {
    const globals = /\b(localStorage|window|document)\b/;
    const offenders: string[] = [];
    for (const file of packageFiles) {
      if (file.endsWith('.test.ts')) continue;
      const source = readFileSync(file, 'utf8');
      if (globals.test(source)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
