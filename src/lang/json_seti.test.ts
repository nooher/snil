// json_seti.test.ts — unit tests + TRI-BACKEND parity for the `json` and `seti`
// standard-library modules. For each small SNIL program we assert, line by line:
//   interpreter run()  ===  Python (toPython → `python`)  ===  JS (toJS → `node`)
//   ===  a hand-written expected string.
// JSON serialization is COMPACT (no spaces) with insertion-order keys and SNIL
// number rules, so every backend must emit byte-identical strings.
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, toPython, toJS } from './index';

/** Normalize: strip trailing whitespace per line + at end. */
function norm(s: string): string {
  return s
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\s+$/, '');
}

function runExternal(code: string, ext: 'py' | 'mjs', bin: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'snil-js-'));
  const file = join(dir, `prog.${ext}`);
  try {
    writeFileSync(file, code, 'utf-8');
    return norm(execFileSync(bin, [file], { encoding: 'utf-8' }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const runPython = (src: string) => runExternal(toPython(src), 'py', 'python');
const runJS = (src: string) => runExternal(toJS(src), 'mjs', 'node');

/** interpreter === python === js === expected (all normalized). */
function parity(src: string, expected: string): void {
  const interp = run(src);
  expect(interp.error, interp.error?.message).toBeNull();
  const interpOut = norm(interp.output);
  const py = runPython(src);
  const js = runJS(src);
  expect(interpOut, 'interpreter vs python').toBe(py);
  expect(py, 'python vs js').toBe(js);
  expect(interpOut, 'interpreter vs expected').toBe(norm(expected));
}

describe('SNIL json — stringify/parse parity across all three backends', () => {
  it('tengeneza: primitives + ints without ".0"', () => {
    const src = [
      'leta json',
      'onyesha tengeneza(42)',
      'onyesha tengeneza(3.5)',
      'onyesha tengeneza("habari")',
      'onyesha tengeneza(kweli)',
      'onyesha tengeneza(si_kweli)',
      'onyesha tengeneza(tupu)',
    ].join('\n');
    parity(src, '42\n3.5\n"habari"\ntrue\nfalse\nnull');
  });

  it('tengeneza: compact object + array, insertion order', () => {
    const src = [
      'leta json',
      'onyesha tengeneza({ b: 1, a: 2, c: 3 })',
      'onyesha tengeneza([1, 2, 3])',
      'onyesha tengeneza({ jina: "Asha", umri: 20 })',
    ].join('\n');
    parity(src, '{"b":1,"a":2,"c":3}\n[1,2,3]\n{"jina":"Asha","umri":20}');
  });

  it('tengeneza: nested structures', () => {
    const src = [
      'leta json',
      'onyesha tengeneza({ orodha: [1, [2, 3]], ndani: { x: kweli } })',
    ].join('\n');
    parity(src, '{"orodha":[1,[2,3]],"ndani":{"x":true}}');
  });

  it('tengeneza: string escaping (quotes, backslash, newline, tab)', () => {
    const src = [
      'leta json',
      'onyesha tengeneza("ana \\"nukuu\\" na \\\\ na \\n mstari")',
    ].join('\n');
    // Expected JSON literal: "ana \"nukuu\" na \\ na \n mstari"
    parity(src, '"ana \\"nukuu\\" na \\\\ na \\n mstari"');
  });

  it('changanua: object + array + nested', () => {
    const src = [
      'leta json',
      'weka o kuwa changanua("[1,2,3]")',
      'onyesha o[0]',
      'onyesha o[2]',
      'weka d kuwa changanua(tengeneza({ a: 1, b: [10, 20] }))',
      'onyesha d.a',
      'onyesha d.b[1]',
    ].join('\n');
    parity(src, '1\n3\n1\n20');
  });

  it('round-trip: changanua(tengeneza(x)) == x', () => {
    const src = [
      'leta json',
      'weka x kuwa { jina: "Juma", alama: [90, 85, 70], hai: kweli, mzazi: tupu }',
      'onyesha changanua(tengeneza(x)) == x',
      'weka y kuwa [1, "mbili", [3, 4], { tano: 5 }]',
      'onyesha changanua(tengeneza(y)) == y',
    ].join('\n');
    parity(src, 'kweli\nkweli');
  });

  it('changanua: invalid JSON → Kiswahili error (caught)', () => {
    const src = [
      'leta json',
      'jaribu',
      '    weka bad kuwa changanua("{nope}")',
      '    onyesha "haikufika"',
      'kosa',
      '    onyesha "JSON isiyo sahihi"',
      'mwisho',
    ].join('\n');
    parity(src, 'JSON isiyo sahihi');
  });

  it('changanua: parsed number type (int vs float) round-trips cleanly', () => {
    const src = [
      'leta json',
      'onyesha tengeneza(changanua("10"))',
      'onyesha tengeneza(changanua("10.5"))',
    ].join('\n');
    parity(src, '10\n10.5');
  });
});

describe('SNIL seti — set operations parity across all three backends', () => {
  it('tengeneza: dedupe with first-occurrence order', () => {
    const src = [
      'leta seti',
      'onyesha tengeneza([3, 1, 3, 2, 1])',
      'onyesha tengeneza(["a", "b", "a", "c"])',
    ].join('\n');
    parity(src, '[3, 1, 2]\n[a, b, c]');
  });

  it('muungano / makutano / tofauti', () => {
    const src = [
      'leta seti',
      'weka a kuwa [1, 2, 3]',
      'weka b kuwa [2, 3, 4]',
      'onyesha muungano(a, b)',
      'onyesha makutano(a, b)',
      'onyesha tofauti(a, b)',
      'onyesha tofauti(b, a)',
    ].join('\n');
    parity(src, '[1, 2, 3, 4]\n[2, 3]\n[1]\n[4]');
  });

  it('ina / ukubwa with deep value-equality', () => {
    const src = [
      'leta seti',
      'weka s kuwa [[1, 2], [3, 4], [1, 2]]',
      'onyesha ina(s, [3, 4])',
      'onyesha ina(s, [9, 9])',
      'onyesha ukubwa(s)',
    ].join('\n');
    // [1,2] appears twice → distinct size is 2.
    parity(src, 'kweli\nsi_kweli\n2');
  });

  it('set ops on empty + mixed lists stay deterministic', () => {
    const src = [
      'leta seti',
      'onyesha muungano([], [1, 1, 2])',
      'onyesha makutano([1, 2, 3], [])',
      'onyesha ukubwa([])',
    ].join('\n');
    parity(src, '[1, 2]\n[]\n0');
  });
});
