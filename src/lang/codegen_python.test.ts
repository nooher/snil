// codegen_python.test.ts — verifies the SNIL → Python compiler. The three golden
// programs are compiled to Python, EXECUTED with the real `python` interpreter,
// and their stdout is asserted equal to examples/EXPECTED.md (the single source of
// truth shared with the SNIL interpreter). Plus focused unit tests on semantics.
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toPython } from './index';
import type { ModuleResolver } from './runtime';
import { SnilError } from './errors';

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, '..', '..', 'examples');

/** Parse examples/EXPECTED.md → { name: expectedOutputLines } keyed by `## name.snil`. */
function loadExpected(): Record<string, string> {
  const md = readFileSync(join(examplesDir, 'EXPECTED.md'), 'utf-8');
  const out: Record<string, string> = {};
  // Match "## name.snil" followed by a fenced ``` ... ``` block.
  const re = /##\s+([\w.]+)\s*\n+```\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const name = m[1].replace(/\.snil$/, '');
    out[name] = m[2].replace(/\s+$/, '');
  }
  return out;
}

/** Is the `python` interpreter available in this environment? */
function pythonAvailable(): boolean {
  try {
    execFileSync('python', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Compile SNIL → Python, write to a temp file, run it, return trimmed stdout. */
function runPython(source: string, somaModuli?: ModuleResolver): string {
  const py = toPython(source, somaModuli);
  const dir = mkdtempSync(join(tmpdir(), 'snil-'));
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
const expected = loadExpected();

describe('SNIL → Python golden programs (executed)', () => {
  for (const name of ['habari', 'hesabu', 'duka']) {
    it(`${name}.snil compiles + runs to EXPECTED.md output`, () => {
      const src = readFileSync(join(examplesDir, `${name}.snil`), 'utf-8');
      if (!HAVE_PY) {
        // Fallback: assert the generated Python contains the right shape.
        const py = toPython(src);
        expect(py).toContain('def _str');
        expect(py).toContain('print(_onyesha(');
        return;
      }
      const got = runPython(src);
      expect(got).toBe(expected[name]);
    });
  }
});

describe('SNIL → Python semantics (generated source)', () => {
  it('string + number concatenation prints correctly', () => {
    const py = toPython('onyesha "Jumla " + 15');
    expect(py).toContain('_jumla(');
    if (HAVE_PY) expect(runPython('onyesha "Jumla " + 15')).toBe('Jumla 15');
  });

  it('integer prints without ".0"', () => {
    if (HAVE_PY) {
      expect(runPython('weka a kuwa 10\nweka b kuwa 5\nonyesha a + b')).toBe('15');
    } else {
      expect(toPython('onyesha 10')).toContain('print(_onyesha(10))');
    }
  });

  it('booleans, tupu, lists, dicts use SNIL display form', () => {
    if (!HAVE_PY) return;
    expect(runPython('onyesha kweli')).toBe('kweli');
    expect(runPython('onyesha si_kweli')).toBe('si_kweli');
    expect(runPython('onyesha tupu')).toBe('tupu');
    expect(runPython('onyesha [1, 2, 3]')).toBe('[1, 2, 3]');
    expect(runPython('onyesha { jina: "Ali", umri: 20 }')).toBe('{jina: Ali, umri: 20}');
  });

  it('a function compiles to def and returns', () => {
    const src = 'kazi salamu(jina)\n    rudisha "Habari " + jina\nmwisho\nonyesha salamu("Asha")';
    const py = toPython(src);
    expect(py).toContain('def salamu(jina):');
    expect(py).toContain('return _jumla(');
    if (HAVE_PY) expect(runPython(src)).toBe('Habari Asha');
  });

  it('kwa-kila kutoka..hadi is an INCLUSIVE range', () => {
    const src = 'kwa kila n kutoka 1 hadi 3\n    onyesha n\nmwisho';
    const py = toPython(src);
    expect(py).toContain('+ 1):'); // range(a, (b) + 1)
    if (HAVE_PY) expect(runPython(src)).toBe('1\n2\n3');
  });

  it('member access compiles to dict subscript (read + write)', () => {
    const read = toPython('weka m kuwa { jina: "Ali" }\nonyesha m.jina');
    expect(read).toContain('["jina"]');
    const write = toPython('weka m kuwa { jina: "Ali" }\nm.jina = "Asha"\nonyesha m.jina');
    expect(write).toContain('m["jina"] = "Asha"');
    if (HAVE_PY) {
      expect(runPython('weka m kuwa { jina: "Ali" }\nm.jina = "Asha"\nonyesha m.jina')).toBe('Asha');
    }
  });
});

describe('SNIL → Python file-module imports (leta "x", inlined + executed)', () => {
  /** Build a ModuleResolver from a name→SNIL-source map. */
  const resolver = (mods: Record<string, string>): ModuleResolver =>
    (name) => (name in mods ? mods[name] : null);

  it('leta "salamu" inlines a kazi and calls it (Karibu Asha)', () => {
    const mods = {
      salamu: 'kazi karibisha(jina)\n    rudisha "Karibu " + jina\nmwisho',
    };
    const main = 'leta "salamu"\nonyesha karibisha("Asha")';
    const py = toPython(main, resolver(mods));
    expect(py).toContain('def karibisha(jina):');
    if (HAVE_PY) expect(runPython(main, resolver(mods))).toBe('Karibu Asha');
  });

  it('leta "data" inlines a top-level weka (SNIL)', () => {
    const mods = { data: 'weka jina_la_app kuwa "SNIL"' };
    const main = 'leta "data"\nonyesha jina_la_app';
    if (HAVE_PY) expect(runPython(main, resolver(mods))).toBe('SNIL');
  });

  it('transitive imports (module imports module) run correctly', () => {
    const mods = {
      msingi: 'kazi nukta()\n    rudisha "."\nmwisho',
      salamu: 'leta "msingi"\nkazi karibisha(jina)\n    rudisha "Karibu " + jina + nukta()\nmwisho',
    };
    const main = 'leta "salamu"\nonyesha karibisha("Asha")';
    if (HAVE_PY) expect(runPython(main, resolver(mods))).toBe('Karibu Asha.');
  });

  it('a module imported by two modules is inlined ONLY ONCE', () => {
    const mods = {
      shared: 'kazi pamoja()\n    rudisha "+"\nmwisho',
      a: 'leta "shared"\nkazi fromA()\n    rudisha "A" + pamoja()\nmwisho',
      b: 'leta "shared"\nkazi fromB()\n    rudisha "B" + pamoja()\nmwisho',
    };
    const main = 'leta "a"\nleta "b"\nonyesha fromA() + fromB()';
    const py = toPython(main, resolver(mods));
    // "shared" emitted exactly once → exactly one definition of pamoja.
    const defs = py.match(/def pamoja\(\):/g) ?? [];
    expect(defs.length).toBe(1);
    // And it runs (no Python duplicate-def crash, correct output).
    if (HAVE_PY) expect(runPython(main, resolver(mods))).toBe('A+B+');
  });

  it('import cycle is safe (does not infinite-loop, compiles + runs)', () => {
    const mods = {
      x: 'leta "y"\nkazi fromX()\n    rudisha "X"\nmwisho',
      y: 'leta "x"\nkazi fromY()\n    rudisha "Y"\nmwisho',
    };
    const main = 'leta "x"\nonyesha fromX() + fromY()';
    const py = toPython(main, resolver(mods));
    expect(py).toContain('def fromX():');
    expect(py).toContain('def fromY():');
    if (HAVE_PY) expect(runPython(main, resolver(mods))).toBe('XY');
  });

  it('missing module throws a Kiswahili SnilError', () => {
    const main = 'leta "haipo"\nonyesha 1';
    expect(() => toPython(main, resolver({}))).toThrow(SnilError);
    try {
      toPython(main, resolver({}));
    } catch (e) {
      expect((e as SnilError).ujumbe).toContain('Moduli');
      expect((e as SnilError).ujumbe).toContain('haipo');
    }
  });

  it('file import with NO resolver throws a Kiswahili SnilError', () => {
    expect(() => toPython('leta "salamu"\nonyesha 1')).toThrow(SnilError);
  });

  it('stdlib leta hisabati still compiles + runs (regression)', () => {
    const src = 'leta hisabati\nonyesha jumla([1, 2, 3])';
    const py = toPython(src);
    expect(py).toContain('jumla = hisabati.jumla');
    if (HAVE_PY) expect(runPython(src)).toBe('6');
  });
});
