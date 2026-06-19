// codegen_js.test.ts — verifies the SNIL → JavaScript compiler. The golden
// programs are compiled to JS, EXECUTED with the real `node` runtime, and their
// stdout is asserted equal to examples/EXPECTED.md (the single source of truth
// shared with the SNIL interpreter and the Python backend). Plus focused unit
// tests on semantics that are JS-specific risks (truthiness of [], int display,
// member→object, inclusive range, cross-module inlining).
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toJS, run } from './index';
import type { ModuleResolver } from './runtime';
import { SnilError } from './errors';

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, '..', '..', 'examples');

/** Parse examples/EXPECTED.md → { name: expectedOutput } keyed by `## name.snil`. */
function loadExpected(): Record<string, string> {
  const md = readFileSync(join(examplesDir, 'EXPECTED.md'), 'utf-8');
  const out: Record<string, string> = {};
  const re = /##\s+([\w.]+)\s*\n+```\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const name = m[1].replace(/\.snil$/, '');
    out[name] = m[2].replace(/\s+$/, '');
  }
  return out;
}

/** Compile SNIL → JS, write to a temp .js file, run via `node`, return trimmed stdout. */
function runJS(source: string, somaModuli?: ModuleResolver): string {
  const js = toJS(source, somaModuli);
  const dir = mkdtempSync(join(tmpdir(), 'snil-js-'));
  const file = join(dir, 'prog.js');
  writeFileSync(file, js, 'utf-8');
  const stdout = execFileSync('node', [file], { encoding: 'utf-8' });
  return stdout
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\s+$/, '');
}

const expected = loadExpected();

describe('SNIL → JavaScript golden programs (executed via node)', () => {
  for (const name of ['habari', 'hesabu', 'duka']) {
    it(`${name}.snil compiles + runs to EXPECTED.md output`, () => {
      const src = readFileSync(join(examplesDir, `${name}.snil`), 'utf-8');
      expect(runJS(src)).toBe(expected[name]);
    });
  }
});

describe('SNIL → JavaScript output matches the interpreter (parity)', () => {
  // Every deterministic example must produce IDENTICAL output across the
  // interpreter and the JS backend.
  for (const name of ['habari', 'hesabu', 'duka', 'fizzbuzz', 'wastani', 'pembetatu', 'kikokotoo']) {
    it(`${name}.snil: JS output === interpreter output === EXPECTED`, () => {
      const src = readFileSync(join(examplesDir, `${name}.snil`), 'utf-8');
      const interp = run(src);
      expect(interp.error).toBeNull();
      const js = runJS(src);
      expect(js).toBe(interp.output.replace(/\s+$/, ''));
      expect(js).toBe(expected[name]);
    });
  }
});

