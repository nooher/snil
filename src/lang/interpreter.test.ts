// interpreter.test.ts — exercises the FULL real pipeline (run = parse + interpret).
// Golden tests load examples/*.snil and assert output matches examples/EXPECTED.md
// byte-for-byte. Focused tests cover semantics from GRAMMAR.md.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, type SnilIO } from './index';

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(here, '../../examples');

function readExample(name: string): string {
  return readFileSync(resolve(examplesDir, name), 'utf8');
}

/** Parse a `## <name>.snil` fenced block out of EXPECTED.md. */
function expectedFor(name: string): string {
  const md = readFileSync(resolve(examplesDir, 'EXPECTED.md'), 'utf8');
  const lines = md.split(/\r?\n/);
  const header = `## ${name}`;
  const start = lines.findIndex((l) => l.trim() === header);
  if (start < 0) throw new Error(`No section ${header} in EXPECTED.md`);
  // Find the opening ``` after the header, then collect until the closing ```.
  let i = start + 1;
  while (i < lines.length && lines[i].trim() !== '```') i++;
  i++; // skip opening fence
  const body: string[] = [];
  while (i < lines.length && lines[i].trim() !== '```') {
    body.push(lines[i]);
    i++;
  }
  return body.join('\n');
}

describe('golden programs (byte-for-byte vs EXPECTED.md)', () => {
  for (const name of ['habari.snil', 'hesabu.snil', 'duka.snil']) {
    it(name, () => {
      const result = run(readExample(name));
      expect(result.error).toBeNull();
      expect(result.output).toBe(expectedFor(name));
    });
  }
});

describe('semantics', () => {
  it('string + number concatenation stringifies the number', () => {
    const r = run('onyesha "Jumla " + 15');
    expect(r.error).toBeNull();
    expect(r.output).toBe('Jumla 15');
  });

  it('number + string also concatenates', () => {
    const r = run('onyesha 15 + " ni jumla"');
    expect(r.output).toBe('15 ni jumla');
  });

  it('integers display without .0, decimals as-is', () => {
    const r = run('onyesha 6 / 2\nonyesha 7 / 2');
    expect(r.output).toBe('3\n3.5');
  });

  it('booleans and tupu display in Kiswahili', () => {
    const r = run('onyesha kweli\nonyesha si_kweli\nonyesha tupu');
    expect(r.output).toBe('kweli\nsi_kweli\ntupu');
  });

  it('lists and dicts display in canonical form', () => {
    const r = run('onyesha [1, 2, 3]\nweka m kuwa { jina: "Ali", umri: 20 }\nonyesha m');
    expect(r.output).toBe('[1, 2, 3]\n{jina: Ali, umri: 20}');
  });

  it('function with return + closure over defining scope', () => {
    const src = [
      'weka msingi kuwa 100',
      'kazi ongezea(x)',
      '    rudisha x + msingi',
      'mwisho',
      'onyesha ongezea(5)',
    ].join('\n');
    const r = run(src);
    expect(r.error).toBeNull();
    expect(r.output).toBe('105');
  });

  it('while loop runs until condition is false', () => {
    const src = [
      'weka i kuwa 1',
      'wakati i <= 3',
      '    onyesha i',
      '    i = i + 1',
      'mwisho',
    ].join('\n');
    const r = run(src);
    expect(r.output).toBe('1\n2\n3');
  });

  it('ikiwa truthiness: empty string is false', () => {
    const src = [
      'ikiwa "" basi',
      '    onyesha "ndio"',
      'vinginevyo',
      '    onyesha "hapana"',
      'mwisho',
    ].join('\n');
    const r = run(src);
    expect(r.output).toBe('hapana');
  });

  it('ikiwa truthiness: non-empty list is true', () => {
    const src = [
      'ikiwa [1] basi',
      '    onyesha "ndio"',
      'mwisho',
    ].join('\n');
    const r = run(src);
    expect(r.output).toBe('ndio');
  });

  it('kutoka..hadi range is inclusive both ends', () => {
    const r = run('kwa kila n kutoka 1 hadi 3\n    onyesha n\nmwisho');
    expect(r.output).toBe('1\n2\n3');
  });

  it('idadi() returns length of list and string', () => {
    const r = run('onyesha idadi([10, 20, 30])\nonyesha idadi("habari")');
    expect(r.output).toBe('3\n6');
  });

  it('ongeza / ondoa mutate the list in place', () => {
    const src = [
      'weka l kuwa ["a", "b"]',
      'ongeza "c" kwenye l',
      'ondoa "a" kutoka l',
      'onyesha l',
    ].join('\n');
    const r = run(src);
    expect(r.output).toBe('[b, c]');
  });

  it('divide-by-zero produces a Kiswahili SnilError with a line', () => {
    const r = run('onyesha 10 / 0');
    expect(r.error).not.toBeNull();
    expect(r.error?.ujumbe).toBe('Huwezi kugawanya kwa sifuri.');
    expect(r.error?.line).toBe(1);
    expect(r.error?.toString()).toContain('Mstari 1');
  });

  it('unknown variable produces a Kiswahili SnilError', () => {
    const r = run('onyesha jna');
    expect(r.error).not.toBeNull();
    expect(r.error?.ujumbe).toContain('halijatambulika');
  });

  it('unknown function produces a Kiswahili SnilError', () => {
    const r = run('onyesha pijaXyz(1)');
    expect(r.error).not.toBeNull();
    expect(r.error?.ujumbe).toContain('haijulikani');
  });

  it('stdlib hisabati via leta copies functions into the flat namespace', () => {
    const src = [
      'leta hisabati',
      'onyesha jumla([1, 2, 3, 4])',
      'onyesha wastani([2, 4, 6])',
      'onyesha kiwango_cha_juu([3, 9, 1])',
      'onyesha mzizi(9)',
    ].join('\n');
    const r = run(src);
    expect(r.error).toBeNull();
    expect(r.output).toBe('10\n4\n9\n3');
  });

  it('stdlib maandishi join/split', () => {
    const src = [
      'leta maandishi',
      'onyesha herufi_kubwa("ali")',
      'onyesha unganisha(["a", "b", "c"], "-")',
    ].join('\n');
    const r = run(src);
    expect(r.output).toBe('ALI\na-b-c');
  });

  it('jaribu/kosa catches a runtime SnilError', () => {
    const src = [
      'jaribu',
      '    onyesha 1 / 0',
      'kosa',
      '    onyesha "kosa limeshikwa"',
      'mwisho',
    ].join('\n');
    const r = run(src);
    expect(r.error).toBeNull();
    expect(r.output).toBe('kosa limeshikwa');
  });

  it('uliza stores a number when input parses as one, else a string', () => {
    const numIO: Partial<SnilIO> = { uliza: () => '42' };
    const r1 = run('uliza "?" kuwa x\nonyesha x + 8', numIO);
    expect(r1.output).toBe('50'); // numeric add

    const strIO: Partial<SnilIO> = { uliza: () => 'Asha' };
    const r2 = run('uliza "?" kuwa x\nonyesha "Habari " + x', strIO);
    expect(r2.output).toBe('Habari Asha');
  });
});

