// sourcemap.test.ts — SNIL source maps. Proves the compiler can trace each
// generated Python/JS line back to the original SNIL source line, WITHOUT changing
// the byte-for-byte output of toPython / toJS. Covers: line-array mapping for a
// function, a loop, and an if (both backends); byte-identity (no drift); Source
// Map v3 parse + VLQ round-trip; and the diagnose error-mapping helper.
import { describe, it, expect } from 'vitest';
import {
  toPython, toJS, toPythonWithMap, toJSWithMap,
  mapTargetLineToSource, formatTargetError,
  encodeVLQ, decodeVLQ,
} from './index';

/** Find the 1-based target line whose text contains `needle`. */
function lineOf(code: string, needle: string): number {
  const lines = code.split('\n');
  const idx = lines.findIndex((l) => l.includes(needle));
  return idx + 1; // 1-based (0 if not found → returns 0)
}

/** Find the 1-based target line whose trimmed text EQUALS `text` (exact match,
 *  avoids colliding with prelude lines that merely contain the substring). */
function exactLineOf(code: string, text: string): number {
  const lines = code.split('\n');
  const idx = lines.findIndex((l) => l === text);
  return idx + 1;
}

describe('SNIL source maps — line array maps target → SNIL source', () => {
  it('a function: def / return / call map back to their SNIL lines', () => {
    // SNIL lines:  1 kazi  2 rudisha  3 mwisho  4 onyesha
    const src = [
      'kazi salamu(jina)',
      '    rudisha "Habari " + jina',
      'mwisho',
      'onyesha salamu("Asha")',
    ].join('\n');
    const { code, map } = toPythonWithMap(src);

    const defLine = lineOf(code, 'def salamu(jina):');
    const retLine = lineOf(code, 'return _jumla(');
    const callLine = lineOf(code, 'print(_onyesha(salamu(');

    expect(mapTargetLineToSource(map, defLine)).toBe(1);
    expect(mapTargetLineToSource(map, retLine)).toBe(2);
    expect(mapTargetLineToSource(map, callLine)).toBe(4);
  });

  it('a loop (Python): the range header + body map to their SNIL lines', () => {
    // 1 kwa kila ...   2 onyesha n   3 mwisho
    const src = ['kwa kila n kutoka 1 hadi 3', '    onyesha n', 'mwisho'].join('\n');
    const { code, map } = toPythonWithMap(src);
    expect(mapTargetLineToSource(map, lineOf(code, 'for n in range('))).toBe(1);
    expect(mapTargetLineToSource(map, lineOf(code, 'print(_onyesha(n))'))).toBe(2);
  });

  it('an if (Python): the if-test maps to line 1, the else to its SNIL line', () => {
    // 1 ikiwa  2 onyesha ndio  3 vinginevyo  4 onyesha hapana  5 mwisho
    const src = [
      'ikiwa 1 < 2 basi',
      '    onyesha "ndio"',
      'vinginevyo',
      '    onyesha "hapana"',
      'mwisho',
    ].join('\n');
    const { code, map } = toPythonWithMap(src);
    expect(mapTargetLineToSource(map, lineOf(code, 'if (1 < 2):'))).toBe(1);
    expect(mapTargetLineToSource(map, lineOf(code, 'print(_onyesha("ndio"))'))).toBe(2);
    expect(mapTargetLineToSource(map, exactLineOf(code, 'else:'))).toBe(1); // program else, not prelude
    expect(mapTargetLineToSource(map, lineOf(code, 'print(_onyesha("hapana"))'))).toBe(4);
  });

  it('a function (JS): function / return / call map back to their SNIL lines', () => {
    const src = [
      'kazi salamu(jina)',
      '    rudisha "Habari " + jina',
      'mwisho',
      'onyesha salamu("Asha")',
    ].join('\n');
    const { code, map } = toJSWithMap(src);
    expect(mapTargetLineToSource(map, lineOf(code, 'function salamu(jina) {'))).toBe(1);
    expect(mapTargetLineToSource(map, lineOf(code, 'return _jumla('))).toBe(2);
    expect(mapTargetLineToSource(map, lineOf(code, '_onyesha(salamu('))).toBe(4);
  });

  it('a loop (JS): the for header + body map to their SNIL lines', () => {
    const src = ['kwa kila n kutoka 1 hadi 3', '    onyesha n', 'mwisho'].join('\n');
    const { code, map } = toJSWithMap(src);
    expect(mapTargetLineToSource(map, lineOf(code, '<= ' + '_to'))).toBeGreaterThan(0);
    expect(mapTargetLineToSource(map, lineOf(code, '_onyesha(n)'))).toBe(2);
  });

  it('prelude lines map to source 0 (no SNIL origin)', () => {
    const { map } = toPythonWithMap('onyesha 1');
    expect(mapTargetLineToSource(map, 1)).toBe(0); // top of the prelude
    expect(map.lines.length).toBeGreaterThan(50);
  });
});