describe('SNIL → JavaScript semantics (executed)', () => {
  it('string + number concatenation prints correctly', () => {
    const js = toJS('onyesha "Jumla " + 15');
    expect(js).toContain('_jumla(');
    expect(runJS('onyesha "Jumla " + 15')).toBe('Jumla 15');
  });

  it('integer prints without ".0"', () => {
    expect(runJS('weka a kuwa 10\nweka b kuwa 5\nonyesha a + b')).toBe('15');
    expect(runJS('onyesha 7')).toBe('7');
  });

  it('decimals print as-is (no trailing zero issues)', () => {
    expect(runJS('onyesha 61.6')).toBe('61.6');
  });

  it('booleans, tupu, lists, dicts use SNIL display form', () => {
    expect(runJS('onyesha kweli')).toBe('kweli');
    expect(runJS('onyesha si_kweli')).toBe('si_kweli');
    expect(runJS('onyesha tupu')).toBe('tupu');
    expect(runJS('onyesha [1, 2, 3]')).toBe('[1, 2, 3]');
    expect(runJS('onyesha { jina: "Ali", umri: 20 }')).toBe('{jina: Ali, umri: 20}');
  });

  it('a function compiles to function and returns', () => {
    const src = 'kazi salamu(jina)\n    rudisha "Habari " + jina\nmwisho\nonyesha salamu("Asha")';
    const js = toJS(src);
    expect(js).toContain('function salamu(jina) {');
    expect(js).toContain('return _jumla(');
    expect(runJS(src)).toBe('Habari Asha');
  });

  it('kwa-kila kutoka..hadi is an INCLUSIVE range', () => {
    expect(runJS('kwa kila n kutoka 1 hadi 3\n    onyesha n\nmwisho')).toBe('1\n2\n3');
  });

  it('kwa-kila descending range counts down (matches interpreter)', () => {
    expect(runJS('kwa kila n kutoka 3 hadi 1\n    onyesha n\nmwisho')).toBe('3\n2\n1');
  });

  it('member access compiles to object subscript (read + write)', () => {
    const read = toJS('weka m kuwa { jina: "Ali" }\nonyesha m.jina');
    expect(read).toContain('["jina"]');
    expect(runJS('weka m kuwa { jina: "Ali" }\nm.jina = "Asha"\nonyesha m.jina')).toBe('Asha');
  });

  it('EMPTY LIST is FALSY in ikiwa (SNIL truthiness, not JS)', () => {
    // In plain JS [] is truthy; _kweli must make it falsy.
    const src = 'weka xs kuwa []\nikiwa xs basi\n    onyesha "ina"\nvinginevyo\n    onyesha "tupu"\nmwisho';
    expect(runJS(src)).toBe('tupu');
  });

  it('empty list is falsy in wakati (while) too', () => {
    const src = 'weka xs kuwa [1]\nwakati xs\n    ondoa 1 kutoka xs\nmwisho\nonyesha "imeisha"';
    expect(runJS(src)).toBe('imeisha');
  });

  it('zero, empty string are falsy; nonempty are truthy', () => {
    expect(runJS('ikiwa 0 basi\n onyesha "a"\nvinginevyo\n onyesha "b"\nmwisho')).toBe('b');
    expect(runJS('ikiwa "" basi\n onyesha "a"\nvinginevyo\n onyesha "b"\nmwisho')).toBe('b');
    expect(runJS('ikiwa "x" basi\n onyesha "a"\nvinginevyo\n onyesha "b"\nmwisho')).toBe('a');
  });

  it('na / au / sio match SNIL truthiness', () => {
    expect(runJS('onyesha (kweli na kweli)')).toBe('kweli');
    expect(runJS('onyesha (kweli na si_kweli)')).toBe('si_kweli');
    expect(runJS('onyesha (si_kweli au kweli)')).toBe('kweli');
    expect(runJS('onyesha sio si_kweli')).toBe('kweli');
    // na/au return a BOOLEAN (isTruthy of the deciding operand), NOT the
    // operand value as in JS ||. Empty list is falsy, so (xs au "mbadala") is
    // kweli (the right side is truthy) — matching the interpreter.
    expect(runJS('weka xs kuwa []\nonyesha (xs au "mbadala")')).toBe('kweli');
    expect(runJS('weka xs kuwa []\nonyesha (xs na "mbadala")')).toBe('si_kweli');
  });

  it('division by zero throws Kiswahili error (caught by jaribu/kosa)', () => {
    const src = 'jaribu\n    onyesha 1 / 0\nkosa\n    onyesha "kosa la hesabu"\nmwisho';
    expect(runJS(src)).toBe('kosa la hesabu');
  });

  it('list equality and == use deep equality', () => {
    expect(runJS('ikiwa [1, 2] == [1, 2] basi\n onyesha "sawa"\nvinginevyo\n onyesha "tofauti"\nmwisho')).toBe('sawa');
  });

  it('ongeza / ondoa mutate lists like the interpreter', () => {
    const src = 'weka xs kuwa [1, 2, 3]\nongeza 4 kwenye xs\nondoa 2 kutoka xs\nonyesha xs';
    expect(runJS(src)).toBe('[1, 3, 4]');
  });

  it('stdlib leta hisabati flattens to bare names and runs', () => {
    const src = 'leta hisabati\nonyesha jumla([1, 2, 3])';
    const js = toJS(src);
    expect(js).toContain('var jumla = hisabati.jumla;');
    expect(runJS(src)).toBe('6');
  });

  it('stdlib maandishi module + global maandishi() coexist', () => {
    expect(runJS('leta maandishi\nonyesha herufi_kubwa("habari")')).toBe('HABARI');
    expect(runJS('onyesha maandishi(15)')).toBe('15');
  });
});

