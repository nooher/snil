// index.ts — the public surface of the SNIL toolchain. Playground, CLI and tests
// use ONLY these. Pipeline:  source → tokenize → parse → (interpret | toPython).
import { tokenize } from './lexer';
import { parse as parseTokens } from './parser';
import { interpret } from './interpreter';
import { generatePython } from './codegen_python';
import { SnilError } from './errors';
import type { Program } from './ast';
import type { SnilIO, RunResult, ModuleResolver } from './runtime';

export { tokenize } from './lexer';
export { SnilError } from './errors';
export type { Token } from './tokens';
export type { Program } from './ast';
export type { SnilIO, RunResult, ModuleResolver } from './runtime';

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
    somaModuli: io.somaModuli,
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
  return generatePython(parse(source), somaModuli);
}
