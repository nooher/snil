#!/usr/bin/env node
// snil.ts — the SNIL command-line interface. Runs and compiles SNIL programs
// outside the browser. Commands and messages are Kiswahili (Constitution
// Article 6: Kiswahili First). Usage:
//   snil endesha <faili.snil>                   — tekeleza programu
//   snil tengeneza <faili.snil> [--toka out.py] — tafsiri kwenda Python
//   snil msaada | --msaada                      — onyesha msaada
//   snil --toleo                                — onyesha toleo
//
// The SNIL language modules import each other with extensionless specifiers,
// which Vite resolves for the browser/tests but Node's strict ESM resolver does
// not. We register a tiny resolution hook FIRST (so it is active before the
// language modules load), then dynamically import the toolchain.
import { register } from 'node:module';
import * as fs from 'node:fs';
import * as nodePath from 'node:path';
import * as process from 'node:process';
import { pathToFileURL } from 'node:url';

register('./ts_resolver.ts', import.meta.url);

const { run, toPython, SnilError } = await import('../src/lang/index.ts');
const { formatError } = await import('../src/lang/diagnose.ts');
const { nodeIO, fsModuleResolver } = await import('../src/lang/node_io.ts');
const { formatSnil } = await import('../src/lang/format.ts');
const { combineResolvers, registryResolver, standardRegistryResolver } = await import(
  '../src/lang/packages/registry.ts'
);
const { createRemoteRegistry, scanImports } = await import('../src/lang/packages/remote.ts');
type ModuleResolver = import('../src/lang/runtime.ts').ModuleResolver;
type Registry = import('../src/lang/packages/registry.ts').Registry;
type RemoteRegistry = import('../src/lang/packages/remote.ts').RemoteRegistry;

/**
 * The module resolver used by `endesha` / `tengeneza`. Precedence (first wins):
 *   1. local files relative to the entry file's directory  (fsModuleResolver)
 *   2. an optional `snil_pakeji/` directory next to the entry file — a place to
 *      drop extra packages as `snil_pakeji/<pkg>/<module>.snil` or
 *      `snil_pakeji/<pkg>.snil` (resolved like ordinary files)
 *   3. the bundled STANDARD registry (tarehe / jiometri / takwimu), offline.
 * So a local module ALWAYS shadows a package of the same name.
 */
function cliResolver(baseDir: string, remote?: RemoteRegistry): ModuleResolver {
  const pakejiDir = nodePath.join(baseDir, 'snil_pakeji');
  const layers: (ModuleResolver | null)[] = [fsModuleResolver(baseDir)];
  try {
    if (fs.statSync(pakejiDir).isDirectory()) {
      // Read any *.snil under snil_pakeji/ into an ad-hoc registry so that
      // `snil_pakeji/foo/foo.snil` is importable as `leta "foo"`.
      const reg: Registry = {};
      for (const entry of fs.readdirSync(pakejiDir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          const sub = nodePath.join(pakejiDir, entry.name);
          const modules: Record<string, string> = {};
          for (const f of fs.readdirSync(sub)) {
            if (f.endsWith('.snil')) {
              modules[f.replace(/\.snil$/, '')] = fs.readFileSync(nodePath.join(sub, f), 'utf-8');
            }
          }
          if (Object.keys(modules).length) reg[entry.name] = { version: 'local', maelezo: '', modules };
        } else if (entry.isFile() && entry.name.endsWith('.snil')) {
          const nm = entry.name.replace(/\.snil$/, '');
          reg[nm] = { version: 'local', maelezo: '', modules: { [nm]: fs.readFileSync(nodePath.join(pakejiDir, entry.name), 'utf-8') } };
        }
      }
      if (Object.keys(reg).length) layers.push(registryResolver(reg));
    }
  } catch {
    // no snil_pakeji/ — fine.
  }
  layers.push(standardRegistryResolver);
  // Remote registry LAST — local file → snil_pakeji/ cache → standard → remote.
  // (The remote resolver reads only its in-memory cache, warmed by prefetch.)
  if (remote) layers.push(remote.resolver);
  return combineResolvers(...layers);
}

/**
 * The configured remote registry URL, from `--registry <url>` (consumed off the
 * args) or the `SNIL_REGISTRY` env var. Returns { url, rest } where `rest` is the
 * args with the flag removed. No URL → url is undefined.
 */
