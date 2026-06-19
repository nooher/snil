// remote.ts — a REMOTE registry layer for SNIL. Sovereign + offline-friendly.
//
// SNIL's `ModuleResolver` is SYNCHRONOUS `(name) => string | null`, but fetching
// a package from a remote registry is ASYNC. We bridge the two phases cleanly:
//
//   1. PREFETCH (async):  `prefetch([...names])` fetches each package's JSON over
//      the network and stores it in an in-memory cache.
//   2. RESOLVE (sync):    `.resolver` reads ONLY from that cache — never the
//      network — so it slots in beside `standardRegistryResolver` with
//      `combineResolvers`, exactly like any other resolver.
//
// Therefore: callers MUST `await prefetch(...)` (or `await prefetchImports(...)`)
// BEFORE a synchronous `run` / `toPython` / `toJS`. The browser playground does
// `await prefetchImports(code, fetch)` before running; the CLI prefetches before
// compiling. With nothing prefetched the resolver is inert (returns null), so a
// program that only uses local + standard packages is completely unaffected.
//
// LIMITS (v1, by design): module sources are INLINE in the per-package JSON. We
// do NOT chase per-module URLs (no transitive URL fetching). Keeping sources
// inline makes the cache trivial to persist (CLI writes them to snil_pakeji/) and
// trivial to reason about for conformance — remote packages are just SNIL source,
// inlined the same way local files are.
import type { ModuleResolver } from '../runtime';
import type { Registry, SnilPackage } from './registry';
import { resolveFromRegistry } from './registry';

/**
 * The on-the-wire shape a remote serves for ONE package:
 *   GET <registryUrl>/<pkg>.json  →  RemotePackageDoc
 *
 * It is exactly a `SnilPackage`: `{ version, maelezo?, modules }` where each
 * module value is INLINE SNIL source text. `maelezo` is optional on the wire.
 *
 * We chose per-package fetch (not one big index.json) deliberately: it is the
 * simplest robust thing to cache + reason about — one file per package, fetched
 * lazily on first use, cached forever (in memory; on disk for the CLI).
 */
export interface RemotePackageDoc {
  version: string;
  maelezo?: string;
  modules: Record<string, string>;
}

/** A `fetch`-compatible function (browser `fetch`, Node 22+ global `fetch`, or a mock). */
export type FetchLike = (url: string) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

/** A remote registry handle: a sync resolver + the async prefetch bridge. */
export interface RemoteRegistry {
  /** The base URL packages are fetched from (no trailing slash). */
  readonly baseUrl: string;
  /**
   * Fetch the named packages (those not already cached) and populate the cache.
   * Unknown / failed packages are silently skipped (cached as "absent") so the
   * sync resolver simply returns null and precedence falls through to a Kiswahili
   * error — a remote being down must never crash a program.
   */
  prefetch(packageNames: string[]): Promise<void>;
  /**
   * A synchronous, `registryResolver`-compatible resolver that reads ONLY the
   * in-memory cache. Returns null for anything not prefetched. Compose it with
   * `combineResolvers` (place it AFTER local + standard so they shadow remote).
   */
  readonly resolver: ModuleResolver;
  /** The packages fetched so far, as a plain `Registry` (handy for the CLI cache). */
  cached(): Registry;
  /** True once `<pkg>` has been attempted (whether found or not) — avoids refetch. */
  has(packageName: string): boolean;
}

/** Normalize a base URL: drop a trailing slash so `${base}/${pkg}.json` is clean. */
function normalizeBase(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Validate a parsed JSON doc as a RemotePackageDoc (defensive — remotes lie). */
function asPackage(doc: unknown): SnilPackage | null {
  if (!doc || typeof doc !== 'object') return null;
  const d = doc as Record<string, unknown>;
  if (typeof d.version !== 'string') return null;
  if (!d.modules || typeof d.modules !== 'object') return null;
  const modules: Record<string, string> = {};
  for (const [k, v] of Object.entries(d.modules as Record<string, unknown>)) {
    if (typeof v !== 'string') return null; // inline sources only (v1)
    modules[k] = v;
  }
  if (Object.keys(modules).length === 0) return null;
  const maelezo = typeof d.maelezo === 'string' ? d.maelezo : '';
  return { version: d.version, maelezo, modules };
}

/**
 * Create a remote registry over `baseUrl`, fetching with `fetchImpl`. The handle
 * caches per package in memory; call `prefetch` (or `prefetchImports`) before any
 * sync run/compile, then layer `.resolver` with `combineResolvers`.
 *
 * Optionally seed the in-memory cache (e.g. the CLI loads `snil_pakeji/` first so
 * already-cached packages are offline-available without any network call).
 */
export function createRemoteRegistry(
  baseUrl: string,
  fetchImpl: FetchLike,
  seed?: Registry,
): RemoteRegistry {
  const base = normalizeBase(baseUrl);
  const cache: Registry = {};
  // Packages we have ATTEMPTED (found or 404/error) — so we never refetch a miss.
  const attempted = new Set<string>();
  if (seed) {
    for (const [name, pkg] of Object.entries(seed)) {
      cache[name] = pkg;
      attempted.add(name);
    }
  }

  async function fetchOne(name: string): Promise<void> {
    if (attempted.has(name)) return; // cache hit (found or known-absent) — no refetch
    attempted.add(name);
    const url = `${base}/${encodeURIComponent(name)}.json`;
    try {
      const res = await fetchImpl(url);
      if (!res.ok) return; // 404 etc → known-absent
      const pkg = asPackage(await res.json());
      if (pkg) cache[name] = pkg;
    } catch {
      // network/parse failure → known-absent; offline-friendly, never throws.
    }
  }

  return {
    baseUrl: base,
    async prefetch(packageNames: string[]): Promise<void> {
      await Promise.all([...new Set(packageNames)].map(fetchOne));
    },
    resolver: (name: string): string | null => resolveFromRegistry(cache, name),
    cached: () => ({ ...cache }),
    has: (name: string) => attempted.has(name),
  };
}

/**
 * Scan SNIL `source` for `leta "..."` STRING imports and return the unique
 * top-level PACKAGE names (the part before any `/`, trailing `.snil` stripped).
 * Identifier imports (`leta jina`, no quotes) are local-only and ignored.
 */
export function scanImports(source: string): string[] {
  const names = new Set<string>();
  // `leta` followed by a single- or double-quoted string. Tolerant of spacing.
  const re = /\bleta\s+(["'])([^"']+)\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const spec = m[2].replace(/\.snil$/, '');
    const pkg = spec.indexOf('/') >= 0 ? spec.slice(0, spec.indexOf('/')) : spec;
    if (pkg) names.add(pkg);
  }
  return [...names];
}

/**
 * Scan a program's `leta "..."` imports and PREFETCH any that the remote registry
 * has not already attempted AND that an optional `isLocal` predicate doesn't claim
 * (local files / standard packages should NOT trigger a network call). Resolves
 * once the cache is warm; safe to `await` right before a sync run/compile.
 *
 * `isLocal(name)` — return true for names a higher-precedence resolver already
 * satisfies (workspace file, standard package). Those are skipped. Default: skip
 * nothing (every imported package name is a prefetch candidate).
 */
export async function prefetchImports(
  source: string,
  remote: RemoteRegistry,
  isLocal: (name: string) => boolean = () => false,
): Promise<void> {
  const wanted = scanImports(source).filter((n) => !remote.has(n) && !isLocal(n));
  if (wanted.length) await remote.prefetch(wanted);
}
