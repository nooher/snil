// format.test.ts — the SNIL formatter (nadhifu). We assert exact tidy output on
// messy input, idempotency on every example, semantic preservation on the
// deterministic golden programs, and that comments + strings survive verbatim.
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatSnil } from './format';
import { run } from './index';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXAMPLES = path.join(ROOT, 'examples');

const readExample = (name: string) => fs.readFileSync(path.join(EXAMPLES, name), 'utf-8');
const exampleFiles = fs
  .readdirSync(EXAMPLES)
  .filter((f) => f.endsWith('.snil'))
  .sort();

const DETERMINISTIC = [
  'habari',
  'hesabu',
  'duka',
  'fizzbuzz',
  'wastani',
  'pembetatu',
  'kikokotoo',
];

describe('formatSnil — re-indentation', () => {
  it('indents a nested ikiwa + kazi + kwa kila to 4 spaces per level', () => {
    const messy = [
      'kazi salamu(jina)',
      'rudisha "Habari " + jina',
      'mwisho',
      'kwa kila n kutoka 1 hadi 3',
      'ikiwa n > 1 basi',
      'onyesha n',
      'vinginevyo',
      'onyesha "moja"',
      'mwisho',
      'mwisho',
    ].join('\n');
    const expected = [
      'kazi salamu(jina)',
      '    rudisha "Habari " + jina',
      'mwisho',
      'kwa kila n kutoka 1 hadi 3',
      '    ikiwa n > 1 basi',
      '        onyesha n',
      '    vinginevyo',
      '        onyesha "moja"',
      '    mwisho',
      'mwisho',
      '',
    ].join('\n');
    expect(formatSnil(messy)).toBe(expected);
  });

  it('re-indents an over-indented program back to canonical form', () => {
    const messy = [
      '        weka a kuwa 10',
      '   ikiwa a > 5 basi',
      '                onyesha "kubwa"',
      '   mwisho',
    ].join('\n');
    const expected = [
      'weka a kuwa 10',
      'ikiwa a > 5 basi',
      '    onyesha "kubwa"',
      'mwisho',
      '',
    ].join('\n');
    expect(formatSnil(messy)).toBe(expected);
  });

  it('keeps a vinginevyo ikiwa (else-if) ladder flat — one line, one mwisho', () => {
    const messy = [
      'ikiwa a basi',
      'onyesha 1',
      'vinginevyo ikiwa b basi',
      'onyesha 2',
      'vinginevyo ikiwa c basi',
      'onyesha 3',
      'vinginevyo',
      'onyesha 4',
      'mwisho',
    ].join('\n');
    const expected = [
      'ikiwa a basi',
      '    onyesha 1',
      'vinginevyo ikiwa b basi',
      '    onyesha 2',
      'vinginevyo ikiwa c basi',
      '    onyesha 3',
      'vinginevyo',
      '    onyesha 4',
      'mwisho',
      '',
    ].join('\n');
    expect(formatSnil(messy)).toBe(expected);
  });

  it('handles jaribu / kosa blocks', () => {
    const messy = ['jaribu', 'onyesha 1', 'kosa', 'onyesha 2', 'mwisho'].join('\n');
    const expected = ['jaribu', '    onyesha 1', 'kosa', '    onyesha 2', 'mwisho', ''].join('\n');
    expect(formatSnil(messy)).toBe(expected);
  });
});

describe('formatSnil — spacing normalization', () => {
  it('puts single spaces around binary operators and after commas', () => {
    expect(formatSnil('weka a kuwa 1+2*3')).toBe('weka a kuwa 1 + 2 * 3\n');
    expect(formatSnil('onyesha f(1,2,3)')).toBe('onyesha f(1, 2, 3)\n');
    expect(formatSnil('ikiwa a==b basi\nonyesha 1\nmwisho')).toBe(
      'ikiwa a == b basi\n    onyesha 1\nmwisho\n',
    );
  });

  it('removes spaces just inside ( [ { and around member dots', () => {
    expect(formatSnil('onyesha ( a + b )')).toBe('onyesha (a + b)\n');
    expect(formatSnil('onyesha mteja . jina')).toBe('onyesha mteja.jina\n');
    expect(formatSnil('onyesha bei[ 0 ]')).toBe('onyesha bei[0]\n');
  });
});

describe('formatSnil — whitespace hygiene', () => {
  it('trims trailing spaces, collapses blank lines, one trailing newline', () => {
    const messy = '\n\nonyesha 1   \n\n\n\nonyesha 2\n\n\n';
    expect(formatSnil(messy)).toBe('onyesha 1\n\nonyesha 2\n');
  });
});

describe('formatSnil — comments and strings preserved verbatim', () => {
  it('leaves #, ### ### and string contents untouched', () => {
    const src = [
      '# si maoni: kweli',
      '### block',
      'ikiwa  ndani  ya  block',
      '### ',
      'onyesha "  ikiwa  basi # not a comment"',
    ].join('\n');
    const out = formatSnil(src);
    expect(out).toContain('# si maoni: kweli');
    expect(out).toContain('### block');
    expect(out).toContain('ikiwa  ndani  ya  block');
    expect(out).toContain('"  ikiwa  basi # not a comment"');
    // The string interior must not be reflowed (double spaces survive).
    expect(out).toContain('  ikiwa  basi');
  });

  it('does not indent based on keywords that live inside a string', () => {
    const src = 'onyesha "kwa kila basi jaribu"\nonyesha 2';
    expect(formatSnil(src)).toBe('onyesha "kwa kila basi jaribu"\nonyesha 2\n');
  });
});

describe('formatSnil — idempotency on every example', () => {
  for (const f of exampleFiles) {
    it(`format(format(${f})) === format(${f})`, () => {
      const once = formatSnil(readExample(f));
      const twice = formatSnil(once);
      expect(twice).toBe(once);
    });
  }
});

describe('formatSnil — semantics preserved on deterministic examples', () => {
  for (const name of DETERMINISTIC) {
    it(`run(formatSnil(${name})) === run(${name})`, () => {
      const src = readExample(`${name}.snil`);
      const original = run(src);
      const formatted = run(formatSnil(src));
      expect(formatted.error).toBeNull();
      expect(original.error).toBeNull();
      expect(formatted.output).toBe(original.output);
    });
  }
});