function chukuaRegistry(args: string[]): { url: string | undefined; rest: string[] } {
  const rest: string[] = [];
  let url: string | undefined = process.env.SNIL_REGISTRY || undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--registry') {
      url = args[i + 1];
      i++;
    } else {
      rest.push(args[i]);
    }
  }
  return { url, rest };
}

/**
 * If a registry URL is configured, build a remote registry SEEDED from the on-disk
 * snil_pakeji/ cache (so prior fetches work offline), prefetch this program's
 * `leta "..."` imports that aren't already local/standard/cached, then WRITE any
 * newly fetched packages to snil_pakeji/<pkg>/<module>.snil for next time. Returns
 * the remote handle (or undefined if no URL). Network failure is non-fatal.
 */
async function andaaRegistry(
  source: string,
  baseDir: string,
  url: string | undefined,
): Promise<RemoteRegistry | undefined> {
  if (!url) return undefined;
  const remote = createRemoteRegistry(url, fetch as never);
  // A predicate so we don't fetch what a higher layer already satisfies.
  const local = cliResolver(baseDir); // local → snil_pakeji/ → standard
  const isLocal = (name: string) => local(name) != null;
  const wanted = scanImports(source).filter((n) => !isLocal(n));
  if (wanted.length === 0) return remote;
  try {
    await remote.prefetch(wanted);
  } catch {
    return remote; // offline / down — fall through to Kiswahili error on miss
  }
  // Persist freshly fetched packages to snil_pakeji/ so the next run is offline.
  const fetched = remote.cached();
  const pakejiDir = nodePath.join(baseDir, 'snil_pakeji');
  for (const name of wanted) {
    const pkg = fetched[name];
    if (!pkg) continue;
    try {
      const dir = nodePath.join(pakejiDir, name);
      fs.mkdirSync(dir, { recursive: true });
      for (const [mod, src] of Object.entries(pkg.modules)) {
        fs.writeFileSync(nodePath.join(dir, mod + '.snil'), src, 'utf-8');
      }
    } catch {
      // cache write failed (read-only fs etc.) — in-memory copy still works.
    }
  }
  return remote;
}

const TOLEO = 'SNIL 0.1';

const MSAADA = `SNIL — lugha ya programu ya Kiswahili (na Laetoli)

Matumizi:
  snil endesha <faili.snil> [--registry URL]   Tekeleza programu ya SNIL
  snil tengeneza <faili.snil> [--toka out.py]  Tafsiri SNIL kuwa Python
  snil nadhifu <faili.snil> [--badili]         Nadhifisha mpangilio wa SNIL
  snil msaada                                  Onyesha ujumbe huu
  snil --toleo                                 Onyesha toleo la SNIL

Rejista ya mbali (hiari): tumia --registry URL au SNIL_REGISTRY=URL.
  Pakeji hupakuliwa mara moja kisha huhifadhiwa katika snil_pakeji/ (offline).

Mifano:
  snil endesha examples/habari.snil
  snil tengeneza examples/hesabu.snil --toka hesabu.py
  snil nadhifu examples/duka.snil --badili
`;

/** Read a source file; on failure print a Kiswahili error to stderr + exit 1. */
function somaChanzo(path: string): string {
  try {
    return fs.readFileSync(path, 'utf-8');
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      process.stderr.write(`Hitilafu: faili "${path}" halipatikani.\n`);
    } else if (code === 'EISDIR') {
      process.stderr.write(`Hitilafu: "${path}" ni saraka, si faili.\n`);
    } else {
      process.stderr.write(`Hitilafu: imeshindwa kusoma "${path}" (${String((e as Error)?.message ?? e)}).\n`);
    }
    process.exit(1);
  }
}

async function amriEndesha(args: string[]): Promise<void> {
  const { url, rest } = chukuaRegistry(args);
  const path = rest[0];
  if (!path) {
    process.stderr.write('Hitilafu: taja faili la kuendesha. Mfano: snil endesha programu.snil\n');
    process.exit(1);
  }
  const source = somaChanzo(path);
  // File imports (`leta "jina"`) resolve relative to the entry file's directory.
  const baseDir = nodePath.dirname(path);
  const remote = await andaaRegistry(source, baseDir, url);
  const result = run(source, { ...nodeIO(), somaModuli: cliResolver(baseDir, remote) }); // output streams via nodeIO.andika
  if (result.error) {
    process.stderr.write(formatError(source, result.error) + '\n');
    process.exit(1);
  }
}

