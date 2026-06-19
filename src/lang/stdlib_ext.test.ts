// stdlib_ext.test.ts — TRI-BACKEND parity for the EXTENDED standard library
// (the breadth additions: maandishi anza_na/isha_na/pata/rudia/kata,
// orodha chukua/fahirisi/unganisha_mbili/kichwa/mkia, hisabati
// kipeo_cha_pili/salio/mviringo).
//
// For each small SNIL program we assert, line by line:
//   interpreter run()  ===  Python (toPython → `python`)  ===  JS (toJS → `node`)
//   ===  a hand-written expected string.
// The whole point of SNIL having three backends is identical behaviour + display;
// if any backend drifts on the new functions, these tests catch it.
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

/** Compile to `code`, write a temp file, run through `bin`, clean up. */
function runExternal(code: string, ext: 'py' | 'mjs', bin: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'snil-ext-'));
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

describe('SNIL stdlib_ext — extended stdlib parity across all three backends', () => {
  it('maandishi: anza_na / isha_na', () => {
    const src = [
      'leta maandishi',
      'onyesha anza_na("Habari Dunia", "Habari")',
      'onyesha anza_na("Habari Dunia", "Dunia")',
      'onyesha isha_na("Habari Dunia", "Dunia")',
      'onyesha isha_na("Habari Dunia", "Habari")',
    ].join('\n');
    parity(src, 'kweli\nsi_kweli\nkweli\nsi_kweli');
  });

  it('maandishi: pata (index, -1 if absent)', () => {
    const src = [
      'leta maandishi',
      'onyesha pata("Habari", "b")',
      'onyesha pata("Habari", "ri")',
      'onyesha pata("Habari", "z")',
    ].join('\n');
    parity(src, '2\n4\n-1');
  });

  it('maandishi: rudia (repeat, 0 → empty)', () => {
    const src = [
      'leta maandishi',
      'onyesha rudia("ab", 3)',
      'onyesha rudia("x", 0)',
      'onyesha rudia("-", 5)',
    ].join('\n');
    parity(src, 'ababab\n\n-----');
  });

  it('maandishi: kata (substring, clamps + empty when anza>=mwisho)', () => {
    const src = [
      'leta maandishi',
      'onyesha kata("Habari", 0, 3)',
      'onyesha kata("Habari", 2, 100)',
      'onyesha kata("Habari", 4, 2)',
      'onyesha kata("Habari", 0, 0)',
    ].join('\n');
    parity(src, 'Hab\nbari\n\n');
  });

  it('orodha: chukua (slice copy, original untouched)', () => {
    const src = [
      'leta orodha',
      'weka xs kuwa [1, 2, 3, 4, 5]',
      'onyesha chukua(xs, 1, 4)',
      'onyesha chukua(xs, 3, 100)',
      'onyesha chukua(xs, 4, 1)',
      'onyesha xs',
    ].join('\n');
    parity(src, '[2, 3, 4]\n[4, 5]\n[]\n[1, 2, 3, 4, 5]');
  });

  it('orodha: fahirisi (index, deep-equality, -1 if absent)', () => {
    const src = [
      'leta orodha',
      'onyesha fahirisi(["a", "b", "c"], "b")',
      'onyesha fahirisi([10, 20, 30], 99)',
      'onyesha fahirisi([[1, 2], [3, 4]], [3, 4])',
    ].join('\n');
    parity(src, '1\n-1\n1');
  });

  it('orodha: unganisha_mbili (new list, originals untouched)', () => {
    const src = [
      'leta orodha',
      'weka a kuwa [1, 2]',
      'weka b kuwa [3, 4]',
      'onyesha unganisha_mbili(a, b)',
      'onyesha a',
      'onyesha b',
    ].join('\n');
    parity(src, '[1, 2, 3, 4]\n[1, 2]\n[3, 4]');
  });

  it('orodha: kichwa / mkia', () => {
    const src = [
      'leta orodha',
      'weka xs kuwa [7, 8, 9]',
      'onyesha kichwa(xs)',
      'onyesha mkia(xs)',
      'onyesha xs',
    ].join('\n');
    parity(src, '7\n[8, 9]\n[7, 8, 9]');
  });

  it('hisabati: kipeo_cha_pili / salio', () => {
    const src = [
      'leta hisabati',
      'onyesha kipeo_cha_pili(6)',
      'onyesha kipeo_cha_pili(2.5)',
      'onyesha salio(17, 5)',
      'onyesha salio(-7, 3)',
    ].join('\n');
    // salio follows JS-style truncated remainder: -7 % 3 = -1 (sign of dividend).
    parity(src, '36\n6.25\n2\n-1');
  });

  it('hisabati: mviringo (round to dp, half away from zero)', () => {
    const src = [
      'leta hisabati',
      'onyesha mviringo(3.14159, 2)',
      'onyesha mviringo(2.5, 0)',
      'onyesha mviringo(1.005, 2)',
      'onyesha mviringo(-2.675, 2)',
    ].join('\n');
    // 1.005 → 1.0 (binary float can't represent 1.005 exactly; same in all 3).
    parity(src, '3.14\n3\n1\n-2.68');
  });

  it('combined: anza_na in a condition + kata + idadi pipeline', () => {
    const src = [
      'leta maandishi',
      'weka jina kuwa "Daktari Asha"',
      'ikiwa anza_na(jina, "Daktari") basi',
      '    onyesha kata(jina, 8, idadi(jina))',
      'mwisho',
    ].join('\n');
    parity(src, 'Asha');
  });
});
