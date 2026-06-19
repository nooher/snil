// registry.ts — the SNIL package ecosystem.
//
// A SNIL program imports a published library with `leta "pkg"` (or
// `leta "pkg/module"`). Packages are shipped as DATA: a `Registry` maps a
// package name to a version + a set of `.snil` modules (source text). Because a
// module is just SNIL source, the SAME module resolves identically across the
// interpreter, the Python backend, and the JS backend — codegen already inlines
// any resolved module (dependency-ordered + cycle-safe), so packages inline the
// same way (see codegen_python.ts / codegen_js.ts `visitModule`).
//
// Sovereignty: this STANDARD_REGISTRY is bundled and 100% offline. A remote
// registry URL (fetched once, then cached as a Registry object) could be layered
// in later via `combineResolvers(workspaceResolver, registryResolver(remote),
// registryResolver(STANDARD_REGISTRY))` — no language change required.
import type { ModuleResolver } from '../runtime';

/** One published package: a version string + its modules (moduleName → .snil source). */
export interface SnilPackage {
  version: string;
  /** Human-readable one-line description (Kiswahili). */
  maelezo: string;
  /** moduleName → SNIL source text. The module named EXACTLY the package name is
   *  the package "main" — `leta "pkg"` resolves to it; `leta "pkg/other"`
   *  resolves the module named "other". */
  modules: Record<string, string>;
}

/** A registry: packageName → package. */
export type Registry = Record<string, SnilPackage>;

// ───────────────────────── tarehe — date/time (PURE) ─────────────────────────
// Deterministic calendar math ONLY (no clock / "now" — that would break
// conformance, since interpreter/Python/JS must agree byte-for-byte).
const TAREHE = `# tarehe — hesabu za kalenda (deterministic; hakuna saa halisi).
# gawanyo_kamili(a, b) — mgawanyo wa namba kamili (floor) kwa a, b chanya.
kazi gawanyo_kamili(a, b)
    weka q kuwa 0
    weka r kuwa a
    wakati r >= b
        r = r - b
        q = q + 1
    mwisho
    rudisha q
mwisho

# mwaka_mrefu(m) — je, mwaka ni mrefu (leap year)?
kazi mwaka_mrefu(m)
    ikiwa m % 400 == 0 basi
        rudisha kweli
    mwisho
    ikiwa m % 100 == 0 basi
        rudisha si_kweli
    mwisho
    ikiwa m % 4 == 0 basi
        rudisha kweli
    mwisho
    rudisha si_kweli
mwisho

# siku_za_mwezi(mwaka, mwezi) — idadi ya siku katika mwezi (1=Januari..12=Desemba).
kazi siku_za_mwezi(mwaka, mwezi)
    weka siku kuwa [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    ikiwa mwezi < 1 au mwezi > 12 basi
        rudisha 0
    mwisho
    ikiwa mwezi == 2 na mwaka_mrefu(mwaka) basi
        rudisha 29
    mwisho
    rudisha siku[mwezi - 1]
mwisho

# siku_za_mwaka(mwaka) — 365 au 366.
kazi siku_za_mwaka(mwaka)
    ikiwa mwaka_mrefu(mwaka) basi
        rudisha 366
    mwisho
    rudisha 365
mwisho

# jina_la_siku(n) — 0=Jumapili..6=Jumamosi → jina la Kiswahili.
kazi jina_la_siku(n)
    weka majina kuwa ["Jumapili", "Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa", "Jumamosi"]
    weka i kuwa n % 7
    ikiwa i < 0 basi
        i = i + 7
    mwisho
    rudisha majina[i]
mwisho

# siku_ya_juma(mwaka, mwezi, siku) — siku ya juma kwa tarehe (Sakamoto), 0=Jumapili.
kazi siku_ya_juma(mwaka, mwezi, siku)
    weka t kuwa [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
    weka y kuwa mwaka
    ikiwa mwezi < 3 basi
        y = y - 1
    mwisho
    weka w kuwa y + gawanyo_kamili(y, 4) - gawanyo_kamili(y, 100) + gawanyo_kamili(y, 400)
    weka w kuwa w + t[mwezi - 1] + siku
    weka j kuwa w % 7
    rudisha jina_la_siku(j)
mwisho
`;

// ───────────────────────── jiometri — geometry ─────────────────────────
const JIOMETRI = `# jiometri — eneo, mzingo, na Pythagoras.
weka PI kuwa 3.141592653589793

kazi eneo_duara(r)
    rudisha PI * r * r
mwisho

kazi mzingo_duara(r)
    rudisha 2 * PI * r
mwisho

kazi eneo_mstatili(urefu, upana)
    rudisha urefu * upana
mwisho

kazi mzingo_mstatili(urefu, upana)
    rudisha 2 * (urefu + upana)
mwisho

# eneo la pembetatu kwa msingi na kimo.
kazi eneo_pembetatu(msingi, kimo)
    rudisha (msingi * kimo) / 2
mwisho

# pythagoras — urefu wa hypotenuse kwa pande mbili a, b.
kazi pythagoras(a, b)
    rudisha mzizi_wa((a * a) + (b * b))
mwisho

# mzizi wa pili kwa njia ya Newton (deterministic; bila leta hisabati).
kazi mzizi_wa(x)
    ikiwa x == 0 basi
        rudisha 0
    mwisho
    weka g kuwa x
    kwa kila i kutoka 1 hadi 40
        g = (g + (x / g)) / 2
    mwisho
    rudisha g
mwisho
`;

