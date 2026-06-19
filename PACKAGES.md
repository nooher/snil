# SNIL — Pakeji (Packages)

SNIL programs import shared libraries with `leta "jina"`. A package is a curated,
versioned bundle of `.snil` modules. Packages are the biggest scale lever for a
language: once written, a package runs **identically** across all three SNIL
backends (interpreter, Python, JavaScript), because each module is just SNIL
source that codegen inlines (dependency-ordered + cycle-safe).

## Importing a package

```snil
leta "takwimu"
onyesha wastani([2, 4, 6])   # 4
```

- `leta "pkg"` imports a package's **main** module (the module named exactly
  `pkg`). Its top-level `kazi` and `weka` become bare names — exactly like a
  local file module.
- `leta "pkg/module"` imports a specific sub-module of a multi-module package.
- A **local workspace file** of the same name **shadows** a package — see
  precedence below.

## Standard registry (bundled, offline)

Three real, deterministic packages ship in
[`src/lang/packages/registry.ts`](src/lang/packages/registry.ts):

| Pakeji      | `leta`            | Kazi (selection) |
|-------------|-------------------|------------------|
| `tarehe`    | `leta "tarehe"`   | `mwaka_mrefu`, `siku_za_mwezi`, `siku_za_mwaka`, `jina_la_siku`, `siku_ya_juma` |
| `jiometri`  | `leta "jiometri"` | `eneo_duara`, `mzingo_duara`, `eneo_mstatili`, `eneo_pembetatu`, `pythagoras` |
| `takwimu`   | `leta "takwimu"`  | `wastani`, `wastani_kati`, `modi`, `kiwango` |

All three are **pure / deterministic** (no clock, no I/O), so conformance holds:
interpreter == Python == JS byte-for-byte. (The wall-clock `muda` module stays in
the stdlib precisely because it is *not* deterministic.)

## The registry format (data)

A registry is plain data — a map from package name to a version + its modules:

```ts
type Registry = Record<string, {
  version: string;
  maelezo: string;                       // one-line Kiswahili description
  modules: Record<string, string>;       // moduleName → .snil source text
}>;
```

The module named exactly the package name is the **main**. A single-module
package may name its module anything — the resolver falls back to the sole module
for the bare `leta "pkg"`.

## Resolver precedence

Module resolution layers cleanly with two helpers from `registry.ts`:

- `registryResolver(registry)` — a `ModuleResolver` over a registry.
- `combineResolvers(...resolvers)` — the **first** resolver that returns a
  non-null source wins.

Both the browser Playground and the CLI compose the same way, so a **local
module always shadows a package**:

```
local workspace file  →  registry package  →  (error: "Moduli … haijapatikana.")
```

- **Browser** (`src/App.tsx`): `combineResolvers(workspaceResolver, standardRegistryResolver)`.
- **CLI** (`scripts/snil.ts`): `combineResolvers(fsModuleResolver(baseDir), <snil_pakeji/>, standardRegistryResolver)`.
- The toolchain (`run` / `toPython` / `toJS` in `src/lang/index.ts`) also layers
  the standard registry as a final fallback, so `leta "takwimu"` works even with
  no explicit resolver.

## Adding a package

1. Write the module(s) as SNIL source (keep them deterministic for conformance).
2. Add an entry to `STANDARD_REGISTRY` in `src/lang/packages/registry.ts`:

   ```ts
   sarufi: {
     version: '1.0.0',
     maelezo: 'Maelezo mafupi.',
     modules: { sarufi: `kazi salamu()\n    rudisha "Habari"\nmwisho` },
   },
   ```
3. (Optional) add a golden example under `examples/` + an `EXPECTED.md` entry so
   the conformance suite proves all three backends agree.

### Local packages via `snil_pakeji/`

The CLI also reads an optional `snil_pakeji/` directory next to the entry file:

- `snil_pakeji/<pkg>.snil`            → importable as `leta "<pkg>"`
- `snil_pakeji/<pkg>/<module>.snil`   → importable as `leta "<pkg>"` (main) or
  `leta "<pkg>/<module>"`

