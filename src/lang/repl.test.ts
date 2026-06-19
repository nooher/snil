// repl.test.ts — the interactive Jaribio session. State must persist across
// `eval` calls, bare expressions return their displayed value, and an error on
// one line must NOT poison the next.
import { describe, it, expect } from 'vitest';
import { createReplSession } from './index';

describe('createReplSession — persistent state', () => {
  it('keeps variables across lines (weka then onyesha)', () => {
    const s = createReplSession();
    expect(s.eval('weka x kuwa 5').error).toBeNull();
    const r = s.eval('onyesha x');
    expect(r.error).toBeNull();
    expect(r.output).toBe('5');
  });

  it('keeps user functions across lines', () => {
    const s = createReplSession();
    s.eval('kazi mara2(n)\n    rudisha n * 2\nmwisho');
    const r = s.eval('mara2(21)');
    expect(r.error).toBeNull();
    expect(r.value).toBe('42');
  });

  it('persists imported stdlib (leta) across lines', () => {
    const s = createReplSession();
    expect(s.eval('leta hisabati').error).toBeNull();
    const r = s.eval('mzizi(81)');
    expect(r.error).toBeNull();
    expect(r.value).toBe('9');
  });
});

describe('createReplSession — bare expressions', () => {
  it('returns the displayed value of an arithmetic expression', () => {
    const s = createReplSession();
    const r = s.eval('2 + 3');
    expect(r.error).toBeNull();
    expect(r.value).toBe('5');
    expect(r.output).toBe(''); // nothing went through onyesha
  });

  it('returns the displayed value of a bare identifier', () => {
    const s = createReplSession();
    s.eval('weka jina kuwa "Asha"');
    const r = s.eval('jina');
    expect(r.value).toBe('Asha');
  });

  it('leaves value undefined for a statement', () => {
    const s = createReplSession();
    const r = s.eval('weka y kuwa 10');
    expect(r.value).toBeUndefined();
    expect(r.error).toBeNull();
  });
});

describe('createReplSession — error resilience', () => {
  it('returns a Kiswahili error but keeps the session alive', () => {
    const s = createReplSession();
    const bad = s.eval('onyesha haipo');
    expect(bad.error).not.toBeNull();
    expect(bad.error!.toString()).toContain('halijatambulika');
    // Next line still evaluates fine.
    const ok = s.eval('onyesha 1 + 1');
    expect(ok.error).toBeNull();
    expect(ok.output).toBe('2');
  });

  it('survives a runtime error (division by zero) and continues', () => {
    const s = createReplSession();
    s.eval('weka n kuwa 4');
    const bad = s.eval('onyesha n / 0');
    expect(bad.error).not.toBeNull();
    const ok = s.eval('onyesha n');
    expect(ok.output).toBe('4');
  });
});

describe('createReplSession — onyesha capture', () => {
  it('captures onyesha output for the line', () => {
    const s = createReplSession();
    const r = s.eval('onyesha "Habari"');
    expect(r.output).toBe('Habari');
    expect(r.value).toBeUndefined();
  });

  it('captures multiple onyesha lines from one multi-statement input', () => {
    const s = createReplSession();
    const r = s.eval('onyesha 1\nonyesha 2');
    expect(r.output).toBe('1\n2');
  });
});
