// interpreter.ts — the SNIL tree-walking runtime. Consumes a Program AST (from the
// parser) and executes it against a SnilIO sink. SNIL speaks Kiswahili end-to-end:
// every runtime error is a SnilError in Kiswahili pointing at the offending line.
//
// Lexical scoping: functions close over their defining environment. `rudisha`
// unwinds via an internal exception. Stdlib modules are pulled into a flat builtin
// namespace by `leta` (see stdlib.ts) so `jumla(...)` resolves after `leta hisabati`.
import type {
  Program, Stmt, Expr,
  Ident, Index, Member,
} from './ast';
import type { SnilIO } from './runtime';
import { SnilError, Makosa } from './errors';
import { STDLIB, BUILTINS, type NativeFn } from './stdlib';
import { tokenize } from './lexer';
import { parse } from './parser';

// ───────────────────────── Runtime values ─────────────────────────
// SNIL values map onto JS: number, string, boolean, null (tupu), array (orodha),
// Map<string,value> (kamusi), and SnilFunction (user kazi).
export type SnilValue =
  | number | string | boolean | null
  | SnilValue[]
  | SnilDict
  | SnilFunction
  | NativeFn;

export type SnilDict = Map<string, SnilValue>;

export interface SnilFunction {
  __snilFn: true;
  name: string;
  params: string[];
  body: Stmt[];
  closure: Environment;
}

function isSnilFunction(v: unknown): v is SnilFunction {
  return typeof v === 'object' && v !== null && (v as SnilFunction).__snilFn === true;
}

// ───────────────────────── Environment ─────────────────────────
class Environment {
  private vars = new Map<string, SnilValue>();
  constructor(public parent: Environment | null = null) {}

  /** Declare/overwrite in the current scope (weka). */
  declare(name: string, value: SnilValue): void {
    this.vars.set(name, value);
  }

  /** Look up a variable through the scope chain. */
  has(name: string): boolean {
    if (this.vars.has(name)) return true;
    return this.parent ? this.parent.has(name) : false;
  }

  get(name: string, line: number): SnilValue {
    if (this.vars.has(name)) return this.vars.get(name)!;
    if (this.parent) return this.parent.get(name, line);
    throw Makosa.nenoHalijatambulika(name, line);
  }

  /** Assign to an existing binding (walking outward); declare locally if new. */
  assign(name: string, value: SnilValue): void {
    let env: Environment | null = this;
    while (env) {
      if (env.hasOwn(name)) { env.set(name, value); return; }
      env = env.parent;
    }
    // Not previously bound — create in current scope (lets `x = ...` work as decl too).
    this.vars.set(name, value);
  }

  private hasOwn(name: string): boolean { return this.vars.has(name); }
  private set(name: string, value: SnilValue): void { this.vars.set(name, value); }

  /** Snapshot of this scope's OWN bindings — a module's top-level kazi + weka. */
  exportTopLevel(): Map<string, SnilValue> {
    return new Map(this.vars);
  }
}

// Internal control-flow signal used to unwind `rudisha`.
class ReturnSignal {
  constructor(public value: SnilValue) {}
}

// ───────────────────────── Entry point ─────────────────────────
export function interpret(program: Program, io: SnilIO): void {
  const global = new Environment();
  // The flat builtin namespace: idadi() etc. plus whatever `leta` copies in.
  const builtins = new Map<string, NativeFn>();
  for (const [name, fn] of Object.entries(BUILTINS)) builtins.set(name, fn);

  const ctx: Ctx = {
    io,
    builtins,
    moduleCache: new Map(),
    loadingModules: new Set(),
  };
  execBlock(program.body, global, ctx);
}

interface Ctx {
  io: SnilIO;
  builtins: Map<string, NativeFn>;
  /** Loaded file modules by name → their top-level exported bindings (kazi + weka). */
  moduleCache: Map<string, Map<string, SnilValue>>;
  /** Names of modules currently being loaded — used to detect import cycles. */
  loadingModules: Set<string>;
}

/** Load a file module ONCE: parse, run its body in a fresh scope, return the
 *  top-level `kazi` + `weka` bindings. Cached; guards against import cycles. */
