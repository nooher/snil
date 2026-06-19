// parser.test.ts — vitest. Hupima recursive-descent parser ya SNIL.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { tokenize } from './lexer';
import { parse } from './parser';
import { SnilError } from './errors';
import type {
  Program, VarDecl, If, FuncDecl, ForRange, Print, Binary, Assign,
} from './ast';

const parseSrc = (src: string): Program => parse(tokenize(src));
const ex = (name: string) => readFileSync(`examples/${name}.snil`, 'utf8');

describe('parser — mifano ya dhahabu', () => {
  it('huchanganua habari.snil bila kosa', () => {
    const p = parseSrc(ex('habari'));
    expect(p.kind).toBe('Program');
    expect(p.body[0].kind).toBe('Print');
  });

  it('huchanganua hesabu.snil bila kosa', () => {
    const p = parseSrc(ex('hesabu'));
    expect(p.body.some((s) => s.kind === 'FuncDecl')).toBe(true);
    expect(p.body.some((s) => s.kind === 'If')).toBe(true);
    expect(p.body.some((s) => s.kind === 'ForRange')).toBe(true);
  });

  it('huchanganua duka.snil bila kosa', () => {
    const p = parseSrc(ex('duka'));
    expect(p.body.some((s) => s.kind === 'ListAdd')).toBe(true);
    expect(p.body.some((s) => s.kind === 'ForEach')).toBe(true);
  });
});

describe('parser — umbo la AST', () => {
  it('weka x kuwa 1 → VarDecl', () => {
    const p = parseSrc('weka x kuwa 1');
    const d = p.body[0] as VarDecl;
    expect(d.kind).toBe('VarDecl');
    expect(d.name).toBe('x');
    expect(d.value).toMatchObject({ kind: 'NumberLit', value: 1 });
    expect(d.line).toBe(1);
  });

  it('ikiwa…vinginevyo…mwisho → If yenye matawi mawili', () => {
    const p = parseSrc('ikiwa a > b basi\n onyesha 1\nvinginevyo\n onyesha 2\nmwisho');
    const i = p.body[0] as If;
    expect(i.kind).toBe('If');
    expect(i.cond).toMatchObject({ kind: 'Binary', op: '>' });
    expect(i.then).toHaveLength(1);
    expect(i.otherwise).toHaveLength(1);
  });

  it('ikiwa bila vinginevyo → otherwise = null', () => {
    const p = parseSrc('ikiwa a basi\n onyesha 1\nmwisho');
    const i = p.body[0] as If;
    expect(i.otherwise).toBeNull();
  });

  it('kazi f(a,b) → FuncDecl yenye vigezo', () => {
    const p = parseSrc('kazi f(a, b)\n rudisha a + b\nmwisho');
    const f = p.body[0] as FuncDecl;
    expect(f.kind).toBe('FuncDecl');
    expect(f.params).toEqual(['a', 'b']);
    expect(f.body[0].kind).toBe('Return');
  });

  it('kwa kila n kutoka 1 hadi 3 → ForRange', () => {
    const p = parseSrc('kwa kila n kutoka 1 hadi 3\n onyesha n\nmwisho');
    const f = p.body[0] as ForRange;
    expect(f.kind).toBe('ForRange');
    expect(f.varName).toBe('n');
    expect(f.from).toMatchObject({ kind: 'NumberLit', value: 1 });
    expect(f.to).toMatchObject({ kind: 'NumberLit', value: 3 });
  });

  it('orodha na kamusi → ListLit / DictLit', () => {
    const list = (parseSrc('weka a kuwa [1, 2, 3]').body[0] as VarDecl).value;
    expect(list).toMatchObject({ kind: 'ListLit' });
    expect((list as any).items).toHaveLength(3);

    const dict = (parseSrc('weka m kuwa { jina: "Ali", umri: 20 }').body[0] as VarDecl).value;
    expect(dict).toMatchObject({ kind: 'DictLit' });
    expect((dict as any).entries[0]).toMatchObject({ key: 'jina' });
  });

  it('ufikiaji wa member na index', () => {
    const mem = (parseSrc('onyesha mteja.jina').body[0] as Print).value;
    expect(mem).toMatchObject({ kind: 'Member', name: 'jina' });

    const idx = (parseSrc('onyesha orodha[0]').body[0] as Print).value;
    expect(idx).toMatchObject({ kind: 'Index' });
  });

  it('a[i] = e → Assign yenye target ya Index', () => {
    const a = parseSrc('orodha[0] = 5').body[0] as Assign;
    expect(a.kind).toBe('Assign');
    expect(a.target.kind).toBe('Index');
  });
});