These sit **between** local files and the standard registry in precedence.

## A remote registry (sovereign, optional, offline-friendly)

Anyone can host SNIL packages. A remote registry is **optional** — SNIL works
fully offline with the bundled standard registry plus any locally cached
packages. When configured, `leta "pkg"` can also resolve packages fetched from a
registry URL.

### Index format — one JSON file per package

A registry serves **one JSON document per package** at a predictable path:

```
GET <registryUrl>/<pkg>.json
```

The document is exactly a package (`maelezo` optional on the wire), with **inline
SNIL source** for each module:

```jsonc
// GET https://reg.example/salaam.json
{
  "version": "1.0.0",
  "maelezo": "Salamu za mbali.",
  "modules": {
    "salaam": "kazi karibu(jina)\n    rudisha \"Karibu \" + jina\nmwisho",
    "rasmi":  "kazi heshima(jina)\n    rudisha \"Mheshimiwa \" + jina\nmwisho"
  }
}
```

The module named exactly the package is the **main** (`leta "salaam"`); other
modules are reachable as `leta "salaam/rasmi"`. Per-package fetch (rather than one
big `index.json`) was chosen because it is the simplest robust thing to cache and
reason about: one file per package, fetched lazily on first use, cached forever.

**Hosting one** is therefore trivial — drop `<pkg>.json` files on any static host
(GitHub Pages, S3, a VPS, a Raspberry Pi) and point clients at the base URL.

**v1 limits (by design):** module sources are **inline** in the JSON. There is
**no transitive URL fetching** — a `modules` value is SNIL source, never a URL.
This keeps the cache trivial to persist and keeps conformance intact (remote
packages are just SNIL source, inlined exactly like local files).

### The async-prefetch → sync-resolve bridge

A `ModuleResolver` is **synchronous** `(name) => string | null`, but fetching is
async. `src/lang/packages/remote.ts` bridges the two phases:

```ts
const remote = createRemoteRegistry(registryUrl, fetch);
await prefetchImports(code, remote);            // 1. async: warm the cache
run(code, { somaModuli: combineResolvers(workspace, standardRegistryResolver, remote.resolver) });
                                                 // 2. sync: resolver reads cache
```

- `createRemoteRegistry(baseUrl, fetchImpl, seed?)` → a handle with `.prefetch()`,
  a sync `.resolver`, `.cached()`, and `.has()`.
- `prefetch(names)` fetches (those not already attempted) and fills an in-memory
  cache. A down/missing remote is **non-fatal** — it is cached as "absent" and the
  sync resolver returns null, so precedence falls through to the normal Kiswahili
  *“… haijapatikana.”* error.
- `prefetchImports(source, remote, isLocal?)` scans the program's `leta "..."`
  string imports and prefetches any not already cached or claimed by `isLocal`
  (so local files / standard packages never trigger a network call).
- `scanImports(source)` returns the unique package names a program imports.

**Remote packages MUST be prefetched before a synchronous `run` / `toPython` /
`toJS`.** The browser playground `await`s `prefetchImports(code, fetch)` before
running; the CLI prefetches before compiling.

### Precedence (with the remote layer)

```
local workspace file  →  snil_pakeji/ cache  →  standard registry  →  remote fetch  →  (error)
```

A local module always shadows a package; the standard registry shadows the
remote; the remote only fills names nobody else has.

### CLI

Configure a registry with `--registry <url>` or the `SNIL_REGISTRY` env var:

```sh
SNIL_REGISTRY=https://reg.example snil endesha main.snil
snil endesha main.snil --registry https://reg.example
```

On a cache miss the CLI fetches the package, runs it, **and writes it to
`snil_pakeji/<pkg>/<module>.snil`** — so the next run is fully offline (resolved
from the `snil_pakeji/` cache, no network). The remote layer sits **last** in
precedence.

### Browser

If `VITE_SNIL_REGISTRY` is set at build time, the Playground builds a remote
registry once and `await`s `prefetchImports(code, fetch)` before each run /
Python / JS view (cached in memory for the session). With **no** registry
configured, everything works exactly as before (bundled standard registry only).