function loadModule(name: string, line: number, ctx: Ctx): Map<string, SnilValue> {
  const cached = ctx.moduleCache.get(name);
  if (cached) return cached;

  if (ctx.loadingModules.has(name)) {
    throw new SnilError(`Mzunguko wa kuagiza moduli: ${name}`, line, 'kutekeleza');
  }

  const source = ctx.io.somaModuli?.(name);
  if (source == null) {
    throw new SnilError(`Moduli "${name}" haijapatikana.`, line, 'kutekeleza');
  }

  ctx.loadingModules.add(name);
  try {
    const program = parse(tokenize(source));
    // Fresh module scope: functions close over THIS environment, so a module
    // function can call sibling module functions / read module-level `weka`.
    const moduleEnv = new Environment();
    execBlock(program.body, moduleEnv, ctx);
    const exports = moduleEnv.exportTopLevel();
    ctx.moduleCache.set(name, exports);
    return exports;
  } finally {
    ctx.loadingModules.delete(name);
  }
}

// ───────────────────────── Statements ─────────────────────────
function execBlock(body: Stmt[], env: Environment, ctx: Ctx): void {
  for (const stmt of body) exec(stmt, env, ctx);
}

function exec(stmt: Stmt, env: Environment, ctx: Ctx): void {
  switch (stmt.kind) {
    case 'VarDecl': {
      env.declare(stmt.name, evaluate(stmt.value, env, ctx));
      return;
    }
    case 'Assign': {
      const value = evaluate(stmt.value, env, ctx);
      assignTo(stmt.target, value, env, ctx);
      return;
    }
    case 'Print': {
      ctx.io.andika(displayString(evaluate(stmt.value, env, ctx)));
      return;
    }
    case 'Input': {
      const prompt = displayString(evaluate(stmt.prompt, env, ctx));
      const raw = ctx.io.uliza(prompt);
      env.declare(stmt.name, parseInput(raw));
      return;
    }
    case 'If': {
      if (isTruthy(evaluate(stmt.cond, env, ctx))) {
        execBlock(stmt.then, new Environment(env), ctx);
      } else if (stmt.otherwise) {
        execBlock(stmt.otherwise, new Environment(env), ctx);
      }
      return;
    }
    case 'ForEach': {
      const iterable = evaluate(stmt.iterable, env, ctx);
      const items = iterableToArray(iterable, stmt.line);
      for (const item of items) {
        const loopEnv = new Environment(env);
        loopEnv.declare(stmt.varName, item);
        execBlock(stmt.body, loopEnv, ctx);
      }
      return;
    }
    case 'ForRange': {
      const from = evaluate(stmt.from, env, ctx);
      const to = evaluate(stmt.to, env, ctx);
      if (typeof from !== 'number' || typeof to !== 'number') {
        throw Makosa.ainaMbaya('Mipaka ya "kutoka ... hadi" lazima iwe namba.', stmt.line);
      }
      // Inclusive both ends. Step +1 up, -1 down.
      if (from <= to) {
        for (let i = from; i <= to; i++) {
          const loopEnv = new Environment(env);
          loopEnv.declare(stmt.varName, i);
          execBlock(stmt.body, loopEnv, ctx);
        }
      } else {
        for (let i = from; i >= to; i--) {
          const loopEnv = new Environment(env);
          loopEnv.declare(stmt.varName, i);
          execBlock(stmt.body, loopEnv, ctx);
        }
      }
      return;
    }
    case 'While': {
      while (isTruthy(evaluate(stmt.cond, env, ctx))) {
        execBlock(stmt.body, new Environment(env), ctx);
      }
      return;
    }
    case 'FuncDecl': {
      const fn: SnilFunction = {
        __snilFn: true,
        name: stmt.name,
        params: stmt.params,
        body: stmt.body,
        closure: env,
      };
      env.declare(stmt.name, fn);
      return;
    }
    case 'Return': {
      const value = stmt.value ? evaluate(stmt.value, env, ctx) : null;
      throw new ReturnSignal(value);
    }
    case 'Try': {
      try {
        execBlock(stmt.body, new Environment(env), ctx);
      } catch (e) {
        if (e instanceof ReturnSignal) throw e;       // never swallow returns
        if (e instanceof SnilError) {
          execBlock(stmt.handler, new Environment(env), ctx);
        } else {
          throw e;
        }
      }
      return;
    }
    case 'Import': {
      if (!stmt.isFile) {
        // Stdlib: `leta hisabati` copies the module's functions into the flat namespace.
        const mod = STDLIB[stmt.module];
        if (!mod) {
          throw new SnilError(`Moduli "${stmt.module}" haipatikani.`, stmt.line, 'kutekeleza',
            'moduli zinazopatikana: hisabati, maandishi, muda, faili');
        }
        for (const [name, fn] of Object.entries(mod)) ctx.builtins.set(name, fn);
        return;
      }
      // File module: `leta "salamu"` loads (once) and exposes its top-level
      // kazi + weka into the CURRENT scope as bare names.
      const exports = loadModule(stmt.module, stmt.line, ctx);
      for (const [name, value] of exports) env.declare(name, value);
      return;
    }
    case 'ListAdd': {
      const list = evaluate(stmt.list, env, ctx);
      const item = evaluate(stmt.item, env, ctx);
      if (!Array.isArray(list)) {
        throw Makosa.ainaMbaya('"ongeza ... kwenye" inahitaji orodha.', stmt.line);
      }
      list.push(item);
      return;
    }
    case 'ListRemove': {
      const list = evaluate(stmt.list, env, ctx);
      const item = evaluate(stmt.item, env, ctx);
      if (!Array.isArray(list)) {
        throw Makosa.ainaMbaya('"ondoa ... kutoka" inahitaji orodha.', stmt.line);
      }
      const idx = list.findIndex((x) => valuesEqual(x, item));
      if (idx >= 0) list.splice(idx, 1);
      return;
    }
    case 'FileWrite': {
      const data = displayString(evaluate(stmt.data, env, ctx));
      const path = displayString(evaluate(stmt.path, env, ctx));
      if (!ctx.io.andikaFaili) {
        throw new SnilError('Uandishi wa faili haupatikani katika mazingira haya.', stmt.line, 'kutekeleza');
      }
      ctx.io.andikaFaili(path, data);
      return;
    }
    case 'FileRead': {
      const path = displayString(evaluate(stmt.path, env, ctx));
      if (!ctx.io.somaFaili) {
        throw new SnilError('Usomaji wa faili haupatikani katika mazingira haya.', stmt.line, 'kutekeleza');
      }
      env.declare(stmt.name, ctx.io.somaFaili(path));
      return;
    }
    case 'ExprStmt': {
      evaluate(stmt.expr, env, ctx);
      return;
    }
    default: {
      const _exhaustive: never = stmt;
      throw new SnilError(`Aina ya kauli haijulikani: ${(_exhaustive as Stmt).kind}`, (stmt as Stmt).line, 'kutekeleza');
    }
  }
}

