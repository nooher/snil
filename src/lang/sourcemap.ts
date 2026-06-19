// sourcemap.ts — SNIL source maps. SNIL is its own language compiled to Python
// and JavaScript; a source map lets a target-side line number (in the generated
// Python/JS) be traced back to the ORIGINAL SNIL source line you wrote — so an
// error in the compiled program can point at the Kiswahili you authored, not at
// machine-emitted target code.
//
// Granularity is LINE-LEVEL (column 0). Every generated target line records the
// 1-based SNIL source line it originated from (0 = prelude / synthetic line with
// no SNIL origin). We expose BOTH:
//   • a simple `lines: number[]`  — index = (targetLine-1), value = SNIL line
//   • a standard Source Map v3 object (version 3, VLQ `mappings`) for tooling.

/** A line-level entry: a 1-based target line maps to a 1-based SNIL source line. */
export interface SourceMapEntry { target: number; source: number; }

/** Standard Source Map v3 shape (the subset SNIL emits). */
export interface SourceMapV3 {
  version: 3;
  file?: string;
  sources: string[];
  sourcesContent?: (string | null)[];
  names: string[];
  mappings: string;
}

/**
 * A SNIL source map. `lines[i]` is the 1-based SNIL source line that generated
 * the 1-based target line `i + 1` (0 = no SNIL origin, e.g. the runtime prelude).
 * `entries` is the same data in {target, source} form (only lines that DO map to
 * a real SNIL line, target order). `v3` is the tooling-compatible standard object.
 */
export interface SourceMap {
  /** 1-based target line → 1-based SNIL line. Index 0 is target line 1. */
  lines: number[];
  /** Only real mappings (source > 0), in target order. */
  entries: SourceMapEntry[];
  /** Standard Source Map v3 object (VLQ-encoded line-level mappings). */
  v3: SourceMapV3;
}

// ───────────────────────── Base64 VLQ ─────────────────────────
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Encode a single signed integer as a Base64 VLQ string (Source Map v3). */
export function encodeVLQ(value: number): string {
  let vlq = value < 0 ? ((-value) << 1) | 1 : value << 1;
  let out = '';
  do {
    let digit = vlq & 0b11111;
    vlq >>>= 5;
    if (vlq > 0) digit |= 0b100000; // continuation bit
    out += B64[digit];
  } while (vlq > 0);
  return out;
}

/** Decode a Base64 VLQ string into the list of signed integers it encodes. */
export function decodeVLQ(str: string): number[] {
  const out: number[] = [];
  let shift = 0;
  let value = 0;
  for (const ch of str) {
    const digit = B64.indexOf(ch);
    if (digit < 0) throw new Error(`Alama ya VLQ isiyo sahihi: "${ch}"`);
    const cont = digit & 0b100000;
    value += (digit & 0b11111) << shift;
    if (cont) {
      shift += 5;
    } else {
      const negative = value & 1;
      value >>= 1;
      out.push(negative ? -value : value);
      shift = 0;
      value = 0;
    }
  }
  return out;
}

/**
 * Build a SourceMap from a parallel array of source lines, one per emitted target
 * line. `srcOfTarget[i]` is the 1-based SNIL line for target line `i + 1` (0 = no
 * origin). `sourceName` is the logical SNIL file name; `content` (optional) inlines
 * the SNIL source into the v3 map (sourcesContent).
 */
export function buildSourceMap(
  srcOfTarget: number[],
  sourceName = 'main.snil',
  content?: string,
): SourceMap {
  const lines = srcOfTarget.slice();
  const entries: SourceMapEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] > 0) entries.push({ target: i + 1, source: lines[i] });
  }

  // v3 mappings: one ';'-separated group per target line. Each mapped segment is
  // [genCol, sourceIndex, srcLine, srcCol], all VLQ + RELATIVE to the previous
  // segment. We emit line-level only (genCol 0, srcCol 0). Source index is always
  // 0 (single source). Unmapped target lines get an empty group (just ';').
  let prevSrcLine = 0; // 0-based, relative state across the whole file
  const groups: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const snil = lines[i];
    if (snil > 0) {
      const srcLine0 = snil - 1;            // v3 lines are 0-based
      const seg =
        encodeVLQ(0) +                       // generated column (0)
        encodeVLQ(0) +                       // source index (0)
        encodeVLQ(srcLine0 - prevSrcLine) +  // source line (relative)
        encodeVLQ(0);                        // source column (0)
      prevSrcLine = srcLine0;
      groups.push(seg);
    } else {
      groups.push(''); // unmapped target line
    }
  }

  const v3: SourceMapV3 = {
    version: 3,
    file: sourceName.replace(/\.snil$/, '') + '.out',
    sources: [sourceName],
    names: [],
    mappings: groups.join(';'),
    ...(content !== undefined ? { sourcesContent: [content] } : {}),
  };

  return { lines, entries, v3 };
}
