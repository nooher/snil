// lexer.test.ts — vitest. Hupima tokenizer ya SNIL.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { tokenize } from './lexer';
import { T } from './tokens';
import { SnilError } from './errors';

const ex = (name: string) => readFileSync(`examples/${name}.snil`, 'utf8');

describe('lexer — mifano ya dhahabu', () => {
  it('hutokeniza habari.snil bila kosa', () => {
    const toks = tokenize(ex('habari'));
    expect(toks[toks.length - 1].type).toBe(T.EOF);
    expect(toks.some((t) => t.type === T.ONYESHA)).toBe(true);
    expect(toks.some((t) => t.type === T.STRING && t.value === 'Habari Dunia')).toBe(true);
  });

  it('hutokeniza hesabu.snil bila kosa', () => {
    const toks = tokenize(ex('hesabu'));
    expect(toks[toks.length - 1].type).toBe(T.EOF);
    expect(toks.some((t) => t.type === T.KAZI)).toBe(true);
    expect(toks.some((t) => t.type === T.IKIWA)).toBe(true);
  });

  it('hutokeniza duka.snil bila kosa', () => {
    const toks = tokenize(ex('duka'));
    expect(toks[toks.length - 1].type).toBe(T.EOF);
    expect(toks.some((t) => t.type === T.LBRACKET)).toBe(true);
    expect(toks.some((t) => t.type === T.LBRACE)).toBe(true);
  });
});

describe('lexer — aina za tokeni', () => {
  it('hutoa aina sahihi kwa kipande kidogo', () => {
    const toks = tokenize('weka x kuwa 3.14');
    expect(toks.map((t) => t.type)).toEqual([
      T.WEKA, T.IDENT, T.KUWA, T.NUMBER, T.EOF,
    ]);
    expect(toks[1].value).toBe('x');
    expect(toks[3].value).toBe('3.14');
  });

  it('hutambua si_kweli kama tokeni moja SIKWELI', () => {
    const toks = tokenize('si_kweli kweli tupu');
    expect(toks.map((t) => t.type)).toEqual([T.SIKWELI, T.KWELI, T.TUPU, T.EOF]);
  });

  it('hushughulikia waendeshaji wa herufi mbili', () => {
    const toks = tokenize('a == b != c <= d >= e');
    const types = toks.map((t) => t.type);
    expect(types).toContain(T.EQ);
    expect(types).toContain(T.NEQ);
    expect(types).toContain(T.LTE);
    expect(types).toContain(T.GTE);
  });

  it('hushughulikia escapes katika maandishi', () => {
    const toks = tokenize('"safu\\nmstari\\t\\"nukuu\\"\\\\"');
    expect(toks[0].type).toBe(T.STRING);
    expect(toks[0].value).toBe('safu\nmstari\t"nukuu"\\');
  });

  it('huruka maoni ya mstari na ya mistari mingi', () => {
    const toks = tokenize('# maoni\n### block\nmingi ###\nonyesha 1');
    expect(toks.map((t) => t.type)).toEqual([T.ONYESHA, T.NUMBER, T.EOF]);
  });

  it('hukunja mistari mitupu na haitoi NEWLINE inayoongoza/funga', () => {
    const toks = tokenize('\n\nonyesha 1\n\n\nonyesha 2\n\n');
    expect(toks.map((t) => t.type)).toEqual([
      T.ONYESHA, T.NUMBER, T.NEWLINE, T.ONYESHA, T.NUMBER, T.EOF,
    ]);
  });

  it('hufuatilia mstari na safu (1-based)', () => {
    const toks = tokenize('onyesha\n  x');
    const xTok = toks.find((t) => t.type === T.IDENT)!;
    expect(xTok.line).toBe(2);
    expect(xTok.col).toBe(3);
  });
});

describe('lexer — uingizaji wa misemo katika maandishi (string interpolation)', () => {
  it('maandishi bila { } hubaki STRING ya kawaida (hakuna regression)', () => {
    const toks = tokenize('onyesha "Habari Dunia"');
    expect(toks[1].type).toBe(T.STRING);
    expect(toks[1].value).toBe('Habari Dunia');
    expect(toks[1].parts).toBeUndefined();
  });

  it('maandishi yenye { } huwa TEMPLATE yenye sehemu (parts)', () => {
    const toks = tokenize('onyesha "Habari {jina}!"');
    const tpl = toks[1];
    expect(tpl.type).toBe(T.TEMPLATE);
    expect(tpl.parts).toEqual([
      { t: 'lit', value: 'Habari ' },
      { t: 'expr', src: 'jina', line: 1 },
      { t: 'lit', value: '!' },
    ]);
  });

  it('hunasa msemo changamano ndani ya { }', () => {
    const toks = tokenize('onyesha "Jumla: {a + b}"');
    const tpl = toks[1];
    expect(tpl.type).toBe(T.TEMPLATE);
    expect(tpl.parts![1]).toEqual({ t: 'expr', src: 'a + b', line: 1 });
  });

  it('\\{ na \\} ni alama halisi (si uingizaji) → STRING ya kawaida', () => {
    const toks = tokenize('onyesha "\\{si interpolation\\}"');
    expect(toks[1].type).toBe(T.STRING);
    expect(toks[1].value).toBe('{si interpolation}');
  });

  it('hupuuza } iliyo nje ya uingizaji (alama halisi)', () => {
    const toks = tokenize('onyesha "funga} hapa"');
    expect(toks[1].type).toBe(T.STRING);
    expect(toks[1].value).toBe('funga} hapa');
  });

  it('hunasa nukuu ndani ya msemo wa uingizaji bila kuvunja', () => {
    const toks = tokenize('onyesha "Salamu {herufi_kubwa("asha")}"');
    const tpl = toks[1];
    expect(tpl.type).toBe(T.TEMPLATE);
    expect(tpl.parts![1]).toEqual({ t: 'expr', src: 'herufi_kubwa("asha")', line: 1 });
  });

  it('hutupa kosa kwa { } tupu', () => {
    let err: unknown;
    try { tokenize('onyesha "{}"'); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(SnilError);
    expect((err as SnilError).awamu).toBe('kupima');
  });

  it('hutupa kosa kwa { isiyofungwa', () => {
    let err: unknown;
    try { tokenize('onyesha "Habari {jina"'); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(SnilError);
  });
});

describe('lexer — makosa (Kiswahili)', () => {
  it('hutupa SnilError kwa herufi isiyojulikana', () => {
    let err: unknown;
    try { tokenize('weka x kuwa @'); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(SnilError);
    expect((err as SnilError).awamu).toBe('kupima');
    expect((err as SnilError).ujumbe).toMatch(/Herufi isiyotambulika/);
  });

  it('hutupa SnilError kwa maandishi yasiyofungwa', () => {
    let err: unknown;
    try { tokenize('onyesha "habari'); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(SnilError);
    expect((err as SnilError).ujumbe).toMatch(/Maandishi hayajafungwa/);
  });
});
