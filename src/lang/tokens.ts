// tokens.ts — the lexical contract of SNIL. The lexer produces Token[]; the parser
// consumes it. Keywords are Kiswahili (Constitution Article 6: Kiswahili First).
//
// SNIL ni lugha yake — hii ni alfabeti yake ya tokeni, sio ya lugha nyingine.

export enum T {
  // literals & names
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  TEMPLATE = 'TEMPLATE',       // double-quoted string containing { expr } interpolation
  IDENT = 'IDENT',
  // keywords (Kiswahili)
  ONYESHA = 'ONYESHA',         // print / output
  WEKA = 'WEKA',               // declare:  weka X kuwa <expr>
  KUWA = 'KUWA',               // "be" (declaration + input binding)
  ULIZA = 'ULIZA',             // input:    uliza "..." kuwa X
  IKIWA = 'IKIWA',             // if
  BASI = 'BASI',               // then
  VINGINEVYO = 'VINGINEVYO',   // else
  MWISHO = 'MWISHO',           // universal block-end
  KWA = 'KWA',                 // for (kwa kila ...)
  KILA = 'KILA',               // each
  KATIKA = 'KATIKA',           // in   (for-each over a list)
  KUTOKA = 'KUTOKA',           // from (range start; also "ondoa X kutoka Y")
  HADI = 'HADI',               // to   (range end)
  WAKATI = 'WAKATI',           // while
  KAZI = 'KAZI',               // function
  RUDISHA = 'RUDISHA',         // return
  LETA = 'LETA',               // import module
  JARIBU = 'JARIBU',           // try
  KOSA = 'KOSA',               // catch/except
  KWELI = 'KWELI',             // boolean true
  SIKWELI = 'SIKWELI',         // boolean false (literal: si_kweli)
  TUPU = 'TUPU',               // null
  NA = 'NA',                   // logical and
  AU = 'AU',                   // logical or
  SIO = 'SIO',                 // logical not
  ONGEZA = 'ONGEZA',           // list add:    ongeza X kwenye Y
  ONDOA = 'ONDOA',             // list remove: ondoa X kutoka Y
  KWENYE = 'KWENYE',           // "into" (ongeza ... kwenye list; andika ... kwenye file)
  ANDIKA = 'ANDIKA',           // write file:  andika data kwenye "f.txt"
  SOMA = 'SOMA',               // read file:   soma "f.txt" kuwa X
  // operators
  PLUS = 'PLUS', MINUS = 'MINUS', STAR = 'STAR', SLASH = 'SLASH', PERCENT = 'PERCENT',
  ASSIGN = 'ASSIGN',           // =
  EQ = 'EQ',                   // ==
  NEQ = 'NEQ',                 // !=
  LT = 'LT', GT = 'GT', LTE = 'LTE', GTE = 'GTE',
  // punctuation
  LPAREN = 'LPAREN', RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET', RBRACKET = 'RBRACKET',
  LBRACE = 'LBRACE', RBRACE = 'RBRACE',
  COMMA = 'COMMA', COLON = 'COLON', DOT = 'DOT',
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
}

/** A segment of an interpolated string literal (T.TEMPLATE).
 *  `lit` parts hold already-decoded text; `expr` parts hold the RAW SNIL source
 *  captured between matching `{ … }` (re-tokenized + parsed by the parser). */
export type TemplatePart =
  | { t: 'lit'; value: string }
  | { t: 'expr'; src: string; line: number };

export interface Token {
  type: T;
  value: string; // raw lexeme (for NUMBER/STRING/IDENT) or '' for fixed tokens
  line: number;  // 1-based
  col: number;   // 1-based
  parts?: TemplatePart[]; // present only on T.TEMPLATE tokens
}

/** Reserved keyword spelling → token type (Technical Spec §22). */
export const KEYWORDS: Record<string, T> = {
  onyesha: T.ONYESHA, weka: T.WEKA, kuwa: T.KUWA, uliza: T.ULIZA,
  ikiwa: T.IKIWA, basi: T.BASI, vinginevyo: T.VINGINEVYO, mwisho: T.MWISHO,
  kwa: T.KWA, kila: T.KILA, katika: T.KATIKA, kutoka: T.KUTOKA, hadi: T.HADI,
  wakati: T.WAKATI, kazi: T.KAZI, rudisha: T.RUDISHA, leta: T.LETA,
  soma: T.SOMA, andika: T.ANDIKA, jaribu: T.JARIBU, kosa: T.KOSA,
  kweli: T.KWELI, si_kweli: T.SIKWELI, tupu: T.TUPU,
  na: T.NA, au: T.AU, sio: T.SIO, ongeza: T.ONGEZA, ondoa: T.ONDOA, kwenye: T.KWENYE,
};

/** True if an identifier spelling is a reserved keyword (cannot be a variable name). */
export const isKeyword = (word: string): boolean => Object.prototype.hasOwnProperty.call(KEYWORDS, word);