describe('parser — precedence', () => {
  it('2 + 3 * 4 hukusanya * kwa ndani', () => {
    const e = (parseSrc('weka x kuwa 2 + 3 * 4').body[0] as VarDecl).value as Binary;
    expect(e.op).toBe('+');
    expect(e.left).toMatchObject({ kind: 'NumberLit', value: 2 });
    expect(e.right).toMatchObject({ kind: 'Binary', op: '*' });
  });

  it('au < na < ulinganishi', () => {
    const e = (parseSrc('weka x kuwa a au b na c == d').body[0] as VarDecl).value as Binary;
    expect(e.op).toBe('au');
    expect(e.right).toMatchObject({ kind: 'Binary', op: 'na' });
    expect((e.right as Binary).right).toMatchObject({ kind: 'Binary', op: '==' });
  });
});

describe('parser — TemplateString (uingizaji wa misemo)', () => {
  it('"Habari {jina}!" → Print yenye TemplateString', () => {
    const p = parseSrc('onyesha "Habari {jina}!"');
    const pr = p.body[0] as Print;
    expect(pr.kind).toBe('Print');
    const t = pr.value as unknown as { kind: string; parts: unknown[] };
    expect(t.kind).toBe('TemplateString');
    expect(t.parts).toMatchObject([
      { t: 'lit', value: 'Habari ' },
      { t: 'expr', expr: { kind: 'Ident', name: 'jina' } },
      { t: 'lit', value: '!' },
    ]);
  });

  it('hunyambua msemo changamano ndani ya { }', () => {
    const p = parseSrc('onyesha "Jumla: {a + b}"');
    const t = (p.body[0] as Print).value as unknown as { parts: { t: string; expr?: Binary }[] };
    expect(t.parts[1].expr).toMatchObject({ kind: 'Binary', op: '+' });
  });

  it('hunyambua member access ndani ya { }', () => {
    const p = parseSrc('onyesha "{mtu.jina} ana miaka {mtu.umri}"');
    const t = (p.body[0] as Print).value as unknown as { parts: { t: string; expr?: { kind: string } }[] };
    // Leading "{…" yields an empty lit part first, then the expr.
    expect(t.parts[1].expr).toMatchObject({ kind: 'Member', name: 'jina' });
    expect(t.parts[3].expr).toMatchObject({ kind: 'Member', name: 'umri' });
  });

  it('maandishi bila { } hubaki StringLit (hakuna regression)', () => {
    const p = parseSrc('onyesha "Habari Dunia"');
    expect((p.body[0] as Print).value).toMatchObject({ kind: 'StringLit', value: 'Habari Dunia' });
  });

  it('reline: line ya msemo wa ndani = line ya maandishi', () => {
    const p = parseSrc('onyesha 1\nonyesha "x {a + b}"');
    const t = (p.body[1] as Print).value as unknown as { line: number; parts: { expr?: Binary }[] };
    expect(t.line).toBe(2);
    expect((t.parts[1].expr as Binary).line).toBe(2);
  });
});

describe('parser — makosa (Kiswahili)', () => {
  it('hutupa SnilError kwa tokeni isiyotarajiwa (weka bila kuwa)', () => {
    let err: unknown;
    try { parseSrc('weka x 1'); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(SnilError);
    expect((err as SnilError).awamu).toBe('kuchanganua');
    expect((err as SnilError).ujumbe).toMatch(/Ilitarajiwa/);
  });

  it('hutupa SnilError kwa mwisho unaokosekana', () => {
    let err: unknown;
    try { parseSrc('ikiwa a basi\n onyesha 1'); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(SnilError);
    expect((err as SnilError).awamu).toBe('kuchanganua');
    expect((err as SnilError).ujumbe).toMatch(/Ilitarajiwa/);
  });
});
