import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The public surface is exactly src/index.ts: every export of every source
// module must be re-exported there, and nothing else may be exported from
// the package root.
const srcDir = join(__dirname);
const indexSource = readFileSync(join(srcDir, 'index.ts'), 'utf8');

const moduleFiles = readdirSync(srcDir).filter(
  (file) =>
    file.endsWith('.ts') && !file.endsWith('.test.ts') && file !== 'index.ts',
);

// Extracts exported names from a module: declarations and export lists.
const exportedNames = (source: string): string[] => {
  const names: string[] = [];
  const declaration =
    /\bexport\s+(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of source.matchAll(declaration)) {
    names.push(match[1]);
  }
  const list = /\bexport\s*\{([^}]+)\}/g;
  for (const match of source.matchAll(list)) {
    for (const entry of match[1].split(',')) {
      const name = entry
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name) names.push(name);
    }
  }
  return names;
};

describe('public surface completeness', () => {
  it('re-exports every module export from index.ts', () => {
    const missing: string[] = [];
    for (const file of moduleFiles) {
      const source = readFileSync(join(srcDir, file), 'utf8');
      for (const name of exportedNames(source)) {
        if (!indexSource.includes(name)) {
          missing.push(`${file}: ${name}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
