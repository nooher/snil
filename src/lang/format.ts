// format.ts — the canonical SNIL "tidy" (nadhifu). One true layout for every
// SNIL program, so teaching examples look consistent regardless of who wrote
// them. SNIL ni lugha ya mistari (newlines separate statements), kwa hivyo
// tunafanya kazi mstari kwa mstari.
//
// Tabia kuu (key behaviours):
//   1. Block-based re-indentation, 4 spaces per level.
//   2. Maoni na maandishi (#, ### ### , "...") huhifadhiwa NENO KWA NENO.
//   3. Nafasi karibu na waendeshaji hupangwa sawasawa (single spaces).
//   4. Usafi wa nafasi: trim, collapse blank lines, trailing newline mmoja.
//
// MUHIMU: kupanga HAKUBADILISHI maana ya programu. Tunatumia uchanganuzi mdogo
// unaojua maoni+maandishi (NOT the lexer — the lexer discards comments).

const INDENT_UNIT = '    '; // 4 spaces

/**
 * SNIL keywords that are followed by an operand/expression. After one of these,
 * a `(` or `[` is the start of a grouped/indexed operand, NOT a call/index on
 * the keyword — so we keep the separating space (e.g. `rudisha (a + b)`,
 * `katika (orodha)`). Word operators na/au/sio belong here too.
 */
const KEYWORD_BEFORE_OPERAND = new Set<string>([
  'onyesha', 'rudisha', 'weka', 'kuwa', 'uliza', 'ikiwa', 'basi', 'vinginevyo',
  'kwa', 'kila', 'katika', 'kutoka', 'hadi', 'wakati', 'kazi', 'leta', 'jaribu',
  'kosa', 'na', 'au', 'sio', 'ongeza', 'ondoa', 'kwenye', 'andika', 'soma',
]);

/**
 * A single logical chunk of a source line, classified so we know whether to
 * touch it. CODE chunks get spacing-normalized; COMMENT and STRING are verbatim.
 */
interface Chunk {
  kind: 'code' | 'string' | 'comment';
  text: string;
}

/**
 * Split one physical line into code / string / comment chunks, honouring SNIL
 * lexical rules: `"..."` strings (with \n \t \" \\ escapes) and `#`/`### ###`
 * comments. When `inBlockComment` is true we start inside a `### ... ###` block.
 *
 * Returns the chunks plus whether we are still inside a block comment at end of
 * line (so a `### ... ###` spanning many lines is preserved across them).
 */
function splitLine(
  line: string,
  inBlockComment: boolean,
): { chunks: Chunk[]; inBlockComment: boolean } {
  const chunks: Chunk[] = [];
  let i = 0;
  const n = line.length;
  let code = '';

  const flushCode = () => {
    if (code.length > 0) {
      chunks.push({ kind: 'code', text: code });
      code = '';
    }
  };

  // If we begin the line inside a ### block comment, consume until the closing
  // ### (or end of line — block stays open for the next line).
  if (inBlockComment) {
    let text = '';
    while (i < n) {
      if (line[i] === '#' && line[i + 1] === '#' && line[i + 2] === '#') {
        text += '###';
        i += 3;
        chunks.push({ kind: 'comment', text });
        return { chunks, inBlockComment: false };
      }
      text += line[i++];
    }
    chunks.push({ kind: 'comment', text });
    return { chunks, inBlockComment: true };
  }

  while (i < n) {
    const ch = line[i];

    // ── String "..." ──
    if (ch === '"') {
      flushCode();
      let str = '"';
      i++;
      while (i < n) {
        const c = line[i];
        str += c;
        i++;
        if (c === '\\') {
          // keep the escaped char verbatim (the lexer treats \X as a unit)
          if (i < n) {
            str += line[i];
            i++;
          }
          continue;
        }
        if (c === '"') break; // closing quote
      }
      chunks.push({ kind: 'string', text: str });
      continue;
    }

    // ── Comment ──
    if (ch === '#') {
      flushCode();
      if (line[i + 1] === '#' && line[i + 2] === '#') {
        // ### block — may close on this line or stay open
        let text = '###';
        i += 3;
        let closed = false;
        while (i < n) {
          if (line[i] === '#' && line[i + 1] === '#' && line[i + 2] === '#') {
            text += '###';
            i += 3;
            closed = true;
            break;
          }
          text += line[i++];
        }
        chunks.push({ kind: 'comment', text });
        if (!closed) return { chunks, inBlockComment: true };
        continue;
      }
      // # line comment — rest of the line, verbatim
      chunks.push({ kind: 'comment', text: line.slice(i) });
      i = n;
      break;
    }

    code += ch;
    i++;
  }

  flushCode();
  return { chunks, inBlockComment: false };
}