describe('string interpolation (uingizaji wa misemo)', () => {
  it('huingiza kigeu', () => {
    const r = run('weka jina kuwa "Asha"\nonyesha "Habari {jina}!"');
    expect(r.error).toBeNull();
    expect(r.output).toBe('Habari Asha!');
  });

  it('huingiza msemo wa hisabati (namba kamili bila .0)', () => {
    const r = run('onyesha "Jumla: {2 + 3}"');
    expect(r.error).toBeNull();
    expect(r.output).toBe('Jumla: 5');
  });

  it('huingiza member access kutoka kamusi', () => {
    const src = [
      'weka mtu kuwa { jina: "Juma", umri: 20 }',
      'onyesha "{mtu.jina} ana miaka {mtu.umri}"',
    ].join('\n');
    const r = run(src);
    expect(r.error).toBeNull();
    expect(r.output).toBe('Juma ana miaka 20');
  });

  it('\\{ ... \\} ni alama halisi (si uingizaji)', () => {
    const r = run('onyesha "\\{si interpolation\\}"');
    expect(r.error).toBeNull();
    expect(r.output).toBe('{si interpolation}');
  });

  it('hutumia kanuni za kuonyesha za SNIL (kweli/tupu/orodha)', () => {
    const src = [
      'weka bei kuwa [10, 20]',
      'onyesha "Hali: {kweli}, tupu: {tupu}, orodha: {bei}"',
    ].join('\n');
    const r = run(src);
    expect(r.error).toBeNull();
    expect(r.output).toBe('Hali: kweli, tupu: tupu, orodha: [10, 20]');
  });

  it('huita kazi ndani ya uingizaji', () => {
    const src = [
      'leta maandishi',
      'weka jina kuwa "asha"',
      'onyesha "Habari {herufi_kubwa(jina)}!"',
    ].join('\n');
    const r = run(src);
    expect(r.error).toBeNull();
    expect(r.output).toBe('Habari ASHA!');
  });
});

