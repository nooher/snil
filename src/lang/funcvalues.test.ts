// funcvalues.test.ts — first-class functions in SNIL: function VALUES, anonymous
// `kazi(...)…mwisho` expressions (lambdas/closures), application of function
// values, and the higher-order builtins ramani / chuja / punguza. Covers the
// parser AST shape, the interpreter, AND cross-backend parity (interpreter ===
// Python === JS) so a generated-code difference can never change OUTPUT.
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tokenize } from './lexer';
import { parse } from './parser';
import { run, toPython, toJS } from './index';
import type { Program, FuncExpr, Call, Apply, VarDecl, Print } from './ast';

const parseSrc = (src: string): Program => parse(tokenize(src));

function runExt(code: string, ext: 'py' | 'mjs', bin: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'snil-fv-'));
  const file = join(dir, `prog.${ext}`);
  writeFileSync(file, code, 'utf-8');
  return execFileSync(bin, [file], { encoding: 'utf-8' })
    .split(/\r?\n/).map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\s+$/, '');
}

/** Assert interpreter === Python === JS and return that shared output. */
function parity(src: string): string {
  const interp = run(src);
  expect(interp.error, interp.error?.message).toBeNull();
  const out = interp.output.replace(/\s+$/, '');
  expect(runExt(toPython(src), 'py', 'python')).toBe(out);
  expect(runExt(toJS(src), 'mjs', 'node')).toBe(out);
  return out;
}

// ───────────────────────── Parser ─────────────────────────
describe('parser — first-class functions', () => {
  it('anonymous kazi(...) is a FuncExpr value', () => {
    const p = parseSrc('weka f kuwa kazi(x) rudisha x * 2 mwisho');
    const d = p.body[0] as VarDecl;
    expect(d.kind).toBe('VarDecl');
    const fx = d.value as FuncExpr;
    expect(fx.kind).toBe('FuncExpr');
    expect(fx.params).toEqual(['x']);
    expect(fx.body[0].kind).toBe('Return');
  });

  it('named kazi IDENT(...) is still a FuncDecl statement', () => {
    const p = parseSrc('kazi mraba(x)\n rudisha x * x\nmwisho');
    expect(p.body[0].kind).toBe('FuncDecl');
  });

  it('bare identifier of a named kazi parses as an Ident value (passable)', () => {
    const p = parseSrc('onyesha ramani(seti, mraba)');
    const call = (p.body[0] as Print).value as Call;
    expect(call.kind).toBe('Call');
    expect(call.callee).toBe('ramani');
    expect(call.args[1]).toMatchObject({ kind: 'Ident', name: 'mraba' });
  });

  it('multi-param lambda parses with all params', () => {
    const p = parseSrc('weka f kuwa kazi(a, b, c) rudisha a + b + c mwisho');
    const fx = (p.body[0] as VarDecl).value as FuncExpr;
    expect(fx.params).toEqual(['a', 'b', 'c']);
  });

  it('applying a non-name function value produces an Apply node', () => {
    const p = parseSrc('onyesha (kazi(a, b) rudisha a + b mwisho)(4, 5)');
    const apply = (p.body[0] as Print).value as Apply;
    expect(apply.kind).toBe('Apply');
    expect(apply.fn.kind).toBe('FuncExpr');
    expect(apply.args).toHaveLength(2);
  });

  it('calling a variable that holds a function uses the Call fast path', () => {
    const p = parseSrc('onyesha f(3)');
    expect(((p.body[0] as Print).value as Call).kind).toBe('Call');
  });
});

