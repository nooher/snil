// conformance.test.ts — the SNIL compliance suite ("hakikisho la ulinganifu").
//
// SNIL is one language with THREE backends: the tree-walking interpreter, the
// Python compiler, and the JavaScript compiler. The spec demands they AGREE.
// This file proves it: for EVERY deterministic example in examples/*.snil
// (those that never call `uliza`, which needs interactive input), all three
// backends must produce IDENTICAL output, and that output must match the golden
// values in examples/EXPECTED.md.
//
//   1. interpreter  → run(src).output
//   2. Python       → toPython(src) → temp .py  → `python`  stdout
//   3. JavaScript   → toJS(src)     → temp .mjs → `node`    stdout
//
// Plus a couple of small inline cross-target parity programs (including a
// `leta "x"` module program driven by an in-memory ModuleResolver) asserting
// interpreter === python === js.
import { describe, it, expect } from 'vitest';
import {
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, toPython, toJS } from './index';
import type { ModuleResolver } from './runtime';

const here = dirname(fileURLToPath(import.meta.url));
const EXAMPLES_DIR = join(here, '..', '..', 'examples');

/** Normalize output for comparison: strip trailing whitespace per line + at end. */
function norm(s: string): string {
  return s
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\s+$/, '');
}

/**
 * Parse examples/EXPECTED.md into { "habari.snil": "Habari Dunia", ... }.
 * Format: a "## <name>.snil" heading followed by a ```-fenced output block.
 */
function loadExpected(): Record<string, string> {
  const md = readFileSync(join(EXAMPLES_DIR, 'EXPECTED.md'), 'utf-8');
  const out: Record<string, string> = {};
  const re = /^##\s+(\S+\.snil)\s*\n```\n([\s\S]*?)\n```/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    out[m[1]] = norm(m[2]);
  }
  return out;
}

/** Every deterministic *.snil under examples/ (skips any that call `uliza`). */
function deterministicExamples(): string[] {
  return readdirSync(EXAMPLES_DIR)
    .filter((f) => f.endsWith('.snil'))
    .filter((f) => !/\buliza\b/.test(readFileSync(join(EXAMPLES_DIR, f), 'utf-8')))
    .sort();
}

/** Compile + execute through a real external runtime; temp file is cleaned up. */
function runExternal(
  code: string,
  ext: 'py' | 'mjs',
  bin: string,
): string {
  const dir = mkdtempSync(join(tmpdir(), 'snil-conf-'));
  const file = join(dir, `prog.${ext}`);
  try {
    writeFileSync(file, code, 'utf-8');
    return norm(execFileSync(bin, [file], { encoding: 'utf-8' }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function runPython(src: string, somaModuli?: ModuleResolver): string {
  return runExternal(toPython(src, somaModuli), 'py', 'python');
}

function runJS(src: string, somaModuli?: ModuleResolver): string {
  return runExternal(toJS(src, somaModuli), 'mjs', 'node');
}

const expected = loadExpected();
const examples = deterministicExamples();

describe('SNIL conformance — three backends agree on every example', () => {
  it('discovers deterministic examples', () => {
    expect(examples.length).toBeGreaterThan(0);
  });

  for (const file of examples) {
    it(`${file}: interpreter === python === js === EXPECTED.md`, () => {
      const src = readFileSync(join(EXAMPLES_DIR, file), 'utf-8');
      const gold = expected[file];
      expect(gold, `no EXPECTED.md entry for ${file}`).toBeDefined();

      const interp = run(src);
      expect(interp.error, interp.error?.message).toBeNull();
      const interpOut = norm(interp.output);
      const py = runPython(src);
      const js = runJS(src);

      // All three backends agree with each other...
      expect(interpOut).toBe(py);
      expect(py).toBe(js);
      // ...and with the golden output.
      expect(interpOut).toBe(gold);
    });
  }
});

describe('SNIL conformance — cross-target parity on inline programs', () => {
  function parity(src: string, somaModuli?: ModuleResolver): string {
    const interp = run(src, somaModuli ? { somaModuli } : {});
    expect(interp.error, interp.error?.message).toBeNull();
    const interpOut = norm(interp.output);
    expect(runPython(src, somaModuli)).toBe(interpOut);
    expect(runJS(src, somaModuli)).toBe(interpOut);
    return interpOut;
  }

  it('arithmetic + string concat agree across backends', () => {
    const src = [
      'weka a kuwa 10',
      'weka b kuwa 4',
      'onyesha "Jumla " + (a + b)',
      'onyesha "Gawio " + (a / b)',
      'onyesha a % b',
    ].join('\n');
    expect(parity(src)).toBe('Jumla 14\nGawio 2.5\n2');
  });

  it('function + condition + loop agree across backends', () => {
    const src = [
      'kazi mara2(x)',
      '    rudisha x * 2',
      'mwisho',
      'kwa kila n kutoka 1 hadi 3',
      '    ikiwa n % 2 == 0 basi',
      '        onyesha "shufwa " + mara2(n)',
      '    vinginevyo',
      '        onyesha "witiri " + n',
      '    mwisho',
      'mwisho',
    ].join('\n');
    expect(parity(src)).toBe('witiri 1\nshufwa 4\nwitiri 3');
  });

  it('string interpolation agrees across all three backends', () => {
    const src = [
      'weka jina kuwa "Asha"',
      'weka mtu kuwa { jina: "Juma", umri: 20 }',
      'onyesha "Habari {jina}!"',
      'onyesha "Jumla: {2 + 3}"',
      'onyesha "{mtu.jina} ana miaka {mtu.umri}"',
      'onyesha "\\{si interpolation\\}"',
      'onyesha "bila uingizaji"',
    ].join('\n');
    expect(parity(src)).toBe(
      'Habari Asha!\nJumla: 5\nJuma ana miaka 20\n{si interpolation}\nbila uingizaji',
    );
  });

  it('leta "x" module import inlines + agrees across all three backends', () => {
    const mods: Record<string, string> = {
      salamu: [
        '# salamu.snil',
        'kazi karibisha(jina)',
        '    rudisha "Karibu " + jina',
        'mwisho',
      ].join('\n'),
    };
    const resolver: ModuleResolver = (name) =>
      mods[name] ?? mods[name.replace(/\.snil$/, '')] ?? null;
    const main = [
      'leta "salamu"',
      'onyesha karibisha("Asha")',
      'onyesha karibisha("Juma")',
    ].join('\n');
    expect(parity(main, resolver)).toBe('Karibu Asha\nKaribu Juma');
  });
});
