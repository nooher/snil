// examples.test.ts — golden tests for every program in examples/*.snil.
// Two guarantees:
//   1. EVERY example executes cleanly through run() (error === null).
//   2. Every example that has an entry in examples/EXPECTED.md produces EXACTLY
//      the listed output.
// This keeps the teaching corpus honest: a learner can copy any example and trust it.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { run } from './index';

const EXAMPLES_DIR = join(__dirname, '..', '..', 'examples');

/** Every *.snil file under examples/, sorted for stable test order. */
function exampleFiles(): string[] {
  return readdirSync(EXAMPLES_DIR)
    .filter((f) => f.endsWith('.snil'))
    .sort();
}

/**
 * Parse EXPECTED.md into { "habari.snil": "Habari Dunia", ... }.
 * Format: a "## <file>.snil" heading followed by a ```-fenced output block.
 */
function parseExpected(): Record<string, string> {
  const md = readFileSync(join(EXAMPLES_DIR, 'EXPECTED.md'), 'utf8');
  const out: Record<string, string> = {};
  // Match: ## name.snil  \n  ```\n <body> \n```
  const re = /^##\s+(\S+\.snil)\s*\n```\n([\s\S]*?)\n```/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    out[m[1]] = m[2];
  }
  return out;
}

describe('examples corpus', () => {
  const files = exampleFiles();
  const expected = parseExpected();

  it('finds example files', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} executes cleanly`, () => {
      const src = readFileSync(join(EXAMPLES_DIR, file), 'utf8');
      const result = run(src);
      expect(result.error, result.error?.message).toBeNull();
    });
  }

  for (const file of files) {
    if (!(file in expected)) continue;
    it(`${file} matches expected output`, () => {
      const src = readFileSync(join(EXAMPLES_DIR, file), 'utf8');
      const result = run(src);
      expect(result.error).toBeNull();
      expect(result.output).toBe(expected[file]);
    });
  }

  it('every example has a golden entry in EXPECTED.md', () => {
    const missing = files.filter((f) => !(f in expected));
    expect(missing, `missing EXPECTED.md entries: ${missing.join(', ')}`).toEqual([]);
  });
});