// ───────────────────────── takwimu — statistics ─────────────────────────
const TAKWIMU = `# takwimu — wastani, wastani_kati, modi, na kiwango juu ya orodha.
# nusu_kamili(n) — n gawanya 2 kama namba kamili (floor), kwa fahirisi salama.
kazi nusu_kamili(n)
    weka q kuwa 0
    weka r kuwa n
    wakati r >= 2
        r = r - 2
        q = q + 1
    mwisho
    rudisha q
mwisho

kazi wastani(orodha)
    weka jumla kuwa 0
    kwa kila x katika orodha
        jumla = jumla + x
    mwisho
    rudisha jumla / idadi(orodha)
mwisho

# panga orodha ya namba kwa kupanda (insertion sort; nakala mpya).
kazi panga_namba(orodha)
    weka nakala kuwa []
    kwa kila x katika orodha
        ongeza x kwenye nakala
    mwisho
    weka n kuwa idadi(nakala)
    kwa kila i kutoka 1 hadi n - 1
        weka thamani kuwa nakala[i]
        weka j kuwa i - 1
        wakati j >= 0 na nakala[j] > thamani
            nakala[j + 1] = nakala[j]
            j = j - 1
        mwisho
        nakala[j + 1] = thamani
    mwisho
    rudisha nakala
mwisho

# wastani_kati — thamani ya katikati (median).
kazi wastani_kati(orodha)
    weka p kuwa panga_namba(orodha)
    weka n kuwa idadi(p)
    weka kati kuwa nusu_kamili(n)
    ikiwa n % 2 == 1 basi
        rudisha p[kati]
    mwisho
    rudisha (p[kati - 1] + p[kati]) / 2
mwisho

# modi — thamani inayojirudia zaidi (ya kwanza ikiwa sare).
kazi modi(orodha)
    weka bora kuwa orodha[0]
    weka bora_idadi kuwa 0
    kwa kila x katika orodha
        weka hesabu kuwa 0
        kwa kila y katika orodha
            ikiwa y == x basi
                hesabu = hesabu + 1
            mwisho
        mwisho
        ikiwa hesabu > bora_idadi basi
            bora_idadi = hesabu
            bora = x
        mwisho
    mwisho
    rudisha bora
mwisho

# kiwango — tofauti kati ya kubwa na ndogo (range).
kazi kiwango(orodha)
    weka chini kuwa orodha[0]
    weka juu kuwa orodha[0]
    kwa kila x katika orodha
        ikiwa x < chini basi
            chini = x
        mwisho
        ikiwa x > juu basi
            juu = x
        mwisho
    mwisho
    rudisha juu - chini
mwisho
`;

/**
 * The bundled, offline STANDARD registry. Three real, deterministic SNIL
 * packages. Each package's "main" module shares the package name, so
 * `leta "takwimu"` works; multi-module packages also expose `leta "pkg/module"`.
 */
export const STANDARD_REGISTRY: Registry = {
  tarehe: {
    version: '1.0.0',
    maelezo: 'Hesabu za kalenda: mwaka mrefu, siku za mwezi, siku ya juma.',
    modules: { tarehe: TAREHE },
  },
  jiometri: {
    version: '1.0.0',
    maelezo: 'Jiometri: eneo na mzingo wa duara/mstatili/pembetatu, Pythagoras.',
    modules: { jiometri: JIOMETRI },
  },
  takwimu: {
    version: '1.0.0',
    maelezo: 'Takwimu: wastani, wastani_kati, modi, kiwango juu ya orodha.',
    modules: { takwimu: TAKWIMU },
  },
};

/**
 * Resolve a registry specifier → SNIL source (or null if absent).
 *   "pkg"          → the package's main module (the one named `pkg`).
 *   "pkg/module"   → the module named `module` inside `pkg`.
 *   "pkg.snil"     → "pkg" (a trailing .snil is tolerated, matching file resolvers).
 */
export function resolveFromRegistry(registry: Registry, name: string): string | null {
  const clean = name.replace(/\.snil$/, '');
  const slash = clean.indexOf('/');
  if (slash >= 0) {
    const pkg = clean.slice(0, slash);
    const mod = clean.slice(slash + 1);
    const p = registry[pkg];
    if (!p) return null;
    return p.modules[mod] ?? null;
  }
  const p = registry[clean];
  if (!p) return null;
  // Main module: prefer the module named exactly the package; else, if the
  // package has a single module, use it.
  if (p.modules[clean] != null) return p.modules[clean];
  const keys = Object.keys(p.modules);
  if (keys.length === 1) return p.modules[keys[0]];
  return null;
}

/** A ModuleResolver that resolves names from a registry (and nothing else). */
export function registryResolver(registry: Registry): ModuleResolver {
  return (name: string): string | null => resolveFromRegistry(registry, name);
}

/**
 * Layer several resolvers into one. The FIRST resolver to return a non-null
 * source wins. This is how the browser (workspace → registry) and the CLI
 * (filesystem → registry) compose precedence cleanly: pass local-files first,
 * registry last, so a local module always SHADOWS a package of the same name.
 */
export function combineResolvers(
  ...resolvers: (ModuleResolver | null | undefined)[]
): ModuleResolver {
  const active = resolvers.filter((r): r is ModuleResolver => typeof r === 'function');
  return (name: string): string | null => {
    for (const r of active) {
      const src = r(name);
      if (src != null) return src;
    }
    return null;
  };
}

/** The standard-registry resolver, ready to layer in by both browser and CLI. */
export const standardRegistryResolver: ModuleResolver = registryResolver(STANDARD_REGISTRY);