describe('SNIL → JavaScript file-module imports (leta "x", inlined + executed)', () => {
  const resolver = (mods: Record<string, string>): ModuleResolver =>
    (name) => (name in mods ? mods[name] : null);

  it('leta "salamu" inlines a kazi and calls it (Karibu Asha)', () => {
    const mods = { salamu: 'kazi karibisha(jina)\n    rudisha "Karibu " + jina\nmwisho' };
    const main = 'leta "salamu"\nonyesha karibisha("Asha")';
    const js = toJS(main, resolver(mods));
    expect(js).toContain('function karibisha(jina) {');
    expect(runJS(main, resolver(mods))).toBe('Karibu Asha');
  });

  it('leta "data" inlines a top-level weka', () => {
    const mods = { data: 'weka jina_la_app kuwa "SNIL"' };
    const main = 'leta "data"\nonyesha jina_la_app';
    expect(runJS(main, resolver(mods))).toBe('SNIL');
  });

  it('transitive imports (module imports module) run correctly', () => {
    const mods = {
      msingi: 'kazi nukta()\n    rudisha "."\nmwisho',
      salamu: 'leta "msingi"\nkazi karibisha(jina)\n    rudisha "Karibu " + jina + nukta()\nmwisho',
    };
    const main = 'leta "salamu"\nonyesha karibisha("Asha")';
    expect(runJS(main, resolver(mods))).toBe('Karibu Asha.');
  });

  it('a module imported by two modules is inlined ONLY ONCE', () => {
    const mods = {
      shared: 'kazi pamoja()\n    rudisha "+"\nmwisho',
      a: 'leta "shared"\nkazi fromA()\n    rudisha "A" + pamoja()\nmwisho',
      b: 'leta "shared"\nkazi fromB()\n    rudisha "B" + pamoja()\nmwisho',
    };
    const main = 'leta "a"\nleta "b"\nonyesha fromA() + fromB()';
    const js = toJS(main, resolver(mods));
    const defs = js.match(/function pamoja\(\) \{/g) ?? [];
    expect(defs.length).toBe(1);
    expect(runJS(main, resolver(mods))).toBe('A+B+');
  });

  it('import cycle is safe (does not infinite-loop, compiles + runs)', () => {
    const mods = {
      x: 'leta "y"\nkazi fromX()\n    rudisha "X"\nmwisho',
      y: 'leta "x"\nkazi fromY()\n    rudisha "Y"\nmwisho',
    };
    const main = 'leta "x"\nonyesha fromX() + fromY()';
    const js = toJS(main, resolver(mods));
    expect(js).toContain('function fromX() {');
    expect(js).toContain('function fromY() {');
    expect(runJS(main, resolver(mods))).toBe('XY');
  });

  it('missing module throws a Kiswahili SnilError', () => {
    const main = 'leta "haipo"\nonyesha 1';
    expect(() => toJS(main, resolver({}))).toThrow(SnilError);
    try {
      toJS(main, resolver({}));
    } catch (e) {
      expect((e as SnilError).ujumbe).toContain('Moduli');
      expect((e as SnilError).ujumbe).toContain('haipo');
    }
  });

  it('file import with NO resolver throws a Kiswahili SnilError', () => {
    expect(() => toJS('leta "salamu"\nonyesha 1')).toThrow(SnilError);
  });
});