describe('module imports (leta "faili")', () => {
  /** Build an in-memory resolver from a name → source map. */
  function resolver(modules: Record<string, string>): SnilIO['somaModuli'] {
    return (name) => (name in modules ? modules[name] : null);
  }

  it('imports a top-level kazi and calls it by bare name', () => {
    const modules = {
      salamu: ['kazi karibisha(jina)', '    rudisha "Karibu " + jina', 'mwisho'].join('\n'),
    };
    const main = ['leta "salamu"', 'onyesha karibisha("Asha")'].join('\n');
    const r = run(main, { somaModuli: resolver(modules) });
    expect(r.error).toBeNull();
    expect(r.output).toBe('Karibu Asha');
  });

  it('imports a top-level weka variable by bare name', () => {
    const modules = { data: 'weka jina_la_app kuwa "SNIL"' };
    const main = ['leta "data"', 'onyesha jina_la_app'].join('\n');
    const r = run(main, { somaModuli: resolver(modules) });
    expect(r.error).toBeNull();
    expect(r.output).toBe('SNIL');
  });

  it('a module function closes over its own module scope', () => {
    const modules = {
      hesabu: [
        'weka msingi kuwa 100',
        'kazi ongezea(x)',
        '    rudisha x + msingi',
        'mwisho',
      ].join('\n'),
    };
    const main = ['leta "hesabu"', 'onyesha ongezea(5)'].join('\n');
    const r = run(main, { somaModuli: resolver(modules) });
    expect(r.error).toBeNull();
    expect(r.output).toBe('105');
  });

  it('a module can transitively import another module', () => {
    const modules = {
      msingi: ['kazi salimu(jina)', '    rudisha "Hujambo " + jina', 'mwisho'].join('\n'),
      mbele: [
        'leta "msingi"',
        'kazi karibisha(jina)',
        '    rudisha salimu(jina) + "!"',
        'mwisho',
      ].join('\n'),
    };
    const main = ['leta "mbele"', 'onyesha karibisha("Asha")'].join('\n');
    const r = run(main, { somaModuli: resolver(modules) });
    expect(r.error).toBeNull();
    expect(r.output).toBe('Hujambo Asha!');
  });

  it('a module imported twice runs only once (cached side effects)', () => {
    const modules = {
      mara: ['onyesha "imeleta"', 'weka thamani kuwa 7'].join('\n'),
    };
    const main = ['leta "mara"', 'leta "mara"', 'onyesha thamani'].join('\n');
    const r = run(main, { somaModuli: resolver(modules) });
    expect(r.error).toBeNull();
    // Body runs once → one "imeleta", then the cached binding is re-exposed.
    expect(r.output).toBe('imeleta\n7');
  });

  it('missing module → Kiswahili SnilError with a line', () => {
    const main = 'leta "haipo"\nonyesha 1';
    const r = run(main, { somaModuli: resolver({}) });
    expect(r.error).not.toBeNull();
    expect(r.error?.ujumbe).toContain('haijapatikana');
    expect(r.error?.line).toBe(1);
  });

  it('no resolver at all → Kiswahili SnilError', () => {
    const r = run('leta "salamu"\nonyesha 1');
    expect(r.error).not.toBeNull();
    expect(r.error?.ujumbe).toContain('haijapatikana');
  });

  it('a 2-module import cycle → Kiswahili error, no infinite loop', () => {
    const modules = {
      a: ['leta "b"', 'weka x kuwa 1'].join('\n'),
      b: ['leta "a"', 'weka y kuwa 2'].join('\n'),
    };
    const r = run('leta "a"\nonyesha 1', { somaModuli: resolver(modules) });
    expect(r.error).not.toBeNull();
    expect(r.error?.ujumbe).toContain('Mzunguko wa kuagiza moduli');
  });

  it('a file module may itself use stdlib', () => {
    const modules = {
      math: [
        'leta hisabati',
        'kazi jumlisha(orodha)',
        '    rudisha jumla(orodha)',
        'mwisho',
      ].join('\n'),
    };
    const main = ['leta "math"', 'onyesha jumlisha([1, 2, 3])'].join('\n');
    const r = run(main, { somaModuli: resolver(modules) });
    expect(r.error).toBeNull();
    expect(r.output).toBe('6');
  });

  it('regression: stdlib leta hisabati still works alongside module support', () => {
    const r = run('leta hisabati\nonyesha jumla([1, 2, 3, 4])');
    expect(r.error).toBeNull();
    expect(r.output).toBe('10');
  });
});