// ───────────────────────── Interpreter ─────────────────────────
describe('interpreter — first-class functions', () => {
  const out = (src: string) => { const r = run(src); expect(r.error, r.error?.message).toBeNull(); return r.output; };

  it('a named kazi is a value passable to ramani', () => {
    expect(out('kazi mraba(x)\n rudisha x * x\nmwisho\nonyesha ramani([1, 2, 3], mraba)'))
      .toBe('[1, 4, 9]');
  });

  it('an anonymous lambda maps over a list', () => {
    expect(out('onyesha ramani([1, 2, 3], kazi(x) rudisha x + 1 mwisho)')).toBe('[2, 3, 4]');
  });

  it('chuja keeps truthy results (SNIL truthiness)', () => {
    expect(out('onyesha chuja([0, 1, 2, 0, 3], kazi(x) rudisha x mwisho)')).toBe('[1, 2, 3]');
  });

  it('punguza folds with a starting accumulator', () => {
    expect(out('onyesha punguza([1, 2, 3, 4], kazi(a, x) rudisha a + x mwisho, 100)')).toBe('110');
  });

  it('a lambda closes over an outer variable', () => {
    expect(out('weka k kuwa 7\nweka f kuwa kazi(x) rudisha x + k mwisho\nonyesha f(10)')).toBe('17');
  });

  it('a function value stored in a variable is callable with f(...)', () => {
    expect(out('weka f kuwa kazi(x) rudisha x * 3 mwisho\nonyesha f(4)')).toBe('12');
  });

  it('an immediately-applied lambda works (Apply)', () => {
    expect(out('onyesha (kazi(a, b) rudisha a * b mwisho)(6, 7)')).toBe('42');
  });

  it('a lambda can be returned from a function (closure factory)', () => {
    const src = [
      'kazi ongeza_kwa(n)',
      '    rudisha kazi(x) rudisha x + n mwisho',
      'mwisho',
      'weka ongeza5 kuwa ongeza_kwa(5)',
      'onyesha ongeza5(10)',
    ].join('\n');
    expect(out(src)).toBe('15');
  });

  it('calling a non-function value is a Kiswahili error', () => {
    const r = run('weka x kuwa 5\nonyesha (x)(3)');
    expect(r.error).not.toBeNull();
  });
});

// ───────────────────────── Cross-backend parity ─────────────────────────
describe('first-class functions — interpreter === python === js', () => {
  it('ramani with a named function value', () => {
    expect(parity('kazi mraba(x)\n rudisha x * x\nmwisho\nonyesha ramani([1, 2, 3, 4], mraba)'))
      .toBe('[1, 4, 9, 16]');
  });

  it('chuja with an anonymous predicate', () => {
    expect(parity('onyesha chuja([1, 2, 3, 4, 5, 6], kazi(x) rudisha x % 2 == 0 mwisho)'))
      .toBe('[2, 4, 6]');
  });

  it('punguza summing a list', () => {
    expect(parity('onyesha punguza([1, 2, 3, 4, 5], kazi(a, x) rudisha a + x mwisho, 0)')).toBe('15');
  });

  it('closure over an outer variable agrees across backends', () => {
    const src = [
      'weka nyongeza kuwa 100',
      'onyesha ramani([1, 2, 3], kazi(x) rudisha x + nyongeza mwisho)',
    ].join('\n');
    expect(parity(src)).toBe('[101, 102, 103]');
  });

  it('immediately-applied lambda + stored function value agree', () => {
    const src = [
      'weka mara2 kuwa kazi(x) rudisha x * 2 mwisho',
      'onyesha mara2(21)',
      'onyesha (kazi(a, b) rudisha a + b mwisho)(40, 2)',
    ].join('\n');
    expect(parity(src)).toBe('42\n42');
  });

  it('nested higher-order ops (ramani over chuja) agree', () => {
    const src = [
      'weka seti kuwa [1, 2, 3, 4, 5, 6]',
      'weka shufwa kuwa chuja(seti, kazi(x) rudisha x % 2 == 0 mwisho)',
      'onyesha ramani(shufwa, kazi(x) rudisha x * 10 mwisho)',
    ].join('\n');
    expect(parity(src)).toBe('[20, 40, 60]');
  });
});
