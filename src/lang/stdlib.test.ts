// stdlib.test.ts — DUAL-BACKEND equality for the SNIL standard library. Each case
// runs a small SNIL program through (a) the interpreter `run()` and (b) the Python
// code generator `toPython()` executed by the REAL `python` interpreter, then asserts
//   interpreterOutput === pythonStdout === handWrittenExpected
// per line. If the two backends ever drift, these tests catch it. This is the point
// of SNIL having two backends: identical behaviour, identical display.
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, toPython } from './index';

/** Is the real `python` interpreter available? */
function pythonAvailable(): boolean {
  try {
    execFileSync('python', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Compile SNIL → Python, write to temp, execute, return trimmed stdout. */
function runPython(source: string): string {
  const py = toPython(source);
  const dir = mkdtempSync(join(tmpdir(), 'snil-stdlib-'));
  const file = join(dir, 'prog.py');
  writeFileSync(file, py, 'utf-8');
  const stdout = execFileSync('python', [file], { encoding: 'utf-8' });
  return stdout
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\s+$/, '');
}

const HAVE_PY = pythonAvailable();

/** Assert interpreter === python === expected, line by line. */
function assertDual(source: string, expected: string): void {
  const res = run(source);
  expect(res.error, res.error ? res.error.toString() : '').toBeNull();
  const interp = res.output;
  expect(interp).toBe(expected);
  if (HAVE_PY) {
    const py = runPython(source);
    expect(py).toBe(expected);
    expect(py).toBe(interp);
  }
}

describe('SNIL stdlib — dual-backend equality', () => {
  it('namba: maandishi → namba (kamili na desimali)', () => {
    const src = [
      'weka a kuwa namba("42")',
      'weka b kuwa namba("3.5")',
      'onyesha a + b',
      'onyesha namba("10") * 2',
    ].join('\n');
    assertDual(src, '45.5\n20');
  });

  it('maandishi: thamani → mfuatano wa SNIL', () => {
    const src = [
      'onyesha maandishi(10)',
      'onyesha maandishi(kweli)',
      'onyesha maandishi([1, 2, 3])',
      'onyesha "Idadi: " + maandishi(3)',
    ].join('\n');
    assertDual(src, '10\nkweli\n[1, 2, 3]\nIdadi: 3');
  });

  it('mzunguko na kamili', () => {
    const src = [
      'onyesha mzunguko(3.4)',
      'onyesha mzunguko(3.5)',
      'onyesha mzunguko(2.5)',
      'onyesha kamili(0 - 7)',
      'onyesha kamili(5)',
    ].join('\n');
    // Math.round half-up: 3.4→3, 3.5→4, 2.5→3.
    assertDual(src, '3\n4\n3\n7\n5');
  });

  it('hisabati.kipeo (power)', () => {
    const src = [
      'leta hisabati',
      'onyesha kipeo(2, 10)',
      'onyesha kipeo(5, 0)',
      'onyesha kipeo(9, 0.5)',
    ].join('\n');
    assertDual(src, '1024\n1\n3');
  });

  it('maandishi.ina / badilisha / ondoa_nafasi', () => {
    const src = [
      'leta maandishi',
      'onyesha ina("Habari Tanzania", "Tanzania")',
      'onyesha ina("Habari", " Tz")',
      'onyesha badilisha("a-a-a", "a", "b")',
      'onyesha ondoa_nafasi("   karibu   ")',
    ].join('\n');
    assertDual(src, 'kweli\nsi_kweli\nb-b-b\nkaribu');
  });

  it('orodha.panga (namba) bila kubadilisha asili', () => {
    const src = [
      'leta orodha',
      'weka asili kuwa [3, 1, 2]',
      'onyesha panga(asili)',
      'onyesha asili',
    ].join('\n');
    assertDual(src, '[1, 2, 3]\n[3, 1, 2]');
  });

  it('orodha.panga (maandishi) na geuza', () => {
    const src = [
      'leta orodha',
      'onyesha panga(["ndizi", "embe", "chungwa"])',
      'onyesha geuza([1, 2, 3])',
    ].join('\n');
    assertDual(src, '[chungwa, embe, ndizi]\n[3, 2, 1]');
  });

  it('orodha.ina (contains)', () => {
    const src = [
      'leta orodha',
      'onyesha ina([10, 20, 30], 20)',
      'onyesha ina(["a", "b"], "c")',
    ].join('\n');
    assertDual(src, 'kweli\nsi_kweli');
  });

  it('mfano halisi: wastani wa namba kutoka maandishi', () => {
    const src = [
      'leta hisabati',
      'weka bei kuwa [namba("1000"), namba("2000"), namba("3000")]',
      'onyesha "Wastani: " + maandishi(wastani(bei))',
      'onyesha "Jumla: " + maandishi(jumla(bei))',
    ].join('\n');
    assertDual(src, 'Wastani: 2000\nJumla: 6000');
  });
});