function assignTo(target: Ident | Index | Member, value: SnilValue, env: Environment, ctx: Ctx): void {
  switch (target.kind) {
    case 'Ident': {
      env.assign(target.name, value);
      return;
    }
    case 'Index': {
      const container = evaluate(target.target, env, ctx);
      const key = evaluate(target.index, env, ctx);
      if (Array.isArray(container)) {
        if (typeof key !== 'number' || !Number.isInteger(key)) {
          throw Makosa.ainaMbaya('Faharasa ya orodha lazima iwe namba kamili.', target.line);
        }
        if (key < 0 || key >= container.length) {
          throw Makosa.ainaMbaya(`Faharasa ${key} iko nje ya mipaka ya orodha.`, target.line);
        }
        container[key] = value;
        return;
      }
      if (container instanceof Map) {
        container.set(String(key), value);
        return;
      }
      throw Makosa.ainaMbaya('Huwezi kuweka thamani kwa faharasa kwenye aina hii.', target.line);
    }
    case 'Member': {
      const container = evaluate(target.target, env, ctx);
      if (container instanceof Map) {
        container.set(target.name, value);
        return;
      }
      throw Makosa.ainaMbaya('Huwezi kuweka thamani kwa kiungo kwenye aina isiyo kamusi.', target.line);
    }
  }
}