/**
 * Normalize spacing inside a CODE chunk only. Single spaces around binary
 * operators and the word ops (na/au/sio), a space after commas, no space just
 * inside `(` `[` `{`. We rebuild the chunk from a tiny operator-aware scan so we
 * never need to look inside strings/comments (those are separate chunks).
 */
function normalizeCode(code: string): string {
  // 1. Insert spaces around two-char and one-char operators, and after commas.
  //    We scan char-by-char so we don't confuse e.g. `<=` with `<`.
  let out = '';
  let i = 0;
  const n = code.length;

  // Identifier/number char (so we can detect word boundaries for na/au/sio).
  const isWord = (c: string) => /[A-Za-z0-9_]/.test(c);

  while (i < n) {
    const c = code[i];
    const c2 = code[i] + (code[i + 1] ?? '');

    // two-char operators
    if (c2 === '==' || c2 === '!=' || c2 === '<=' || c2 === '>=') {
      out += ` ${c2} `;
      i += 2;
      continue;
    }
    // single-char binary/assignment operators
    if (c === '+' || c === '*' || c === '/' || c === '%' || c === '=' || c === '<' || c === '>') {
      out += ` ${c} `;
      i += 1;
      continue;
    }
    // minus: spaced (acceptable for unary too per spec)
    if (c === '-') {
      out += ` - `;
      i += 1;
      continue;
    }
    if (c === ',') {
      out += ', ';
      i += 1;
      continue;
    }
    out += c;
    i += 1;
  }

  // 2. Collapse runs of spaces, but DO NOT touch tabs-in-strings etc. (this is
  //    a code chunk, so only spaces matter here).
  out = out.replace(/[ \t]+/g, ' ');

  // 3. No space just inside ( [ {  and before ) ] } and before commas.
  out = out.replace(/([(\[{])\s+/g, '$1');
  out = out.replace(/\s+([)\]}])/g, '$1');
  out = out.replace(/\s+,/g, ',');

  // 4. No space before `(` / `[` when used as call / index (attached to a name,
  //    number, or closing bracket). Keeps `salamu("Asha")` and `bei[0]` tight,
  //    but NOT after a statement/operator keyword like `onyesha`/`rudisha`/`na`
  //    (those want a space before their operand).
  out = out.replace(/([A-Za-z0-9_]+|[)\]])(\s+)([(\[])/g, (_m, lhs, _sp, br) =>
    KEYWORD_BEFORE_OPERAND.has(lhs) ? `${lhs} ${br}` : `${lhs}${br}`,
  );

  // 5. No space around `.` member access.
  out = out.replace(/\s*\.\s*/g, '.');

  // 6. Word operators na/au/sio: ensure single spaces around them. Because we
  //    only collapsed spaces (didn't insert any), `a na b` already reads fine;
  //    just make sure `sio` (unary not) keeps a trailing space when followed by
  //    a word. These are already word-separated tokens in valid SNIL, so the
  //    space-collapse above suffices — nothing extra needed.
  void isWord;

  return out;
}

/** Re-glue chunks for a line that has been spacing-normalized. */
function renderChunks(chunks: Chunk[]): string {
  let s = '';
  for (const ch of chunks) {
    s += ch.kind === 'code' ? normalizeCode(ch.text) : ch.text;
  }
  return s;
}

/**
 * The leading SNIL keyword of a code line (first word of the first code chunk),
 * or '' if the line begins with a comment / is blank / starts with punctuation.
 */
