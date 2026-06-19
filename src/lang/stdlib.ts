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

function asList(v: unknown, fnName: string): unknown[] {
  if (!Array.isArray(v)) {
    throw Makosa.ainaMbaya(`Kazi "${fnName}" inahitaji orodha.`, 0);
  }
  return v;
}

/** A whole-number index/count (no decimals, no bool). */
function asInt(v: unknown, fnName: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v)) {
    throw Makosa.ainaMbaya(`Kazi "${fnName}" inahitaji namba kamili.`, 0);
  }
  return v;
}

/** SNIL deep equality — mirrors interpreter/_eq (deep for lists/dicts). */
function snilEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => snilEq(x, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const ka = Object.keys(a as object), kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k)
      && snilEq((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

/** Clamp a slice bound into [0, len] (negatives → 0; over → len). */
function clampBound(i: number, len: number): number {
  if (i < 0) return 0;
  if (i > len) return len;
  return i;
}

/** Round x to dp decimal places, half away-from-zero, identical across backends. */
function roundHalfUp(x: number, dp: number): number {
  const f = Math.pow(10, dp);
  const r = Math.round(Math.abs(x) * f) / f;
  return x < 0 ? -r : r;
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
    // kipeo(msingi, kipeo) → msingi ^ kipeo (power).
    kipeo: (args) => {
      const base = asNumber(args[0], 'kipeo');
      const exp = asNumber(args[1], 'kipeo');
      return Math.pow(base, exp);
    },
    // kipeo_cha_pili(x) → x mraba (x squared).
    kipeo_cha_pili: (args) => {
      const x = asNumber(args[0], 'kipeo_cha_pili');
      return x * x;
    },
    // salio(a, b) → baki ya mgawanyo (a mod b). Kosa ikiwa b ni sifuri.
    salio: (args) => {
      const a = asNumber(args[0], 'salio');
      const b = asNumber(args[1], 'salio');
      if (b === 0) throw Makosa.ainaMbaya('Kazi "salio" haiwezi kugawanya kwa sifuri.', 0);
      return a % b;
    },
    // mviringo(x, dp) → zungusha hadi sehemu dp za desimali (nusu → juu).
    mviringo: (args) => {
      const x = asNumber(args[0], 'mviringo');
      const dp = asInt(args[1], 'mviringo');
      if (dp < 0) throw Makosa.ainaMbaya('Kazi "mviringo" inahitaji idadi ya desimali isiyo hasi.', 0);
      return roundHalfUp(x, dp);
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
    // ina(maneno, sehemu) → je, maneno yana sehemu? (contains, bool).
    ina: (args) => {
      const s = asString(args[0], 'ina');
      const part = asString(args[1], 'ina');
      return s.includes(part);
    },
    // badilisha(maneno, ya_zamani, mpya) → badilisha matukio yote (replace all).
    badilisha: (args) => {
      const s = asString(args[0], 'badilisha');
      const old = asString(args[1], 'badilisha');
      const neu = asString(args[2], 'badilisha');
      return s.split(old).join(neu);
    },
    // ondoa_nafasi(maneno) → ondoa nafasi za mwanzo na mwisho (trim).
    ondoa_nafasi: (args) => asString(args[0], 'ondoa_nafasi').trim(),
    // anza_na(s, x) → je, s inaanza na x? (starts-with, kweli/si_kweli).
    anza_na: (args) => {
      const s = asString(args[0], 'anza_na');
      const x = asString(args[1], 'anza_na');
      return s.startsWith(x);
    },
    // isha_na(s, x) → je, s inaishia na x? (ends-with, kweli/si_kweli).
    isha_na: (args) => {
      const s = asString(args[0], 'isha_na');
      const x = asString(args[1], 'isha_na');
      return s.endsWith(x);
    },
    // pata(s, x) → fahirisi ya kwanza ya x ndani ya s (0-based, -1 ikiwa haipo).
    pata: (args) => {
      const s = asString(args[0], 'pata');
      const x = asString(args[1], 'pata');
      return s.indexOf(x);
    },
    // rudia(s, n) → rudia s mara n. n lazima iwe kamili isiyo hasi.
    rudia: (args) => {
      const s = asString(args[0], 'rudia');
      const n = asInt(args[1], 'rudia');
      if (n < 0) throw Makosa.ainaMbaya('Kazi "rudia" inahitaji idadi isiyo hasi.', 0);
      return s.repeat(n);
    },
    // kata(s, anza, mwisho) → sehemu ya maandishi [anza, mwisho) (mipaka kamili,
    // hasi → 0, kubwa kupita → urefu; anza > mwisho → tupu "").
    kata: (args) => {
      const s = asString(args[0], 'kata');
      const anza = asInt(args[1], 'kata');
      const mwisho = asInt(args[2], 'kata');
      const a = clampBound(anza, s.length);
      const b = clampBound(mwisho, s.length);
      return a >= b ? '' : s.slice(a, b);
    },
  },

  orodha: {
    // panga(orodha) → nakala iliyopangwa kwa kupanda (sorted copy, ascending).
    // Namba hupangwa kihisabati; maandishi hupangwa kialfabeti. Orodha lazima iwe
    // ya aina moja (yote namba AU yote maandishi).
    panga: (args) => {
      const list = args[0];
      if (!Array.isArray(list)) throw Makosa.ainaMbaya('Kazi "panga" inahitaji orodha.', 0);
      const copy = list.slice();
      const allNum = copy.every((x) => typeof x === 'number');
      const allStr = copy.every((x) => typeof x === 'string');
      if (!allNum && !allStr) {
        throw Makosa.ainaMbaya('Kazi "panga" inahitaji orodha ya namba pekee au maandishi pekee.', 0);
      }
      if (allNum) {
        copy.sort((a, b) => (a as number) - (b as number));
      } else {
        copy.sort((a, b) => ((a as string) < (b as string) ? -1 : (a as string) > (b as string) ? 1 : 0));
      }
      return copy;
    },
    // geuza(orodha) → nakala iliyopinduliwa (reversed copy).
    geuza: (args) => {
      const list = args[0];
      if (!Array.isArray(list)) throw Makosa.ainaMbaya('Kazi "geuza" inahitaji orodha.', 0);
      return list.slice().reverse();
    },
    // ina(orodha, kitu) → je, orodha ina kitu? (contains, bool).
    ina: (args) => {
      const list = args[0];
      if (!Array.isArray(list)) throw Makosa.ainaMbaya('Kazi "ina" inahitaji orodha.', 0);
      return list.some((x) => snilEq(x, args[1]));
    },
    // chukua(orodha, anza, mwisho) → nakala ya sehemu [anza, mwisho) (mipaka kamili,
    // hasi → 0, kubwa kupita → urefu; anza > mwisho → orodha tupu).
    chukua: (args) => {
      const list = asList(args[0], 'chukua');
      const anza = asInt(args[1], 'chukua');
      const mwisho = asInt(args[2], 'chukua');
      const a = clampBound(anza, list.length);
      const b = clampBound(mwisho, list.length);
      return a >= b ? [] : list.slice(a, b);
    },
    // fahirisi(orodha, kitu) → fahirisi ya kwanza ya kitu (0-based, -1 ikiwa haipo).
    fahirisi: (args) => {
      const list = asList(args[0], 'fahirisi');
      return list.findIndex((x) => snilEq(x, args[1]));
    },
    // unganisha_mbili(a, b) → orodha MPYA ya a ikifuatwa na b (haibadilishi za asili).
    unganisha_mbili: (args) => {
      const a = asList(args[0], 'unganisha_mbili');
      const b = asList(args[1], 'unganisha_mbili');
      return a.concat(b);
    },
    // kichwa(orodha) → kipengele cha kwanza (kosa ikiwa orodha ni tupu).
    kichwa: (args) => {
      const list = asList(args[0], 'kichwa');
      if (list.length === 0) throw Makosa.ainaMbaya('Kazi "kichwa" inahitaji orodha isiyo tupu.', 0);
      return list[0];
    },
    // mkia(orodha) → nakala MPYA ya orodha bila kipengele cha kwanza.
    mkia: (args) => {
      const list = asList(args[0], 'mkia');
      if (list.length === 0) throw Makosa.ainaMbaya('Kazi "mkia" inahitaji orodha isiyo tupu.', 0);
      return list.slice(1);
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

/** Global builtins — available everywhere, no `leta` needed. */
export const BUILTINS: Record<string, NativeFn> = {
  idadi: (args) => {
    const v = args[0];
    if (Array.isArray(v) || typeof v === 'string') return v.length;
    throw Makosa.ainaMbaya('Kazi "idadi" inahitaji orodha au maandishi.', 0);
  },
  // namba(x) → geuza kuwa namba (string/number → number).
  namba: (args) => {
    const v = args[0];
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const t = v.trim();
      const n = Number(t);
      if (t === '' || Number.isNaN(n)) {
        throw Makosa.ainaMbaya(`Kazi "namba" haiwezi kugeuza "${v}" kuwa namba.`, 0);
      }
      return n;
    }
    throw Makosa.ainaMbaya('Kazi "namba" inahitaji maandishi au namba.', 0);
  },
  // maandishi(x) → mfuatano wa kuonyesha wa SNIL (SNIL display string of x).
  maandishi: (args) => snilDisplay(args[0]),
  // mzunguko(x) → karibu na nambari kamili (round to nearest integer).
  mzunguko: (args) => Math.round(asNumber(args[0], 'mzunguko')),
  // kamili(x) → thamani kamili / chanya (absolute value).
  kamili: (args) => Math.abs(asNumber(args[0], 'kamili')),
};

// Full SNIL display string — mirrors interpreter displayString rules:
// ints have no ".0", kweli/si_kweli/tupu, lists [a, b, c], dicts {k: v}.
function snilDisplay(v: unknown): string {
  if (v === null || v === undefined) return 'tupu';
  if (v === true) return 'kweli';
  if (v === false) return 'si_kweli';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return '[' + v.map(snilDisplay).join(', ') + ']';
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>);
    return '{' + entries.map(([k, val]) => `${k}: ${snilDisplay(val)}`).join(', ') + '}';
  }
  return String(v);
}

// Minimal display for join (mirrors interpreter display rules for primitives).
function stringifyForJoin(v: unknown): string {
  return snilDisplay(v);
}