// ───────────────────────── Expressions ─────────────────────────
function evaluate(expr: Expr, env: Environment, ctx: Ctx): SnilValue {
  switch (expr.kind) {
    case 'NumberLit': return expr.value;
    case 'StringLit': return expr.value;
    case 'TemplateString': {
      // Concatenate parts using the SAME stringify as `+` / `onyesha` display.
      let s = '';
      for (const p of expr.parts) {
        s += p.t === 'lit' ? p.value : displayString(evaluate(p.expr, env, ctx));
      }
      return s;
    }
    case 'BoolLit': return expr.value;
    case 'NullLit': return null;
    case 'ListLit': return expr.items.map((it) => evaluate(it, env, ctx));
    case 'DictLit': {
      const map: SnilDict = new Map();
      for (const { key, value } of expr.entries) map.set(key, evaluate(value, env, ctx));
      return map;
    }
    case 'Ident': return env.get(expr.name, expr.line);
    case 'Unary': return evalUnary(expr.op, evaluate(expr.operand, env, ctx), expr.line);
    case 'Binary': return evalBinary(expr, env, ctx);
    case 'Call': return evalCall(expr, env, ctx);
    case 'Index': {
      const target = evaluate(expr.target, env, ctx);
      const index = evaluate(expr.index, env, ctx);
      return indexValue(target, index, expr.line);
    }
    case 'Member': {
      const target = evaluate(expr.target, env, ctx);
      if (target instanceof Map) {
        if (!target.has(expr.name)) {
          throw Makosa.ainaMbaya(`Kamusi haina kiungo "${expr.name}".`, expr.line);
        }
        return target.get(expr.name)!;
      }
      throw Makosa.ainaMbaya('Kiungo (.) kinaweza kutumika kwenye kamusi tu.', expr.line);
    }
    default: {
      const _exhaustive: never = expr;
      throw new SnilError(`Aina ya usemi haijulikani: ${(_exhaustive as Expr).kind}`, (expr as Expr).line, 'kutekeleza');
    }
  }
}

function evalUnary(op: '-' | 'sio', operand: SnilValue, line: number): SnilValue {
  if (op === '-') {
    if (typeof operand !== 'number') {
      throw Makosa.ainaMbaya('Alama ya kuondoa (-) inahitaji namba.', line);
    }
    return -operand;
  }
  // sio = logical not
  return !isTruthy(operand);
}

function evalBinary(
  expr: { op: string; left: Expr; right: Expr; line: number },
  env: Environment,
  ctx: Ctx,
): SnilValue {
  const { op, line } = expr;
  // Short-circuit logical operators.
  if (op === 'na') {
    const l = evaluate(expr.left, env, ctx);
    if (!isTruthy(l)) return false;
    return isTruthy(evaluate(expr.right, env, ctx));
  }
  if (op === 'au') {
    const l = evaluate(expr.left, env, ctx);
    if (isTruthy(l)) return true;
    return isTruthy(evaluate(expr.right, env, ctx));
  }

  const left = evaluate(expr.left, env, ctx);
  const right = evaluate(expr.right, env, ctx);

  switch (op) {
    case '+': {
      // String concat if EITHER side is a string; otherwise numeric add.
      if (typeof left === 'string' || typeof right === 'string') {
        return displayString(left) + displayString(right);
      }
      requireNumbers(left, right, line, '+');
      return (left as number) + (right as number);
    }
    case '-': requireNumbers(left, right, line, '-'); return (left as number) - (right as number);
    case '*': requireNumbers(left, right, line, '*'); return (left as number) * (right as number);
    case '/': {
      requireNumbers(left, right, line, '/');
      if ((right as number) === 0) throw Makosa.kugawanyaNaSifuri(line);
      return (left as number) / (right as number);
    }
    case '%': {
      requireNumbers(left, right, line, '%');
      if ((right as number) === 0) throw Makosa.kugawanyaNaSifuri(line);
      return (left as number) % (right as number);
    }
    case '==': return valuesEqual(left, right);
    case '!=': return !valuesEqual(left, right);
    case '<': requireNumbers(left, right, line, '<'); return (left as number) < (right as number);
    case '>': requireNumbers(left, right, line, '>'); return (left as number) > (right as number);
    case '<=': requireNumbers(left, right, line, '<='); return (left as number) <= (right as number);
    case '>=': requireNumbers(left, right, line, '>='); return (left as number) >= (right as number);
    default:
      throw new SnilError(`Opereta "${op}" haijulikani.`, line, 'kutekeleza');
  }
}

function evalCall(
  expr: { callee: string; args: Expr[]; line: number },
  env: Environment,
  ctx: Ctx,
): SnilValue {
  const args = expr.args.map((a) => evaluate(a, env, ctx));

  // 1) User-defined function (variable holding a kazi) takes priority.
  if (env.has(expr.callee)) {
    const target = env.get(expr.callee, expr.line);
    if (isSnilFunction(target)) {
      return callFunction(target, args, expr.line, ctx);
    }
  }

  // 2) Builtins / imported stdlib functions.
  const builtin = ctx.builtins.get(expr.callee);
  if (builtin) {
    return builtin(args, ctx.io) as SnilValue;
  }

  throw Makosa.kaziHaijulikani(expr.callee, expr.line);
}

