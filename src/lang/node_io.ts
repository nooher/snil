// node_io.ts — the SnilIO implementation for running SNIL outside the browser.
// `onyesha` writes to stdout; `uliza` reads a line SYNCHRONOUSLY from stdin (the
// interpreter is synchronous, so we cannot use async readline). Files are real.
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import type { SnilIO, ModuleResolver } from './runtime';

/**
 * Read one line synchronously from fd 0 (stdin), byte by byte, until "\n" or
 * EOF. Returns the line WITHOUT the trailing newline. On EOF with nothing read,
 * returns "". This is the standard sync-stdin pattern: the interpreter blocks
 * here just like a real REPL would.
 */
function readLineSync(): string {
  const bytes: number[] = [];
  const buf = Buffer.alloc(1);
  while (true) {
    let n = 0;
    try {
      n = fs.readSync(0, buf, 0, 1, null);
    } catch (e) {
      // EAGAIN can happen on some platforms when stdin is non-blocking; retry.
      if ((e as NodeJS.ErrnoException)?.code === 'EAGAIN') continue;
      break;
    }
    if (n === 0) break; // EOF
    const c = buf[0];
    if (c === 0x0a) break; // "\n"
    bytes.push(c);
  }
  let line = Buffer.from(bytes).toString('utf-8');
  if (line.endsWith('\r')) line = line.slice(0, -1); // strip CR on Windows
  return line;
}

/**
 * Build a filesystem-backed ModuleResolver for `leta "jina"`. A module name is
 * resolved relative to `baseDir` (the directory of the entry file). We try the
 * name verbatim first, then `name + ".snil"`. Returns the file's utf-8 contents,
 * or null if neither path is a readable file (any error → null, never throws).
 */
export function fsModuleResolver(baseDir: string): ModuleResolver {
  return (name: string): string | null => {
    const candidates = [path.join(baseDir, name), path.join(baseDir, name + '.snil')];
    for (const candidate of candidates) {
      try {
        const stat = fs.statSync(candidate);
        if (stat.isFile()) return fs.readFileSync(candidate, 'utf-8');
      } catch {
        // not found / not readable — try the next candidate.
      }
    }
    return null;
  };
}

/** Build a SnilIO backed by real stdin/stdout and the real filesystem. */
export function nodeIO(): SnilIO {
  return {
    andika: (text: string) => {
      process.stdout.write(text + '\n');
    },
    uliza: (prompt: string) => {
      if (prompt) process.stdout.write(prompt);
      return readLineSync();
    },
    somaFaili: (path: string) => fs.readFileSync(path, 'utf-8'),
    andikaFaili: (path: string, data: string) => fs.writeFileSync(path, data, 'utf-8'),
  };
}
