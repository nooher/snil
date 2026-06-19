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

## A remote registry (future)

Because a registry is just data, a remote registry URL could be fetched once,
cached as a `Registry` object, and layered with `combineResolvers` — no language
change required:

```ts
combineResolvers(workspaceResolver, registryResolver(remote), standardRegistryResolver)
```
