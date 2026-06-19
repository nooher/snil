// index.ts — the public surface of the SNIL toolchain. Playground, CLI and tests
// use ONLY these. Pipeline:  source → tokenize → parse → (interpret | toPython).
import { tokenize } from './lexer';
import { parse as parseTokens } from './parser';
import { interpret, createSession, displayString } from './interpreter';
import { generatePython, generatePythonWithMap } from './codegen_python';
import { generateJS, generateJSWithMap } from './codegen_js';
import { buildSourceMap } from './sourcemap';
import type { SourceMap } from './sourcemap';
import { SnilError } from './errors';
import { combineResolvers, standardRegistryResolver } from './packages/registry';
import type { Program } from './ast';
import type { SnilIO, RunResult, ModuleResolver } from './runtime';

export {
  STANDARD_REGISTRY,
  registryResolver,
  combineResolvers,
  resolveFromRegistry,
  standardRegistryResolver,
} from './packages/registry';
export type { Registry, SnilPackage } from './packages/registry';

export { tokenize } from './lexer';
export { buildSourceMap, encodeVLQ, decodeVLQ } from './sourcemap';
export type { SourceMap, SourceMapV3, SourceMapEntry } from './sourcemap';
export { mapTargetLineToSource, formatTargetError } from './diagnose';
export { SnilError } from './errors';
export type { Token } from './tokens';
export type { Program } from './ast';
export type { SnilIO, RunResult, ModuleResolver } from './runtime';
export type { SnilValue, SnilSession } from './interpreter';

/** One line evaluated in an interactive session. */
export interface ReplResult {
  output: string;          // everything `onyesha` produced this line, joined by "\n"
  value?: string;          // displayed form of a bare-expression result (undefined for statements)
  error: SnilError | null; // Kiswahili error, if any — session stays alive
}

/** An interactive REPL ("Jaribio"): state persists across `eval` calls. Like `run`,
 *  it captures `onyesha` output and never throws — errors come back in Kiswahili. */
export interface ReplSession {
  eval(line: string, io?: Partial<SnilIO>): ReplResult;
}

/** Create a persistent SNIL REPL session. Wraps the interpreter session with
 *  per-line output capture. `value` is the displayed bare-expression result. */
export function createReplSession(): ReplSession {
  const session = createSession();
  return {
    eval(line: string, io: Partial<SnilIO> = {}): ReplResult {
      const lines: string[] = [];
      const fullIO: SnilIO = {
        andika: io.andika ?? ((t) => lines.push(t)),
        uliza: io.uliza ?? (() => ''),
        somaFaili: io.somaFaili,
        andikaFaili: io.andikaFaili,
        somaModuli: io.somaModuli,
      };
      const { value, error } = session.evalLine(line, fullIO);
      return {
        output: lines.join('\n'),
        value: value === undefined ? undefined : displayString(value),
        error,
      };
    },
  };
}

/** Source → AST (tokenize + parse). Throws SnilError on lexical/syntax errors. */
export function parse(source: string): Program {
  return parseTokens(tokenize(source));
}

/** Run SNIL source. Captures `onyesha` output; never throws — errors come back in Kiswahili. */
export function run(source: string, io: Partial<SnilIO> = {}): RunResult {
  const lines: string[] = [];
  const fullIO: SnilIO = {
    andika: io.andika ?? ((t) => lines.push(t)),
    uliza: io.uliza ?? (() => ''),
    somaFaili: io.somaFaili,
    andikaFaili: io.andikaFaili,
    // Layer the bundled standard package registry AFTER any caller resolver, so a
    // local/workspace module always shadows a package, but `leta "takwimu"` works
    // even with no explicit resolver. (browser/CLI pass their own combined resolver.)
    somaModuli: combineResolvers(io.somaModuli, standardRegistryResolver),
  };
  try {
    interpret(parse(source), fullIO);
    return { output: lines.join('\n'), error: null };
  } catch (e) {
    const err = e instanceof SnilError ? e : new SnilError(String((e as Error)?.message ?? e), 0, 'kutekeleza');
    return { output: lines.join('\n'), error: err };
  }
}

/** Source → equivalent Python (first compilation target). Throws SnilError on syntax errors. */
export function toPython(source: string, somaModuli?: ModuleResolver): string {
  return generatePython(parse(source), combineResolvers(somaModuli, standardRegistryResolver));
}

/** Source → equivalent JavaScript (ES2020, runnable via `node`). Throws SnilError on syntax errors. */
export function toJS(source: string, somaModuli?: ModuleResolver): string {
  return generateJS(parse(source), combineResolvers(somaModuli, standardRegistryResolver));
}

/**
 * Source → equivalent Python AND a source map. The `code` is byte-identical to
 * `toPython(source, resolver)`; the `map` traces each 1-based generated Python
 * line back to the 1-based SNIL source line it came from (line-level; the runtime
 * prelude maps to 0 = no SNIL origin). Throws SnilError on syntax errors.
 */
export function toPythonWithMap(
  source: string,
  somaModuli?: ModuleResolver,
): { code: string; map: SourceMap } {
  const { code, srcLines } = generatePythonWithMap(
    parse(source),
    combineResolvers(somaModuli, standardRegistryResolver),
  );
  return { code, map: buildSourceMap(srcLines, 'main.snil', source) };
}

/**
 * Source → equivalent JavaScript AND a source map. The `code` is byte-identical to
 * `toJS(source, resolver)`; the `map` traces each 1-based generated JS line back to
 * the 1-based SNIL source line (line-level; prelude → 0). Throws on syntax errors.
 */
export function toJSWithMap(
  source: string,
  somaModuli?: ModuleResolver,
): { code: string; map: SourceMap } {
  const { code, srcLines } = generateJSWithMap(
    parse(source),
    combineResolvers(somaModuli, standardRegistryResolver),
  );
  return { code, map: buildSourceMap(srcLines, 'main.snil', source) };
}
