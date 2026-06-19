// diagnose.ts — Kiswahili code-frames. Turns a SnilError into a multi-line,
// learner-friendly diagnostic that names the phase, shows the offending source
// line, points a caret at the token where we can, then states the message and
// the hint (dokezo) — all in Kiswahili. Zero dependencies.
import type { SnilError } from './errors';
import type { Awamu } from './errors';
import type { SourceMap } from './sourcemap';

/** Phase → Kiswahili label shown in the header. */
const AWAMU_LABEL: Record<Awamu, string> = {
  kupima: 'kupima',
  kuchanganua: 'kuchanganua',
  kutekeleza: 'kutekeleza',
};

/**
 * Try to find the column of the offending token on its line. SnilError has no
 * `col` today, so we heuristically locate a quoted name from the message
 * (e.g. Neno "jumla" halijatambulika → finds `jumla` on the line). Returns a
 * 1-based column, or 0 if we cannot confidently place a caret.
 */
function locateColumn(line: string, message: string): number {
  const quoted = message.match(/"([^"]+)"/);
  if (!quoted) return 0;
  const needle = quoted[1];
  if (!needle) return 0;
  const idx = line.indexOf(needle);
  if (idx < 0) return 0;
  return idx + 1; // 1-based
}

/**
 * Render a Kiswahili code-frame for an error. Robust when `line` is 0 or out of
 * range: in that case it prints only the header + message (no frame, no caret).
 */
export function formatError(source: string, err: SnilError): string {
  const label = AWAMU_LABEL[err.awamu] ?? err.awamu;
  const lines = source.split('\n');
  const out: string[] = [];

  const hasLine = err.line > 0 && err.line <= lines.length;
  const header = hasLine
    ? `Hitilafu (${label}) — Mstari ${err.line}:`
    : `Hitilafu (${label}):`;
  out.push(header);

  if (hasLine) {
    const srcLine = lines[err.line - 1] ?? '';
    const gutter = String(err.line);
    out.push(`  ${gutter} | ${srcLine}`);

    const col = locateColumn(srcLine, err.ujumbe);
    if (col > 0) {
      // Pad the caret line to align under the source column. Tabs become single
      // spaces so the caret stays roughly aligned in most terminals.
      const pad = ' '.repeat(gutter.length) + ' | ';
      const lead = srcLine.slice(0, col - 1).replace(/[^\t]/g, ' ').replace(/\t/g, ' ');
      out.push(`  ${pad}${lead}^`);
    }
  }

  const tail = err.dokezo ? `${err.ujumbe} (dokezo: ${err.dokezo})` : err.ujumbe;
  out.push(tail);

  return out.join('\n');
}

/**
 * Render MANY Kiswahili code-frames at once. Used by multi-error diagnostics so a
 * learner sees every syntax mistake in one pass, not just the first. Each error is
 * rendered with the existing single-error `formatError` (line + caret + dokezo),
 * sorted by source line, under a header that counts them; frames are separated by
 * a thin rule. With zero errors → '' ; with one → just its frame + header.
 */
export function formatErrors(source: string, errors: SnilError[]): string {
  if (errors.length === 0) return '';
  // Stable sort by line so the frames read top-to-bottom like the program.
  const ordered = [...errors].sort((a, b) => (a.line || 0) - (b.line || 0));
  const n = ordered.length;
  const header =
    n === 1 ? 'Kosa 1 limepatikana:' : `Makosa ${n} yamepatikana:`;
  const sep = '\n\n──────────\n\n';
  const frames = ordered.map((e) => formatError(source, e)).join(sep);
  return `${header}\n\n${frames}`;
}

// ───────────────────── Target-side error → SNIL source ─────────────────────
// When the COMPILED program (Python/JS) crashes, the runtime reports a line in
// the generated target file. These helpers translate that target line back to the
// SNIL line you wrote, using a SourceMap from toPythonWithMap / toJSWithMap.

/**
 * Map a 1-based target (generated Python/JS) line number to the 1-based SNIL
 * source line via a SourceMap. Returns 0 if the target line has no SNIL origin
 * (e.g. it falls in the runtime prelude) or is out of range.
 */
export function mapTargetLineToSource(map: SourceMap, targetLine: number): number {
  if (targetLine < 1 || targetLine > map.lines.length) return 0;
  return map.lines[targetLine - 1] ?? 0;
}

/**
 * Render a Kiswahili code-frame that points at the SNIL SOURCE for an error that
 * surfaced at `targetLine` in the generated Python/JS. `target` names the backend
 * ('Python' | 'JavaScript'). Falls back gracefully when the target line cannot be
 * mapped (prints the message + a note that the SNIL line is unknown).
 */
export function formatTargetError(
  source: string,
  map: SourceMap,
  targetLine: number,
  message: string,
  target: 'Python' | 'JavaScript' = 'Python',
): string {
  const snilLine = mapTargetLineToSource(map, targetLine);
  const lines = source.split('\n');
  const out: string[] = [];

  if (snilLine > 0 && snilLine <= lines.length) {
    out.push(`Hitilafu (kutekeleza) — Mstari ${snilLine} (kutoka ${target} mstari ${targetLine}):`);
    const gutter = String(snilLine);
    out.push(`  ${gutter} | ${lines[snilLine - 1] ?? ''}`);
  } else {
    out.push(`Hitilafu (kutekeleza) — ${target} mstari ${targetLine} (chanzo cha SNIL hakijulikani):`);
  }
  out.push(message);
  return out.join('\n');
}
