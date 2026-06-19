// registry.test.ts — unit tests for the SNIL package ecosystem: resolver
// precedence, registry resolution (pkg + pkg/module), cycle-safety, and the
// Kiswahili missing-package error. Plus a tri-backend parity test that imports a
// standard package through interpreter + Python + JS.
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  STANDARD_REGISTRY,
  registryResolver,
  combineResolvers,
  resolveFromRegistry,
  standardRegistryResolver,
} from '../packages/registry';
import { run, toPython, toJS } from '../index';
import type { ModuleResolver } from '../runtime';
import type { Registry } from '../packages/registry';

describe('resolveFromRegistry', () => {
  const reg: Registry = {
    foo: {
      version: '1.0.0',
      maelezo: 'jaribio',
      modules: {
        foo: 'kazi salamu()\n    rudisha "main"\nmwisho',
        ziada: 'kazi nyongeza()\n    rudisha "extra"\nmwisho',
      },
    },
    bar: { version: '2.0.0', maelezo: '', modules: { peke: 'weka x kuwa 1' } },
  };

  it('resolves a package main module by package name', () => {
    expect(resolveFromRegistry(reg, 'foo')).toContain('"main"');
  });
  it('resolves a sub-module via pkg/module', () => {
    expect(resolveFromRegistry(reg, 'foo/ziada')).toContain('"extra"');
  });
  it('tolerates a trailing .snil', () => {
    expect(resolveFromRegistry(reg, 'foo.snil')).toContain('"main"');
  });
  it('falls back to the sole module when name != package', () => {
    // bar has a single module not named "bar" → main resolves to it.
    expect(resolveFromRegistry(reg, 'bar')).toBe('weka x kuwa 1');
  });
  it('returns null for an unknown package', () => {
    expect(resolveFromRegistry(reg, 'haipo')).toBeNull();
  });
  it('returns null for an unknown sub-module', () => {
    expect(resolveFromRegistry(reg, 'foo/haipo')).toBeNull();
  });
  it('registryResolver(reg) wraps resolveFromRegistry', () => {
    const resolve = registryResolver(reg);
    expect(resolve('foo')).toContain('"main"');
    expect(resolve('foo/ziada')).toContain('"extra"');
    expect(resolve('haipo')).toBeNull();
  });
});

describe('registryResolver + standard registry', () => {
  it('resolves each standard package', () => {
    expect(standardRegistryResolver('takwimu')).toContain('kazi wastani');
    expect(standardRegistryResolver('jiometri')).toContain('eneo_duara');
    expect(standardRegistryResolver('tarehe')).toContain('mwaka_mrefu');
  });
  it('returns null for a non-package', () => {
    expect(standardRegistryResolver('haipo_kabisa')).toBeNull();
  });
  it('STANDARD_REGISTRY ships three packages', () => {
    expect(Object.keys(STANDARD_REGISTRY).sort()).toEqual(['jiometri', 'takwimu', 'tarehe']);
  });
});

describe('combineResolvers precedence', () => {
  it('first non-null resolver wins (local shadows package)', () => {
    const local: ModuleResolver = (n) => (n === 'takwimu' ? 'kazi wastani(x)\n    rudisha 0\nmwisho' : null);
    const combined = combineResolvers(local, standardRegistryResolver);
    // local shadows the standard package of the same name…
    expect(combined('takwimu')).toContain('rudisha 0');
    // …but a name only the registry has still resolves.
    expect(combined('jiometri')).toContain('eneo_duara');
  });
  it('ignores null/undefined resolvers', () => {
    const combined = combineResolvers(null, undefined, standardRegistryResolver);
    expect(combined('takwimu')).toContain('kazi wastani');
  });
  it('returns null when nothing resolves', () => {
    expect(combineResolvers(standardRegistryResolver)('haipo')).toBeNull();
  });
});

describe('package import end-to-end (interpreter)', () => {
  it('leta "takwimu" exposes wastani as a bare name', () => {
    const r = run('leta "takwimu"\nonyesha wastani([2, 4, 6])');
    expect(r.error, r.error?.message).toBeNull();
    expect(r.output).toBe('4');
  });

  it('a local workspace module SHADOWS a same-named package', () => {
    const local: ModuleResolver = (n) =>
      n === 'takwimu' || n === 'takwimu.snil'
        ? 'kazi wastani(orodha)\n    rudisha "yangu"\nmwisho'
        : null;
    const r = run('leta "takwimu"\nonyesha wastani([1, 2])', {
      somaModuli: combineResolvers(local, standardRegistryResolver),
    });
    expect(r.error).toBeNull();
    expect(r.output).toBe('yangu');
  });

  it('a missing package → Kiswahili error mentioning haijapatikana', () => {
    const r = run('leta "pakeji_isiyokuwepo"\nonyesha 1');
    expect(r.error).not.toBeNull();
    expect(r.error?.ujumbe).toContain('haijapatikana');
  });

  it('an import cycle through a package-style resolver is cycle-safe', () => {
    const mods: Record<string, string> = {
      a: 'leta "b"\nweka x kuwa 1',
      b: 'leta "a"\nweka y kuwa 2',
    };
    const resolver: ModuleResolver = (n) => mods[n] ?? null;
    const r = run('leta "a"\nonyesha 1', {
      somaModuli: combineResolvers(resolver, standardRegistryResolver),
    });
    expect(r.error).not.toBeNull();
    expect(r.error?.ujumbe.toLowerCase()).toContain('mzunguko');
  });
});

describe('package import — tri-backend parity', () => {
  // Normalize CRLF + trailing whitespace per line (matches conformance.test.ts).
  function norm(s: string): string {
    return s.split(/\r?\n/).map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\s+$/, '');
  }

  function runExternal(code: string, ext: 'py' | 'mjs', bin: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'snil-pkg-'));
    const file = join(dir, `prog.${ext}`);
    try {
      writeFileSync(file, code, 'utf-8');
      return norm(execFileSync(bin, [file], { encoding: 'utf-8' }));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it('leta "jiometri" inlines + agrees across interpreter, Python, JS', () => {
    const src = [
      'leta "jiometri"',
      'onyesha eneo_pembetatu(6, 4)',
      'onyesha pythagoras(3, 4)',
    ].join('\n');
    const interp = run(src);
    expect(interp.error, interp.error?.message).toBeNull();
    const interpOut = norm(interp.output);
    expect(interpOut).toBe('12\n5');
    expect(runExternal(toPython(src), 'py', 'python')).toBe(interpOut);
    expect(runExternal(toJS(src), 'mjs', 'node')).toBe(interpOut);
  });
});