function leadingKeyword(chunks: Chunk[]): string {
  for (const ch of chunks) {
    if (ch.kind !== 'code') {
      // a leading comment means there is no controlling keyword on this line
      if (ch.kind === 'comment') return '';
      return '';
    }
    const trimmed = ch.text.trimStart();
    if (trimmed === '') continue; // leading whitespace-only code chunk
    const m = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(trimmed);
    return m ? m[1] : '';
  }
  return '';
}

/** True if a normalized code line OPENS a block (its body should indent +1). */
function opensBlock(kw: string, rendered: string): boolean {
  switch (kw) {
    case 'ikiwa':
      // `ikiwa <cond> basi` opens; require a `basi` token to be safe.
      return /\bbasi\b/.test(stripStringsForScan(rendered));
    case 'kwa': // kwa kila ...
    case 'wakati':
    case 'kazi':
    case 'jaribu':
      return true;
    default:
      return false;
  }
}

/**
 * For block-keyword detection on the rendered line we must not be fooled by the
 * word `basi` appearing inside a string. Replace string contents with spaces of
 * equal-ish length (content irrelevant; we only test for the bare word `basi`).
 */
function stripStringsForScan(line: string): string {
  let out = '';
  let i = 0;
  const n = line.length;
  while (i < n) {
    if (line[i] === '"') {
      out += ' ';
      i++;
      while (i < n) {
        if (line[i] === '\\') {
          out += '  ';
          i += 2;
          continue;
        }
        if (line[i] === '"') {
          out += ' ';
          i++;
          break;
        }
        out += ' ';
        i++;
      }
      continue;
    }
    out += line[i++];
  }
  return out;
}

/**
 * Format SNIL source into the one canonical layout. Safe + idempotent; never
 * changes program meaning.
 */
export function formatSnil(source: string): string {
  // Normalize line endings; we re-emit with '\n'.
  const rawLines = source.replace(/\r\n?/g, '\n').split('\n');

  const out: string[] = [];
  let depth = 0;
  let inBlockComment = false;

  for (const raw of rawLines) {
    // Inside a multi-line ### block, lines are preserved verbatim (trailing
    // whitespace trimmed only on the outer entry/exit lines is risky, so we
    // trim trailing spaces but keep the content otherwise untouched).
    if (inBlockComment) {
      const res = splitLine(raw, true);
      inBlockComment = res.inBlockComment;
      // The whole line is comment text; keep verbatim but strip trailing spaces.
      out.push(renderChunks(res.chunks).replace(/[ \t]+$/g, ''));
      continue;
    }

    const trimmed = raw.trim();
    if (trimmed === '') {
      out.push('');
      continue;
    }

    const { chunks, inBlockComment: nowInBlock } = splitLine(raw.replace(/^[ \t]+/, ''), false);
    const kw = leadingKeyword(chunks);
    const rendered = renderChunks(chunks).replace(/[ \t]+$/g, '');

    // Dedent keywords: vinginevyo / kosa / mwisho align to the opener level.
    let lineDepth = depth;
    if (kw === 'mwisho' || kw === 'vinginevyo' || kw === 'kosa') {
      lineDepth = Math.max(0, depth - 1);
    }

    out.push(rendered === '' ? '' : INDENT_UNIT.repeat(lineDepth) + rendered);

    // Adjust depth for the NEXT line.
    if (kw === 'mwisho') {
      depth = Math.max(0, depth - 1);
    } else if (kw === 'vinginevyo' || kw === 'kosa') {
      // dedented this line, body indents again → net depth unchanged
      // (we already showed it at depth-1; its body returns to `depth`).
    } else if (opensBlock(kw, rendered)) {
      depth += 1;
    }

    inBlockComment = nowInBlock;
  }

  // ── Whitespace hygiene ──
  let text = out.join('\n');
  // Trim trailing spaces on every line (block-comment lines already handled).
  text = text
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .join('\n');
  // Collapse 3+ consecutive blank lines → exactly 1 blank line.
  text = text.replace(/\n{3,}/g, '\n\n');
  // No leading blank lines.
  text = text.replace(/^\n+/, '');
  // Exactly one trailing newline.
  text = text.replace(/\n+$/, '') + '\n';

  return text;
}
