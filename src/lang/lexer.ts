// lexer.ts — SNIL source → Token[]. Hatua ya "kupima" (lexing).
//
// Hutoa tokeni moja ya T.EOF mwishoni. Hushughulikia namba (int + desimali),
// maandishi yenye escapes (\n \t \" \\), vitambulishi, maneno-funguo (KEYWORDS),
// waendeshaji wote, maoni (# na ### ... ###), na NEWLINE kama mtenganishi wa sentensi.
// Hufuatilia mstari na safu (1-based). Herufi isiyojulikana / maandishi
// yasiyofungwa → SnilError ya Kiswahili kutoka errors.ts.

import { T, KEYWORDS, isKeyword, type Token, type TemplatePart } from './tokens';
import { Makosa, SnilError } from './errors';

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const n = source.length;

  // Sogeza mbele herufi moja, ukifuatilia mstari/safu.
  const advance = (): string => {
    const ch = source[i++];
    if (ch === '\n') { line++; col = 1; } else { col++; }
    return ch;
  };
  const peek = (k = 0): string => source[i + k] ?? '';

  // Toa NEWLINE bila kurudufu/kuongoza (parser huona mtenganishi mmoja tu).
  const pushNewline = (ln: number, c: number) => {
    const last = tokens[tokens.length - 1];
    if (!last || last.type === T.NEWLINE) return; // ondoa rudufu + zinazoongoza
    tokens.push({ type: T.NEWLINE, value: '', line: ln, col: c });
  };

  const isDigit = (ch: string) => ch >= '0' && ch <= '9';
  const isAlpha = (ch: string) =>
    (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  const isAlphaNum = (ch: string) => isAlpha(ch) || isDigit(ch);

  while (i < n) {
    const ch = peek();
    const startCol = col;
    const startLine = line;

    // ── Newline → mtenganishi wa sentensi ──
    if (ch === '\n') { advance(); pushNewline(startLine, startCol); continue; }

    // ── Nafasi tupu (si newline) ──
    if (ch === ' ' || ch === '\t' || ch === '\r') { advance(); continue; }

    // ── Maoni ──
    if (ch === '#') {
      // ### ... ### maoni ya mistari mingi
      if (peek(1) === '#' && peek(2) === '#') {
        advance(); advance(); advance(); // funga ###
        while (i < n) {
          if (peek() === '#' && peek(1) === '#' && peek(2) === '#') {
            advance(); advance(); advance();
            break;
          }
          advance();
        }
        continue;
      }
      // # ... hadi mwisho wa mstari
      while (i < n && peek() !== '\n') advance();
      continue;
    }

    // ── Namba (int + desimali) ──
    if (isDigit(ch)) {
      let num = '';
      while (i < n && isDigit(peek())) num += advance();
      // sehemu ya desimali: nukta ikifuatiwa na tarakimu
      if (peek() === '.' && isDigit(peek(1))) {
        num += advance(); // '.'
        while (i < n && isDigit(peek())) num += advance();
      }
      tokens.push({ type: T.NUMBER, value: num, line: startLine, col: startCol });
      continue;
    }

    // ── Maandishi "..." (+ uingizaji wa misemo: { expr }) ──
    if (ch === '"') {
      advance(); // " ya kufungua
      // Segments: literal text accumulates in `lit`; an unescaped `{` opens an
      // interpolation whose RAW source is captured for the parser. A plain string
      // (no `{`) yields a single STRING token exactly as before (zero regression).
      const parts: TemplatePart[] = [];
      let lit = '';
      let interpolated = false;
      let closed = false;
      const flushLit = () => { parts.push({ t: 'lit', value: lit }); lit = ''; };
      while (i < n) {
        const c = peek();
        if (c === '\n') break; // maandishi hayavuki mstari
        if (c === '"') { advance(); closed = true; break; }
        if (c === '\\') {
          advance(); // '\'
          const esc = peek();
          switch (esc) {
            case 'n': lit += '\n'; advance(); break;
            case 't': lit += '\t'; advance(); break;
            case '"': lit += '"'; advance(); break;
            case '\\': lit += '\\'; advance(); break;
            case '{': lit += '{'; advance(); break; // \{ → literal brace
            case '}': lit += '}'; advance(); break; // \} → literal brace
            default: lit += '\\'; break;            // escape isiyojulikana: hifadhi backslash
          }
          continue;
        }
        if (c === '{') {
          // Open an interpolation: capture raw source until the MATCHING `}`,
          // tracking brace depth and skipping over nested string literals so a
          // `}` inside a string/dict inside the expression doesn't end it early.
          interpolated = true;
          const exprLine = line;
          advance(); // consume '{'
          flushLit();
          let src = '';
          let depth = 1;
          while (i < n && depth > 0) {
            const e = peek();
            if (e === '\n') break; // expression must stay on one line
            if (e === '"') {
              // copy a nested string literal verbatim (incl. its escapes)
              src += advance(); // opening "
              while (i < n && peek() !== '"' && peek() !== '\n') {
                if (peek() === '\\') { src += advance(); if (i < n) src += advance(); continue; }
                src += advance();
              }
              if (peek() === '"') src += advance(); // closing "
              continue;
            }
            if (e === '{') { depth++; src += advance(); continue; }
            if (e === '}') {
              depth--;
              if (depth === 0) { advance(); break; } // consume closing '}', drop it
              src += advance();
              continue;
            }
            src += advance();
          }
          if (depth > 0) {
            throw new SnilError(
              'Uingizaji wa msemo "{ … }" haujafungwa kwa "}".', exprLine, 'kupima',
              'tumia "\\{" kwa alama ya kufungua halisi',
            );
          }
          if (src.trim() === '') {
            throw new SnilError(
              'Uingizaji wa msemo "{ }" hauna msemo ndani yake.', exprLine, 'kupima',
              'andika msemo kati ya { }, au tumia "\\{" kwa alama halisi',
            );
          }
          parts.push({ t: 'expr', src, line: exprLine });
          continue;
        }
        lit += advance();
      }
      if (!closed) throw Makosa.maandishiHayajafungwa(startLine);
      if (!interpolated) {
        // No interpolation at all → ordinary STRING (identical to legacy behaviour).
        tokens.push({ type: T.STRING, value: lit, line: startLine, col: startCol });
      } else {
        flushLit(); // trailing literal (may be empty)
        tokens.push({ type: T.TEMPLATE, value: '', line: startLine, col: startCol, parts });
      }
      continue;
    }

    // ── Vitambulishi & maneno-funguo ──
    if (isAlpha(ch)) {
      let word = '';
      while (i < n && isAlphaNum(peek())) word += advance();
      const type = isKeyword(word) ? KEYWORDS[word] : T.IDENT;
      tokens.push({ type, value: word, line: startLine, col: startCol });
      continue;
    }

    // ── Waendeshaji wenye herufi mbili ──
    if (ch === '=' && peek(1) === '=') { advance(); advance(); tokens.push(mk(T.EQ, '==', startLine, startCol)); continue; }
    if (ch === '!' && peek(1) === '=') { advance(); advance(); tokens.push(mk(T.NEQ, '!=', startLine, startCol)); continue; }
    if (ch === '<' && peek(1) === '=') { advance(); advance(); tokens.push(mk(T.LTE, '<=', startLine, startCol)); continue; }
    if (ch === '>' && peek(1) === '=') { advance(); advance(); tokens.push(mk(T.GTE, '>=', startLine, startCol)); continue; }

    // ── Waendeshaji & alama za herufi moja ──
    advance();
    switch (ch) {
      case '+': tokens.push(mk(T.PLUS, '+', startLine, startCol)); break;
      case '-': tokens.push(mk(T.MINUS, '-', startLine, startCol)); break;
      case '*': tokens.push(mk(T.STAR, '*', startLine, startCol)); break;
      case '/': tokens.push(mk(T.SLASH, '/', startLine, startCol)); break;
      case '%': tokens.push(mk(T.PERCENT, '%', startLine, startCol)); break;
      case '=': tokens.push(mk(T.ASSIGN, '=', startLine, startCol)); break;
      case '<': tokens.push(mk(T.LT, '<', startLine, startCol)); break;
      case '>': tokens.push(mk(T.GT, '>', startLine, startCol)); break;
      case '(': tokens.push(mk(T.LPAREN, '(', startLine, startCol)); break;
      case ')': tokens.push(mk(T.RPAREN, ')', startLine, startCol)); break;
      case '[': tokens.push(mk(T.LBRACKET, '[', startLine, startCol)); break;
      case ']': tokens.push(mk(T.RBRACKET, ']', startLine, startCol)); break;
      case '{': tokens.push(mk(T.LBRACE, '{', startLine, startCol)); break;
      case '}': tokens.push(mk(T.RBRACE, '}', startLine, startCol)); break;
      case ',': tokens.push(mk(T.COMMA, ',', startLine, startCol)); break;
      case ':': tokens.push(mk(T.COLON, ':', startLine, startCol)); break;
      case '.': tokens.push(mk(T.DOT, '.', startLine, startCol)); break;
      default:
        throw Makosa.herufiTatanishi(ch, startLine);
    }
  }

  // Ondoa NEWLINE inayofunga kabla ya EOF, kisha weka EOF.
  while (tokens.length && tokens[tokens.length - 1].type === T.NEWLINE) tokens.pop();
  tokens.push({ type: T.EOF, value: '', line, col });
  return tokens;
}

// Mfanyizo mfupi wa tokeni za alama zisizobadilika.
const mk = (type: T, value: string, line: number, col: number): Token => ({ type, value, line, col });