async function amriTengeneza(args: string[]): Promise<void> {
  const { url, rest: rArgs } = chukuaRegistry(args);
  args = rArgs;
  let path: string | undefined;
  let toka: string | undefined;
  const ulikuwepoToka = args.includes('--toka');
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--toka') {
      toka = args[i + 1];
      i++;
    } else if (!path) {
      path = args[i];
    }
  }
  if (!path) {
    process.stderr.write('Hitilafu: taja faili la kutengeneza. Mfano: snil tengeneza programu.snil\n');
    process.exit(1);
  }
  if (ulikuwepoToka && toka === undefined) {
    process.stderr.write('Hitilafu: "--toka" inahitaji njia ya faili la matokeo.\n');
    process.exit(1);
  }
  const source = somaChanzo(path);
  const baseDir = nodePath.dirname(path);
  const remote = await andaaRegistry(source, baseDir, url);
  let python: string;
  try {
    // Inline file imports + packages relative to the entry file's directory.
    python = toPython(source, cliResolver(baseDir, remote));
  } catch (e) {
    const err = e instanceof SnilError
      ? e
      : new SnilError(String((e as Error)?.message ?? e), 0, 'kuchanganua');
    process.stderr.write(formatError(source, err) + '\n');
    process.exit(1);
  }
  if (toka) {
    try {
      fs.writeFileSync(toka, python, 'utf-8');
    } catch (e) {
      process.stderr.write(`Hitilafu: imeshindwa kuandika "${toka}" (${String((e as Error)?.message ?? e)}).\n`);
      process.exit(1);
    }
    process.stdout.write(`Imetengenezwa: ${toka}\n`);
  } else {
    process.stdout.write(python + (python.endsWith('\n') ? '' : '\n'));
  }
}

function amriNadhifu(args: string[]): void {
  let path: string | undefined;
  let toka: string | undefined;
  let badili = false;
  const ulikuwepoToka = args.includes('--toka');
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--toka') {
      toka = args[i + 1];
      i++;
    } else if (args[i] === '--badili') {
      badili = true;
    } else if (!path) {
      path = args[i];
    }
  }
  if (!path) {
    process.stderr.write('Hitilafu: taja faili la kunadhifisha. Mfano: snil nadhifu programu.snil\n');
    process.exit(1);
  }
  if (ulikuwepoToka && toka === undefined) {
    process.stderr.write('Hitilafu: "--toka" inahitaji njia ya faili la matokeo.\n');
    process.exit(1);
  }
  const source = somaChanzo(path);
  let nadhifu: string;
  try {
    nadhifu = formatSnil(source);
  } catch (e) {
    const err = e instanceof SnilError
      ? e
      : new SnilError(String((e as Error)?.message ?? e), 0, 'kuchanganua');
    process.stderr.write(formatError(source, err) + '\n');
    process.exit(1);
  }
  if (toka) {
    try {
      fs.writeFileSync(toka, nadhifu, 'utf-8');
    } catch (e) {
      process.stderr.write(`Hitilafu: imeshindwa kuandika "${toka}" (${String((e as Error)?.message ?? e)}).\n`);
      process.exit(1);
    }
    process.stdout.write(`Imenadhifishwa: ${toka}\n`);
  } else if (badili) {
    try {
      fs.writeFileSync(path, nadhifu, 'utf-8');
    } catch (e) {
      process.stderr.write(`Hitilafu: imeshindwa kuandika "${path}" (${String((e as Error)?.message ?? e)}).\n`);
      process.exit(1);
    }
    process.stdout.write(`Imenadhifishwa: ${path}\n`);
  } else {
    process.stdout.write(nadhifu);
  }
}

async function main(): Promise<void> {
  // Quiet the experimental-loader warning so CLI output stays clean Kiswahili.
  void pathToFileURL;
  const argv = process.argv.slice(2);
  const amri = argv[0];

  if (!amri || amri === 'msaada' || amri === '--msaada' || amri === '-h' || amri === '--help') {
    process.stdout.write(MSAADA);
    return;
  }
  if (amri === '--toleo' || amri === '-v' || amri === 'toleo') {
    process.stdout.write(TOLEO + '\n');
    return;
  }
  if (amri === 'endesha') {
    await amriEndesha(argv.slice(1));
    return;
  }
  if (amri === 'tengeneza') {
    await amriTengeneza(argv.slice(1));
    return;
  }
  if (amri === 'nadhifu') {
    amriNadhifu(argv.slice(1));
    return;
  }

  process.stderr.write(`Hitilafu: amri "${amri}" haijulikani. Jaribu "snil msaada".\n`);
  process.exit(1);
}

main();
