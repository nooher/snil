// runtime.ts — the I/O contract shared by the interpreter and the playground.
// `onyesha` writes via io.andika; `uliza` reads via io.uliza. Files are virtual so
// programs run fully in the browser (offline, zero-install).
import type { SnilError } from './errors';

export interface SnilIO {
  /** Sink for `onyesha` output (one logical line per call). */
  andika: (text: string) => void;
  /** Source for `uliza` input (synchronous). Default may return ''. */
  uliza: (prompt: string) => string;
  /** Virtual file read for `soma`. */
  somaFaili?: (path: string) => string;
  /** Virtual file write for `andika ... kwenye`. */
  andikaFaili?: (path: string, data: string) => void;
}

export interface RunResult {
  output: string;          // everything `onyesha` produced, joined by "\n"
  error: SnilError | null; // first error, already Kiswahili
}
