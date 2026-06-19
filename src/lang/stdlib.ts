// stdlib.ts — SNIL's standard library for the interpreter. Modules are loaded with
// `leta` (import). Calling convention: `leta X` COPIES module X's functions into a
// flat builtin namespace, so after `leta hisabati` you call `jumla(orodha)` directly
// (no `hisabati.jumla`). This keeps programs teachable and reads naturally in
// Kiswahili. `idadi` is a global builtin available without any `leta`.
//
// Shape: STDLIB[module][func] = (args, io) => value
import type { SnilIO } from './runtime';
import { SnilError, Makosa } from './errors';

export type NativeFn = (args: unknown[], io: SnilIO) => unknown;

// ───────────────────────── small helpers ─────────────────────────
function asNumber(v: unknown, fnName: string): number {
  if (typeof v !== 'number') {
    throw Makosa.ainaMbaya(`Kazi "${fnName}" inahitaji namba.`, 0);
  }
  return v;
}

function asString(v: unknown, fnName: string): string {
  if (typeof v !== 'string') {
    throw Makosa.ainaMbaya(`Kazi "${fnName}" inahitaji maandishi.`, 0);
  }
  return v;
}

/** Collect a numeric list: either jumla([1,2,3]) or jumla(1,2,3). */
function numberList(args: unknown[], fnName: string): number[] {
  let raw: unknown[];
  if (args.length === 1 && Array.isArray(args[0])) {
    raw = args[0] as unknown[];
  } else {
    raw = args;
  }
  return raw.map((x) => asNumber(x, fnName));
}

// ───────────────────────── modules ─────────────────────────
export const STDLIB: Record<string, Record<string, NativeFn>> = {
  hisabati: {
    // jumla: sum of a list OR of args.
    jumla: (args) => numberList(args, 'jumla').reduce((a, b) => a + b, 0),
    // wastani: arithmetic mean.
    wastani: (args) => {
      const nums = numberList(args, 'wastani');
      if (nums.length === 0) throw Makosa.ainaMbaya('Kazi "wastani" inahitaji angalau namba moja.', 0);
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    },
    kiwango_cha_juu: (args) => {
      const nums = numberList(args, 'kiwango_cha_juu');
      if (nums.length === 0) throw Makosa.ainaMbaya('Kazi "kiwango_cha_juu" inahitaji angalau namba moja.', 0);
      return Math.max(...nums);
    },
    kiwango_cha_chini: (args) => {
      const nums = numberList(args, 'kiwango_cha_chini');
      if (nums.length === 0) throw Makosa.ainaMbaya('Kazi "kiwango_cha_chini" inahitaji angalau namba moja.', 0);
      return Math.min(...nums);
    },
    mzizi: (args) => {
      const n = asNumber(args[0], 'mzizi');
      if (n < 0) throw Makosa.ainaMbaya('Kazi "mzizi" haiwezi kuchukua mzizi wa namba hasi.', 0);
      return Math.sqrt(n);
    },
  },

  maandishi: {
    herufi_kubwa: (args) => asString(args[0], 'herufi_kubwa').toUpperCase(),
    herufi_ndogo: (args) => asString(args[0], 'herufi_ndogo').toLowerCase(),
    // unganisha(orodha, kitenganishi) → join.
    unganisha: (args) => {
      const list = args[0];
      if (!Array.isArray(list)) throw Makosa.ainaMbaya('Kazi "unganisha" inahitaji orodha.', 0);
      const sep = args.length > 1 ? asString(args[1], 'unganisha') : '';
      return list.map((x) => stringifyForJoin(x)).join(sep);
    },
    // gawanya(maandishi, kitenganishi) → split.
    gawanya: (args) => {
      const s = asString(args[0], 'gawanya');
      const sep = args.length > 1 ? asString(args[1], 'gawanya') : '';
      return sep === '' ? s.split('') : s.split(sep);
    },
  },

  // NOTE: muda reads the real clock — non-deterministic, so golden tests avoid it.
  muda: {
    sasa: () => new Date().toISOString(),
    leo: () => new Date().toISOString().slice(0, 10),
    mwaka: () => new Date().getFullYear(),
    mwezi: () => new Date().getMonth() + 1, // 1-based month
    siku: () => new Date().getDate(),
  },

  faili: {
    soma: (args, io) => {
      const path = asString(args[0], 'soma');
      if (!io.somaFaili) throw new SnilError('Usomaji wa faili haupatikani katika mazingira haya.', 0, 'kutekeleza');
      return io.somaFaili(path);
    },
    andika: (args, io) => {
      const path = asString(args[0], 'andika');
      const data = args.length > 1 ? String(args[1]) : '';
      if (!io.andikaFaili) throw new SnilError('Uandishi wa faili haupatikani katika mazingira haya.', 0, 'kutekeleza');
      io.andikaFaili(path, data);
      return null;
    },
    ipo: (args, io) => {
      const path = asString(args[0], 'ipo');
      if (!io.somaFaili) return false;
      try {
        io.somaFaili(path);
        return true;
      } catch {
        return false;
      }
    },
    futa: (args, io) => {
      const path = asString(args[0], 'futa');
      // Virtual delete = write empty content (no separate delete hook in SnilIO).
      if (io.andikaFaili) io.andikaFaili(path, '');
      return null;
    },
  },
};

/** Length of a list or string — available globally, no `leta` needed. */
export const BUILTINS: Record<string, NativeFn> = {
  idadi: (args) => {
    const v = args[0];
    if (Array.isArray(v) || typeof v === 'string') return v.length;
    throw Makosa.ainaMbaya('Kazi "idadi" inahitaji orodha au maandishi.', 0);
  },
};

// Minimal display for join (mirrors interpreter display rules for primitives).
function stringifyForJoin(v: unknown): string {
  if (v === null || v === undefined) return 'tupu';
  if (v === true) return 'kweli';
  if (v === false) return 'si_kweli';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v;
  return String(v);
}
