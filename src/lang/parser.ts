// parser.ts — Token[] → Program AST. Hatua ya "kuchanganua" (parsing).
//
// Recursive-descent. Precedence (chini → juu): au < na < ulinganishi < +/-
// < */% < unary (sio, -) < call/index/member < grouping. `mwisho` hufunga
// blocks za if/forEach/forRange/while/kazi/jaribu. Makosa ya kisintaksia →
// SnilError ya Kiswahili (Makosa.ilitarajiwa) yenye namba ya mstari.

import { T, type Token } from './tokens';
import { Makosa, SnilError } from './errors';
import type {
  Program, Stmt, Expr,
  VarDecl, Assign, Print, Input, If, ForEach, ForRange, While,
  FuncDecl, Return, Try, Import, ListAdd, ListRemove, FileWrite, FileRead, ExprStmt,
  Ident, Index, Member, Binary, Unary, Call,
  NumberLit, StringLit, TemplateString, BoolLit, NullLit, ListLit, DictLit, BinOp,
} from './ast';
import { tokenize } from './lexer';

export function parse(tokens: Token[]): Program {
  let pos = 0;

  // ───────────────── msaada wa tokeni ─────────────────
  const peek = (): Token => tokens[pos];
  const at = (type: T): boolean => peek().type === type;
  const isEnd = (): boolean => at(T.EOF);
  const next = (): Token => tokens[pos++];

  // Maelezo ya kibinadamu ya tokeni kwa ujumbe wa makosa.
  const describe = (t: Token): string =>
    t.type === T.EOF ? 'mwisho wa programu' : (t.value || t.type);

  const expect = (type: T, nini: string): Token => {
    if (!at(type)) throw Makosa.ilitarajiwa(nini, describe(peek()), peek().line);
    return next();
  };

  // Ruka NEWLINE zozote (kati ya/baada ya sentensi).
  const skipNewlines = () => { while (at(T.NEWLINE)) next(); };

  // Mlaji mmoja wa kitambulishi → jina (string).
  const expectIdent = (nini = 'kitambulishi'): string =>
    expect(T.IDENT, nini).value;

  // ───────────────── programu ─────────────────
  const program: Stmt[] = [];
  skipNewlines();
  while (!isEnd()) {
    program.push(statement());
    // baada ya sentensi: tunatarajia NEWLINE au mwisho/funga-block
    skipNewlines();
  }
  return { kind: 'Program', body: program };

  // ───────────────── sentensi ─────────────────
  function statement(): Stmt {
    const t = peek();
    switch (t.type) {
      case T.WEKA: return varDecl();
      case T.ONYESHA: return print();
      case T.ULIZA: return input();
      case T.IKIWA: return ifStmt();
      case T.KWA: return forStmt();
      case T.WAKATI: return whileStmt();
      case T.KAZI: return funcDecl();
      case T.RUDISHA: return returnStmt();
      case T.JARIBU: return tryStmt();
      case T.LETA: return importStmt();
      case T.ONGEZA: return listAdd();
      case T.ONDOA: return listRemove();
      case T.ANDIKA: return fileWrite();
      case T.SOMA: return fileRead();
      default: return assignOrExpr();
    }
  }

  // weka IDENT kuwa expr
  function varDecl(): VarDecl {
    const line = next().line; // weka
    const name = expectIdent('jina la kigeu baada ya "weka"');
    expect(T.KUWA, '"kuwa"');
    const value = expression();
    return { kind: 'VarDecl', name, value, line };
  }

  // onyesha expr
  function print(): Print {
    const line = next().line; // onyesha
    const value = expression();
    return { kind: 'Print', value, line };
  }

  // uliza expr kuwa IDENT
  function input(): Input {
    const line = next().line; // uliza
    const prompt = expression();
    expect(T.KUWA, '"kuwa"');
    const name = expectIdent('jina la kigeu baada ya "kuwa"');
    return { kind: 'Input', prompt, name, line };
  }

  // ikiwa expr basi { stmt } [ vinginevyo { stmt } ] mwisho
  function ifStmt(): If {
    const line = next().line; // ikiwa
    const cond = expression();
    expect(T.BASI, '"basi"');
    const then = block([T.VINGINEVYO, T.MWISHO]);
    let otherwise: Stmt[] | null = null;
    if (at(T.VINGINEVYO)) {
      next();
      otherwise = block([T.MWISHO]);
    }
    expect(T.MWISHO, '"mwisho"');
    return { kind: 'If', cond, then, otherwise, line };
  }

  // kwa kila IDENT (katika expr | kutoka expr hadi expr) { stmt } mwisho
  function forStmt(): ForEach | ForRange {
    const line = next().line; // kwa
    expect(T.KILA, '"kila"');
    const varName = expectIdent('jina la kigeu baada ya "kila"');
    if (at(T.KATIKA)) {
      next();
      const iterable = expression();
      const body = block([T.MWISHO]);
      expect(T.MWISHO, '"mwisho"');
      return { kind: 'ForEach', varName, iterable, body, line };
    }
    if (at(T.KUTOKA)) {
      next();
      const from = expression();
      expect(T.HADI, '"hadi"');
      const to = expression();
      const body = block([T.MWISHO]);
      expect(T.MWISHO, '"mwisho"');
      return { kind: 'ForRange', varName, from, to, body, line };
    }
    throw Makosa.ilitarajiwa('"katika" au "kutoka"', describe(peek()), peek().line);
  }

  // wakati expr { stmt } mwisho
  function whileStmt(): While {
    const line = next().line; // wakati
    const cond = expression();
    const body = block([T.MWISHO]);
    expect(T.MWISHO, '"mwisho"');
    return { kind: 'While', cond, body, line };
  }

  // kazi IDENT ( [IDENT {, IDENT}] ) { stmt } mwisho
  function funcDecl(): FuncDecl {
    const line = next().line; // kazi
    const name = expectIdent('jina la kazi baada ya "kazi"');
    expect(T.LPAREN, '"("');
    const params: string[] = [];
    if (!at(T.RPAREN)) {
      params.push(expectIdent('jina la kigezo'));
      while (at(T.COMMA)) {
        next();
        params.push(expectIdent('jina la kigezo'));
      }
    }
    expect(T.RPAREN, '")"');
    const body = block([T.MWISHO]);
    expect(T.MWISHO, '"mwisho"');
    return { kind: 'FuncDecl', name, params, body, line };
  }

  // rudisha [expr]
  function returnStmt(): Return {
    const line = next().line; // rudisha
    // hakuna expr ikiwa mwisho wa mstari/block/programu
    if (at(T.NEWLINE) || at(T.MWISHO) || isEnd()) {
      return { kind: 'Return', value: null, line };
    }
    const value = expression();
    return { kind: 'Return', value, line };
  }

  // jaribu { stmt } kosa { stmt } mwisho
  function tryStmt(): Try {
    const line = next().line; // jaribu
    const body = block([T.KOSA]);
    expect(T.KOSA, '"kosa"');
    const handler = block([T.MWISHO]);
    expect(T.MWISHO, '"mwisho"');
    return { kind: 'Try', body, handler, line };
  }

  // leta IDENT
  function importStmt(): Import {
    const line = next().line; // leta
    if (at(T.STRING)) {
      const module = next().value; // leta "faili" — kuagiza moduli ya SNIL
      return { kind: 'Import', module, isFile: true, line };
    }
    const module = expectIdent('jina la moduli au "faili" baada ya "leta"');
    return { kind: 'Import', module, isFile: false, line };
  }

  // ongeza expr kwenye expr
  function listAdd(): ListAdd {
    const line = next().line; // ongeza
    const item = expression();
    expect(T.KWENYE, '"kwenye"');
    const list = expression();
    return { kind: 'ListAdd', item, list, line };
  }

  // ondoa expr kutoka expr
  function listRemove(): ListRemove {
    const line = next().line; // ondoa
    const item = expression();
    expect(T.KUTOKA, '"kutoka"');
    const list = expression();
    return { kind: 'ListRemove', item, list, line };
  }

  // andika expr kwenye expr
  function fileWrite(): FileWrite {
    const line = next().line; // andika
    const data = expression();
    expect(T.KWENYE, '"kwenye"');
    const path = expression();
    return { kind: 'FileWrite', data, path, line };
  }

  // soma expr kuwa IDENT
  function fileRead(): FileRead {
    const line = next().line; // soma
    const path = expression();
    expect(T.KUWA, '"kuwa"');
    const name = expectIdent('jina la kigeu baada ya "kuwa"');
    return { kind: 'FileRead', path, name, line };
  }

  // assign = lvalue "=" expr  |  exprStmt = expr
  // Tunachanganua expression kwanza; ikiwa inafuatwa na "=" na ni lvalue → Assign.
  function assignOrExpr(): Assign | ExprStmt {
    const line = peek().line;
    const left = expression();
    if (at(T.ASSIGN)) {
      next();
      const value = expression();
      if (left.kind !== 'Ident' && left.kind !== 'Index' && left.kind !== 'Member') {
        throw new SnilError(
          'Upande wa kushoto wa "=" lazima uwe kigeu, kipengele cha orodha, au sehemu ya kamusi.',
          line, 'kuchanganua',
        );
      }
      return { kind: 'Assign', target: left as Ident | Index | Member, value, line };
    }
    return { kind: 'ExprStmt', expr: left, line };
  }

  // Kusanya sentensi hadi mojawapo ya tokeni-funga (au EOF). Hairuki tokeni-funga.
  function block(closers: T[]): Stmt[] {
    const body: Stmt[] = [];
    skipNewlines();
    while (!isEnd() && !closers.includes(peek().type)) {
      body.push(statement());
      skipNewlines();
    }
    if (isEnd() && !closers.includes(T.EOF)) {
      // block haijafungwa kabla ya mwisho wa programu
      const nini = closers.map((c) => `"${closerWord(c)}"`).join(' au ');
      throw Makosa.ilitarajiwa(nini, describe(peek()), peek().line);
    }
    return body;
  }

  // ───────────────── misemo (expressions) ─────────────────
  // au < na < ulinganishi < +/- < */% < unary < postfix < primary

  function expression(): Expr { return orExpr(); }

  function orExpr(): Expr {
    let left = andExpr();
    while (at(T.AU)) {
      const line = next().line;
      const right = andExpr();
      left = bin('au', left, right, line);
    }
    return left;
  }

  function andExpr(): Expr {
    let left = comparison();
    while (at(T.NA)) {
      const line = next().line;
      const right = comparison();
      left = bin('na', left, right, line);
    }
    return left;
  }

  function comparison(): Expr {
    let left = addition();
    while (at(T.EQ) || at(T.NEQ) || at(T.LT) || at(T.GT) || at(T.LTE) || at(T.GTE)) {
      const tok = next();
      const right = addition();
      left = bin(cmpOp(tok.type), left, right, tok.line);
    }
    return left;
  }

  function addition(): Expr {
    let left = multiplication();
    while (at(T.PLUS) || at(T.MINUS)) {
      const tok = next();
      const right = multiplication();
      left = bin(tok.type === T.PLUS ? '+' : '-', left, right, tok.line);
    }
    return left;
  }

  function multiplication(): Expr {
    let left = unary();
    while (at(T.STAR) || at(T.SLASH) || at(T.PERCENT)) {
      const tok = next();
      const right = unary();
      const op: BinOp = tok.type === T.STAR ? '*' : tok.type === T.SLASH ? '/' : '%';
      left = bin(op, left, right, tok.line);
    }
    return left;
  }

  function unary(): Expr {
    if (at(T.SIO)) {
      const line = next().line;
      const operand = unary();
      const u: Unary = { kind: 'Unary', op: 'sio', operand, line };
      return u;
    }
    if (at(T.MINUS)) {
      const line = next().line;
      const operand = unary();
      const u: Unary = { kind: 'Unary', op: '-', operand, line };
      return u;
    }
    return postfix();
  }

  // call f(...), index x[...], member x.k — zinazoshikamana kushoto
  function postfix(): Expr {
    let expr = primary();
    for (;;) {
      if (at(T.LPAREN)) {
        // call: inahalalishwa tu juu ya Ident (callee ni jina)
        const line = peek().line;
        if (expr.kind !== 'Ident') {
          throw Makosa.ilitarajiwa('jina la kazi kabla ya "("', describe(peek()), line);
        }
        next(); // (
        const args: Expr[] = [];
        if (!at(T.RPAREN)) {
          args.push(expression());
          while (at(T.COMMA)) { next(); args.push(expression()); }
        }
        expect(T.RPAREN, '")"');
        const call: Call = { kind: 'Call', callee: expr.name, args, line };
        expr = call;
        continue;
      }
      if (at(T.LBRACKET)) {
        const line = next().line; // [
        const index = expression();
        expect(T.RBRACKET, '"]"');
        const idx: Index = { kind: 'Index', target: expr, index, line };
        expr = idx;
        continue;
      }
      if (at(T.DOT)) {
        const line = next().line; // .
        const name = expectIdent('jina la sehemu baada ya "."');
        const mem: Member = { kind: 'Member', target: expr, name, line };
        expr = mem;
        continue;
      }
      break;
    }
    return expr;
  }

  function primary(): Expr {
    const t = peek();
    switch (t.type) {
      case T.NUMBER: {
        next();
        const lit: NumberLit = { kind: 'NumberLit', value: Number(t.value), line: t.line };
        return lit;
      }
      case T.STRING: {
        next();
        const lit: StringLit = { kind: 'StringLit', value: t.value, line: t.line };
        return lit;
      }
      case T.TEMPLATE: {
        next();
        return templateString(t);
      }
      case T.KWELI: {
        next();
        const lit: BoolLit = { kind: 'BoolLit', value: true, line: t.line };
        return lit;
      }
      case T.SIKWELI: {
        next();
        const lit: BoolLit = { kind: 'BoolLit', value: false, line: t.line };
        return lit;
      }
      case T.TUPU: {
        next();
        const lit: NullLit = { kind: 'NullLit', line: t.line };
        return lit;
      }
      case T.IDENT: {
        next();
        const id: Ident = { kind: 'Ident', name: t.value, line: t.line };
        return id;
      }
      case T.LPAREN: {
        next(); // (
        const e = expression();
        expect(T.RPAREN, '")"');
        return e;
      }
      case T.LBRACKET: return listLit();
      case T.LBRACE: return dictLit();
      default:
        throw Makosa.ilitarajiwa('msemo (namba, maandishi, kigeu, n.k.)', describe(t), t.line);
    }
  }

  // "…{ expr }…" — maandishi yenye uingizaji. Kila sehemu ya `expr` ina chanzo
  // ghafi kilichonaswa na lexer; tunakitokeniza + kukichanganua kwa parser ileile.
  function templateString(tok: Token): TemplateString {
    const rawParts = tok.parts ?? [];
    const parts: TemplateString['parts'] = [];
    for (const p of rawParts) {
      if (p.t === 'lit') {
        parts.push({ t: 'lit', value: p.value });
        continue;
      }
      // Parse the captured expression source as a standalone expression.
      const subTokens = tokenize(p.src);
      const sub = parse(subTokens);
      if (sub.body.length !== 1 || sub.body[0].kind !== 'ExprStmt') {
        throw Makosa.ilitarajiwa(
          'msemo mmoja ndani ya { }', p.src.trim() || 'tupu', p.line,
        );
      }
      const expr = (sub.body[0] as ExprStmt).expr;
      // Re-base the line number so runtime errors point at the string's line.
      reline(expr, p.line);
      parts.push({ t: 'expr', expr });
    }
    return { kind: 'TemplateString', parts, line: tok.line };
  }

  // Rewrite every node's `line` to the string literal's source line (the captured
  // expr source is line 1 in its own mini-tokenization).
  function reline(node: unknown, line: number): void {
    if (node === null || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    if (typeof obj.line === 'number') obj.line = line;
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (Array.isArray(v)) v.forEach((c) => reline(c, line));
      else if (v && typeof v === 'object') reline(v, line);
    }
  }

  // [ expr {, expr} ] — orodha
  function listLit(): ListLit {
    const line = next().line; // [
    const items: Expr[] = [];
    if (!at(T.RBRACKET)) {
      items.push(expression());
      while (at(T.COMMA)) {
        next();
        if (at(T.RBRACKET)) break; // koma ya nyuma inaruhusiwa
        items.push(expression());
      }
    }
    expect(T.RBRACKET, '"]"');
    return { kind: 'ListLit', items, line };
  }

  // { key: expr {, key: expr} } — kamusi. Funguo: IDENT au STRING.
  function dictLit(): DictLit {
    const line = next().line; // {
    const entries: { key: string; value: Expr }[] = [];
    if (!at(T.RBRACE)) {
      entries.push(dictEntry());
      while (at(T.COMMA)) {
        next();
        if (at(T.RBRACE)) break; // koma ya nyuma inaruhusiwa
        entries.push(dictEntry());
      }
    }
    expect(T.RBRACE, '"}"');
    return { kind: 'DictLit', entries, line };
  }

  function dictEntry(): { key: string; value: Expr } {
    let key: string;
    if (at(T.IDENT)) key = next().value;
    else if (at(T.STRING)) key = next().value;
    else throw Makosa.ilitarajiwa('funguo la kamusi (jina au maandishi)', describe(peek()), peek().line);
    expect(T.COLON, '":"');
    const value = expression();
    return { key, value };
  }

  // ───────────────── visaidizi vidogo ─────────────────
  function bin(op: BinOp, left: Expr, right: Expr, line: number): Binary {
    return { kind: 'Binary', op, left, right, line };
  }

  function cmpOp(t: T): BinOp {
    switch (t) {
      case T.EQ: return '==';
      case T.NEQ: return '!=';
      case T.LT: return '<';
      case T.GT: return '>';
      case T.LTE: return '<=';
      default: return '>='; // T.GTE
    }
  }

  // Neno la chanzo kwa tokeni-funga (kwa ujumbe wa makosa).
  function closerWord(t: T): string {
    switch (t) {
      case T.MWISHO: return 'mwisho';
      case T.VINGINEVYO: return 'vinginevyo';
      case T.KOSA: return 'kosa';
      default: return t;
    }
  }
}
