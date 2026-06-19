// diagnose.ts — Kiswahili code-frames. Turns a SnilError into a multi-line,
// learner-friendly diagnostic that names the phase, shows the offending source
// line, points a caret at the token where we can, then states the message and
// the hint (dokezo) — all in Kiswahili. Zero dependencies.
import type { SnilError } from './errors';
import type { Awamu } from './errors';

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
