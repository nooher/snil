// ts_resolver.ts — a tiny ESM resolution hook so the SNIL toolchain can run
// under plain `node --experimental-strip-types`. The language modules import
// each other with extensionless specifiers (e.g. `./lexer`), which Vite resolves
// in the browser/tests but Node's strict ESM resolver does not. This hook
// appends `.ts` (or `/index.ts`) to relative specifiers that point at a real
// TypeScript file — it changes nothing about the language itself.
import * as fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface ResolveContext {
  parentURL?: string;
}
type NextResolve = (
  specifier: string,
  context: ResolveContext,
) => Promise<{ url: string; format?: string | null; shortCircuit?: boolean }>;

export async function resolve(
  specifier: string,
  context: ResolveContext,
  next: NextResolve,
): Promise<{ url: string; format?: string | null; shortCircuit?: boolean }> {
  // Only intervene for relative, extensionless specifiers.
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[cm]?[jt]s$/.test(specifier)) {
    const parent = context.parentURL ?? pathToFileURL(process.cwd() + '/').href;
    const baseUrl = new URL(specifier, parent);
    const basePath = fileURLToPath(baseUrl);
    const candidates = [`${basePath}.ts`, `${basePath}/index.ts`];
    for (const candidate of candidates) {
      try {
        if (fs.statSync(candidate).isFile()) {
          // Let Node infer the format (.ts → type-stripping) by not setting it.
          return { url: pathToFileURL(candidate).href, shortCircuit: true };
        }
      } catch {
        // not this candidate; keep looking
      }
    }
  }
  return next(specifier, context);
}
