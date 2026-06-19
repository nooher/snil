// diagnose_multi.test.ts — vitest. Multi-error diagnostics (error recovery).
// The parser must surface EVERY syntax mistake in one pass (Kiswahili code-frames),
// not just the first — the make-or-break of SNIL's education mission.
import { describe, it, expect } from 'vitest';
import { tokenize } from './lexer';
import { parse, parseAll as parseAllTokens } from './parser';
import { parseAll, diagnoseAll } from './index';
import { formatErrors, formatError } from './diagnose';
import { SnilError } from './errors';

describe('parseAll — uokoaji wa makosa (error recovery)', () => {
  it('programu yenye makosa 3 tofauti → diagnoseAll inarudisha ≥2 (lengo 3)', () => {
    // Line 1: weka bila "kuwa". Line 2: ikiwa bila "basi"+mwisho. Line 3 (after): onyesha bila msemo.
    const src = [
      'weka x 1',          // 1: kosa — "kuwa" inakosekana
      'onyesha y +',       // 2: kosa — msemo unakosekana baada ya "+"
      'weka z kuwa 3',     // 3: sahihi (recovery inaweza kuendelea)
      'onyesha *',         // 4: kosa — msemo unakosekana
    ].join('\n');
    const errs = diagnoseAll(src);
    expect(errs.length).toBeGreaterThanOrEqual(2);
    expect(errs.length).toBe(3);
    // Kila kosa ni la kuchanganua na lina namba ya mstari halali.
    for (const e of errs) {
      expect(e).toBeInstanceOf(SnilError);
      expect(e.awamu).toBe('kuchanganua');
      expect(e.line).toBeGreaterThan(0);
    }
  });

  it('namba za mistari ni sahihi na zimepangwa', () => {
    const src = ['weka a 1', 'weka b 2', 'weka c 3'].join('\n');
    const errs = diagnoseAll(src);
    expect(errs).toHaveLength(3);
    expect(errs.map((e) => e.line)).toEqual([1, 2, 3]);
  });

  it('recovery inaendelea baada ya kosa: sentensi sahihi bado zinachanganuliwa', () => {
    const src = ['weka x 1', 'weka y kuwa 2', 'weka z 3'].join('\n');
    const { program, errors } = parseAllTokens(tokenize(src));
    expect(errors).toHaveLength(2); // mistari 1 na 3
    expect(program).not.toBeNull();
    // Sentensi ya katikati sahihi imechanganuliwa.
    const decls = program!.body.filter((s) => s.kind === 'VarDecl');
    expect(decls.length).toBeGreaterThanOrEqual(1);
  });

  it('programu sahihi → diagnoseAll inarudisha []', () => {
    const src = 'weka x kuwa 1\nonyesha x + 2\nkwa kila n kutoka 1 hadi 3\n onyesha n\nmwisho';
    expect(diagnoseAll(src)).toEqual([]);
  });

  it('programu sahihi → parseAll(source).program ni sawa na parse()', () => {
    // parseAll ya index inachukua CHANZO (string), si tokeni.
    const src = 'weka x kuwa 1\nonyesha x';
    const { program, errors } = parseAll(src);
    expect(errors).toEqual([]);
    expect(program).toEqual(parse(tokenize(src)));
  });

  it('kifuniko (cap) kinashikilia: makosa mengi sana → si zaidi ya 25', () => {
    // mistari 60 yote yenye kosa (weka bila kuwa).
    const src = Array.from({ length: 60 }, (_, i) => `weka v${i} ${i}`).join('\n');
    const errs = diagnoseAll(src);
    expect(errs.length).toBeLessThanOrEqual(25);
    expect(errs.length).toBeGreaterThan(0);
  });

  it('haiingii kitanzi kisicho na mwisho kwenye ingizo la patholojia', () => {
    // Mfululizo wa alama zisizo na maana — lazima ikamilike (haitanaganga).
    const pathological = '= = = ) ) ] } , . : + * /';
    const errs = diagnoseAll(pathological);
    expect(Array.isArray(errs)).toBe(true);
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.length).toBeLessThanOrEqual(25);
  });

  it('block isiyofungwa (mwisho inakosekana) inarekodiwa, si crash', () => {
    const src = 'ikiwa a basi\n onyesha 1';
    const errs = diagnoseAll(src);
    expect(errs.length).toBeGreaterThanOrEqual(1);
    expect(errs[0]).toBeInstanceOf(SnilError);
  });

  it('kosa la kupima (lexer) linarudishwa kama kosa moja la "kupima"', () => {
    const src = 'onyesha "haijafungwa';
    const errs = diagnoseAll(src);
    expect(errs).toHaveLength(1);
    expect(errs[0].awamu).toBe('kupima');
  });
});

describe('formatErrors — fremu nyingi za Kiswahili', () => {
  it('inarudisha "" kwa makosa sifuri', () => {
    expect(formatErrors('weka x kuwa 1', [])).toBe('');
  });

  it('inatoa kichwa "Makosa N yamepatikana" kwa makosa mengi', () => {
    const src = 'weka a 1\nweka b 2';
    const errs = diagnoseAll(src);
    const out = formatErrors(src, errs);
    expect(out).toContain('Makosa 2 yamepatikana');
    // Kila fremu ina namba ya mstari + alama ya kuchanganua.
    expect(out).toContain('Mstari 1');
    expect(out).toContain('Mstari 2');
    // Kuna mtenganishi kati ya fremu.
    expect(out).toContain('──────────');
  });

  it('inatoa fremu N kwa makosa N', () => {
    const src = 'weka a 1\nweka b 2\nweka c 3';
    const errs = diagnoseAll(src);
    const out = formatErrors(src, errs);
    // Fremu tatu zimetenganishwa na mistari miwili ya mtenganishi.
    const seps = out.split('──────────').length - 1;
    expect(seps).toBe(errs.length - 1);
  });

  it('kosa moja → kichwa cha umoja, fremu moja, sawa na formatError', () => {
    const src = 'weka a 1';
    const errs = diagnoseAll(src);
    expect(errs).toHaveLength(1);
    const out = formatErrors(src, errs);
    expect(out).toContain('Kosa 1 limepatikana');
    expect(out).toContain(formatError(src, errs[0]));
  });

  it('fremu zimepangwa kwa namba ya mstari', () => {
    const src = 'weka a 1\nweka b 2';
    const errs = diagnoseAll(src);
    // Hata kama tutapeana kwa mpangilio tofauti, formatErrors inapanga kwa mstari.
    const out = formatErrors(src, [errs[1], errs[0]]);
    const i1 = out.indexOf('Mstari 1');
    const i2 = out.indexOf('Mstari 2');
    expect(i1).toBeLessThan(i2);
  });
});

describe('uoanifu wa nyuma (backward-compat): parse() haijabadilika', () => {
  it('parse() ya programu sahihi bado inafanya kazi', () => {
    const p = parse(tokenize('weka x kuwa 1'));
    expect(p.kind).toBe('Program');
    expect(p.body[0].kind).toBe('VarDecl');
  });

  it('parse() bado inatupa SnilError ya kwanza kwa programu yenye kosa', () => {
    let err: unknown;
    try { parse(tokenize('weka x 1\nweka y 2')); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(SnilError);
    expect((err as SnilError).line).toBe(1); // kosa la KWANZA tu
  });
});