describe('SNIL source maps — byte-identity (toPython/toJS unchanged)', () => {
  const samples = [
    'onyesha "Habari Dunia"',
    'weka a kuwa 10\nweka b kuwa 5\nonyesha a + b',
    'kazi salamu(jina)\n    rudisha "Habari " + jina\nmwisho\nonyesha salamu("Asha")',
    'kwa kila n kutoka 1 hadi 3\n    onyesha n\nmwisho',
    'ikiwa 1 < 2 basi\n    onyesha "ndio"\nvinginevyo\n    onyesha "hapana"\nmwisho',
    'onyesha ramani([1, 2], kazi(x) rudisha x * 2 mwisho)',
    'leta hisabati\nonyesha jumla([1, 2, 3])',
  ];
  for (const src of samples) {
    it(`Python output is byte-identical for: ${JSON.stringify(src).slice(0, 40)}`, () => {
      expect(toPythonWithMap(src).code).toBe(toPython(src));
    });
    it(`JS output is byte-identical for: ${JSON.stringify(src).slice(0, 40)}`, () => {
      expect(toJSWithMap(src).code).toBe(toJS(src));
    });
  }

  it('the source-map line array length equals the generated Python line count', () => {
    for (const src of samples) {
      const { code, map } = toPythonWithMap(src);
      expect(map.lines.length).toBe(code.split('\n').length);
    }
  });

  it('the source-map line array length equals the generated JS line count', () => {
    for (const src of samples) {
      const { code, map } = toJSWithMap(src);
      expect(map.lines.length).toBe(code.split('\n').length);
    }
  });
});

describe('SNIL source maps — Source Map v3 + VLQ', () => {
  it('emits a well-formed v3 object', () => {
    const { map } = toPythonWithMap('onyesha "Habari"');
    expect(map.v3.version).toBe(3);
    expect(map.v3.sources).toEqual(['main.snil']);
    expect(typeof map.v3.mappings).toBe('string');
    expect(map.v3.sourcesContent?.[0]).toBe('onyesha "Habari"');
  });

  it('the v3 map is JSON-serialisable and re-parses identically', () => {
    const { map } = toPythonWithMap('weka a kuwa 1\nonyesha a');
    const round = JSON.parse(JSON.stringify(map.v3));
    expect(round).toEqual(map.v3);
  });

  it('VLQ encode/decode round-trips signed integers', () => {
    for (const n of [0, 1, -1, 15, 16, -16, 123, -123, 1000, -1000]) {
      expect(decodeVLQ(encodeVLQ(n))).toEqual([n]);
    }
  });

  it('the v3 mappings have one group (target line) per generated line', () => {
    const { code, map } = toPythonWithMap('kazi f()\n    rudisha 1\nmwisho\nonyesha f()');
    const groups = map.v3.mappings.split(';');
    expect(groups.length).toBe(code.split('\n').length);
  });

  it('decoding a mapped v3 segment recovers the SNIL line for a known target line', () => {
    const src = 'onyesha "a"\nonyesha "b"';
    const { code, map } = toPythonWithMap(src);
    const target = lineOf(code, 'print(_onyesha("b"))');
    // Walk the v3 mappings, tracking the relative source-line state, to the group.
    const groups = map.v3.mappings.split(';');
    let srcLine0 = 0;
    let recovered = 0;
    for (let i = 0; i < groups.length; i++) {
      if (groups[i]) {
        const seg = decodeVLQ(groups[i]);
        srcLine0 += seg[2]; // [genCol, srcIdx, srcLineDelta, srcCol]
        if (i + 1 === target) { recovered = srcLine0 + 1; break; }
      }
    }
    expect(recovered).toBe(2); // "onyesha \"b\"" is SNIL line 2
    // ...and it agrees with the simple line array + helper.
    expect(mapTargetLineToSource(map, target)).toBe(2);
  });
});

describe('SNIL source maps — error mapping helper (diagnose)', () => {
  it('mapTargetLineToSource returns 0 for out-of-range / prelude lines', () => {
    const { map } = toPythonWithMap('onyesha 1');
    expect(mapTargetLineToSource(map, 0)).toBe(0);
    expect(mapTargetLineToSource(map, 99999)).toBe(0);
  });

  it('every mapped entry round-trips through the line array', () => {
    const src = 'kazi f(x)\n    rudisha x + 1\nmwisho\nonyesha f(2)';
    const { map } = toPythonWithMap(src);
    for (const e of map.entries) {
      expect(mapTargetLineToSource(map, e.target)).toBe(e.source);
    }
    expect(map.entries.length).toBeGreaterThan(0);
  });

  it('formatTargetError renders a Kiswahili frame pointing at the SNIL source', () => {
    const src = [
      'weka a kuwa 1',
      'weka b kuwa 0',
      'onyesha a / b', // division by zero — would crash at runtime
    ].join('\n');
    const { code, map } = toPythonWithMap(src);
    const target = lineOf(code, 'print(_onyesha(_gawanya(a, b)))'); // the CALL site, not the prelude def
    const frame = formatTargetError(src, map, target, 'Huwezi kugawanya kwa sifuri.', 'Python');
    expect(frame).toContain('Mstari 3');         // points at SNIL line 3
    expect(frame).toContain('onyesha a / b');    // shows the SNIL source line
    expect(frame).toContain('Huwezi kugawanya'); // the Kiswahili message
  });

  it('formatTargetError degrades gracefully for an unmapped target line', () => {
    const { map } = toPythonWithMap('onyesha 1');
    const frame = formatTargetError('onyesha 1', map, 1, 'kosa lolote', 'JavaScript');
    expect(frame).toContain('hakijulikani'); // SNIL source unknown for prelude line
  });
});