function callFunction(fn: SnilFunction, args: SnilValue[], line: number, ctx: Ctx): SnilValue {
  if (args.length !== fn.params.length) {
    throw Makosa.ainaMbaya(
      `Kazi "${fn.name}" inahitaji hoja ${fn.params.length} lakini imepewa ${args.length}.`,
      line,
    );
  }
  const fnEnv = new Environment(fn.closure);
  fn.params.forEach((p, i) => fnEnv.declare(p, args[i]));
  try {
    execBlock(fn.body, fnEnv, ctx);
  } catch (e) {
    if (e instanceof ReturnSignal) return e.value;
    throw e;
  }
  return null; // no explicit rudisha → tupu
}

function indexValue(target: SnilValue, index: SnilValue, line: number): SnilValue {
  if (typeof target === 'string') {
    if (typeof index !== 'number' || !Number.isInteger(index)) {
      throw Makosa.ainaMbaya('Faharasa ya maandishi lazima iwe namba kamili.', line);
    }
    if (index < 0 || index >= target.length) {
      throw Makosa.ainaMbaya(`Faharasa ${index} iko nje ya mipaka ya maandishi.`, line);
    }
    return target[index];
  }
  if (Array.isArray(target)) {
    if (typeof index !== 'number' || !Number.isInteger(index)) {
      throw Makosa.ainaMbaya('Faharasa ya orodha lazima iwe namba kamili.', line);
    }
    if (index < 0 || index >= target.length) {
      throw Makosa.ainaMbaya(`Faharasa ${index} iko nje ya mipaka ya orodha.`, line);
    }
    return target[index];
  }
  if (target instanceof Map) {
    const key = String(index);
    if (!target.has(key)) throw Makosa.ainaMbaya(`Kamusi haina ufunguo "${key}".`, line);
    return target.get(key)!;
  }
  throw Makosa.ainaMbaya('Aina hii haiwezi kufikiwa kwa faharasa [ ].', line);
}

function iterableToArray(value: SnilValue, line: number): SnilValue[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split('');
  throw Makosa.ainaMbaya('"kwa kila ... katika" inahitaji orodha au maandishi.', line);
}

// ───────────────────────── Helpers: truthiness, equality, display ─────────────────────────
function isTruthy(v: SnilValue): boolean {
  if (v === false || v === null) return false;
  if (v === 0) return false;
  if (v === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

function valuesEqual(a: SnilValue, b: SnilValue): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => valuesEqual(x, b[i]));
  }
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) {
      if (!b.has(k) || !valuesEqual(v, b.get(k)!)) return false;
    }
    return true;
  }
  return false;
}

function requireNumbers(a: SnilValue, b: SnilValue, line: number, op: string): void {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw Makosa.ainaMbaya(`Opereta "${op}" inahitaji namba pande zote mbili.`, line);
  }
}

/** Display form per GRAMMAR.md — the single source of truth for `onyesha` output. */
export function displayString(v: SnilValue): string {
  if (v === null) return 'tupu';
  if (v === true) return 'kweli';
  if (v === false) return 'si_kweli';
  if (typeof v === 'number') return formatNumber(v);
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return '[' + v.map(displayString).join(', ') + ']';
  if (v instanceof Map) {
    const parts: string[] = [];
    for (const [k, val] of v) parts.push(`${k}: ${displayString(val)}`);
    return '{' + parts.join(', ') + '}';
  }
  if (isSnilFunction(v)) return `<kazi ${v.name}>`;
  if (typeof v === 'function') return '<kazi-asili>';
  return String(v);
}

function formatNumber(n: number): string {
  // Integers without ".0"; decimals as-is. (Number.isInteger handles both.)
  return String(n);
}

/** `uliza` binding rule: if the trimmed input parses cleanly as a finite number,
 *  store a number; otherwise store the raw string. Empty input stays as the raw
 *  string (so "" remains falsy text, never the number 0). */
function parseInput(raw: string): SnilValue {
  const trimmed = raw.trim();
  if (trimmed === '') return raw;
  const n = Number(trimmed);
  if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  return raw;
}
