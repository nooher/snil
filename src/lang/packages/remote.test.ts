// remote.test.ts — unit tests for the REMOTE registry layer with a MOCK fetch.
// Covers: createRemoteRegistry + prefetch populating the cache; the sync resolver
// reading fetched sources; scanImports + prefetchImports scanning `leta "..."`;
// precedence (local/standard shadow remote; remote fills misses); a missing
// remote package → Kiswahili error; cache-hit avoids refetch; and a tri-backend
// parity test (interpreter == Python == JS) over a prefetched remote package.
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createRemoteRegistry,
  scanImports,
  prefetchImports,
} from '../packages/remote';
import type { FetchLike } from '../packages/remote';
import { combineResolvers, standardRegistryResolver } from '../packages/registry';
import { run, toPython, toJS } from '../index';
import type { ModuleResolver } from '../runtime';

// A mock remote: a name→doc map served as JSON, counting how many times each URL
// is fetched (to prove cache-hit behaviour). 404s for unknown packages.
function mockFetch(docs: Record<string, unknown>): { fetch: FetchLike; calls: () => number } {
  let n = 0;
  const fetchImpl: FetchLike = async (url: string) => {
    n++;
    const m = /\/([^/]+)\.json$/.exec(url);
    const name = m ? decodeURIComponent(m[1]) : '';
    const doc = docs[name];
    if (doc === undefined) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => doc };
  };
  return { fetch: fetchImpl, calls: () => n };
}

const SALAAM_DOC = {
  version: '1.0.0',
  maelezo: 'Salamu za mbali.',
  modules: {
    salaam: 'kazi karibu(jina)\n    rudisha "Karibu " + jina\nmwisho',
    rasmi: 'kazi heshima(jina)\n    rudisha "Mheshimiwa " + jina\nmwisho',
  },
};

describe('scanImports', () => {
  it('finds bare package names from leta "pkg"', () => {
    expect(scanImports('leta "takwimu"\nonyesha 1')).toEqual(['takwimu']);
  });
  it('reduces leta "pkg/module" to the package name', () => {
    expect(scanImports('leta "salaam/rasmi"')).toEqual(['salaam']);
  });
  it('strips a trailing .snil and dedupes', () => {
    expect(scanImports('leta "x.snil"\nleta "x"\nleta "y"').sort()).toEqual(['x', 'y']);
  });
  it('ignores identifier imports (leta jina, no quotes)', () => {
    expect(scanImports('leta jina\nonyesha 1')).toEqual([]);
  });
  it('handles single quotes too', () => {
    expect(scanImports("leta 'pkg'")).toEqual(['pkg']);
  });
});

describe('createRemoteRegistry + prefetch', () => {
  it('prefetch populates the cache and the sync resolver reads it', async () => {
    const { fetch } = mockFetch({ salaam: SALAAM_DOC });
    const remote = createRemoteRegistry('https://reg.example/', fetch);
    expect(remote.resolver('salaam')).toBeNull(); // nothing prefetched yet
    await remote.prefetch(['salaam']);
    expect(remote.resolver('salaam')).toContain('kazi karibu');
    expect(remote.resolver('salaam/rasmi')).toContain('heshima'); // sub-module
  });

  it('a missing remote package is silently absent (resolver returns null)', async () => {
    const { fetch } = mockFetch({ salaam: SALAAM_DOC });
    const remote = createRemoteRegistry('https://reg.example', fetch);
    await remote.prefetch(['haipo']);
    expect(remote.resolver('haipo')).toBeNull();
    expect(remote.has('haipo')).toBe(true); // attempted → won't refetch
  });

  it('cache hit avoids a refetch (found AND known-absent)', async () => {
    const { fetch, calls } = mockFetch({ salaam: SALAAM_DOC });
    const remote = createRemoteRegistry('https://reg.example', fetch);
    await remote.prefetch(['salaam', 'haipo']);
    expect(calls()).toBe(2);
    await remote.prefetch(['salaam', 'haipo']); // both already attempted
    expect(calls()).toBe(2); // no new network calls
  });

  it('a network failure is non-fatal (resolver null, never throws)', async () => {
    const fetchThrows: FetchLike = async () => {
      throw new Error('offline');
    };
    const remote = createRemoteRegistry('https://reg.example', fetchThrows);
    await expect(remote.prefetch(['salaam'])).resolves.toBeUndefined();
    expect(remote.resolver('salaam')).toBeNull();
  });

  it('rejects malformed docs (non-string module source)', async () => {
    const { fetch } = mockFetch({ mbovu: { version: '1', modules: { mbovu: 123 } } });
    const remote = createRemoteRegistry('https://reg.example', fetch);
    await remote.prefetch(['mbovu']);
    expect(remote.resolver('mbovu')).toBeNull();
  });

  it('cached() returns a Registry snapshot for disk caching', async () => {
    const { fetch } = mockFetch({ salaam: SALAAM_DOC });
    const remote = createRemoteRegistry('https://reg.example', fetch);
    await remote.prefetch(['salaam']);
    const reg = remote.cached();
    expect(reg.salaam.modules.salaam).toContain('kazi karibu');
  });

  it('a seed cache resolves offline with no fetch', async () => {
    const { fetch, calls } = mockFetch({});
    const remote = createRemoteRegistry('https://reg.example', fetch, {
      salaam: { version: '1.0.0', maelezo: '', modules: SALAAM_DOC.modules },
    });
    expect(remote.resolver('salaam')).toContain('kazi karibu');
    await remote.prefetch(['salaam']);
    expect(calls()).toBe(0); // seeded → already attempted
  });
});

describe('prefetchImports', () => {
  it('prefetches only the imports in the source', async () => {
    const { fetch } = mockFetch({ salaam: SALAAM_DOC });
    const remote = createRemoteRegistry('https://reg.example', fetch);
    await prefetchImports('leta "salaam"\nonyesha karibu("Asha")', remote);
    expect(remote.resolver('salaam')).toContain('kazi karibu');
  });

  it('skips names the isLocal predicate claims (no needless fetch)', async () => {
    const { fetch, calls } = mockFetch({ salaam: SALAAM_DOC });
    const remote = createRemoteRegistry('https://reg.example', fetch);
    // Pretend "salaam" is satisfied locally → must NOT be fetched.
    await prefetchImports('leta "salaam"', remote, (n) => n === 'salaam');
    expect(calls()).toBe(0);
    expect(remote.resolver('salaam')).toBeNull();
  });
});

describe('precedence with a remote layer', () => {
  it('local/standard shadow remote; remote fills the misses', async () => {
    const { fetch } = mockFetch({
      salaam: SALAAM_DOC,
      takwimu: { version: '9', maelezo: '', modules: { takwimu: 'kazi wastani(x)\n    rudisha -1\nmwisho' } },
    });
    const remote = createRemoteRegistry('https://reg.example', fetch);
    await remote.prefetch(['salaam', 'takwimu']);
    const local: ModuleResolver = (n) =>
      n === 'salaam' ? 'kazi karibu(j)\n    rudisha "yangu"\nmwisho' : null;
    const combined = combineResolvers(local, standardRegistryResolver, remote.resolver);
    // local shadows remote "salaam"
    expect(combined('salaam')).toContain('yangu');
    // standard shadows remote "takwimu" (standard comes before remote)
    expect(combined('takwimu')).toContain('jumla');
    // remote fills a name nobody else has
    expect(combined('salaam/rasmi')).toContain('heshima');
  });

  it('run() with a remote-backed resolver executes the fetched package', async () => {
    const { fetch } = mockFetch({ salaam: SALAAM_DOC });
    const remote = createRemoteRegistry('https://reg.example', fetch);
    const src = 'leta "salaam"\nonyesha karibu("Asha")';
    await prefetchImports(src, remote);
    const r = run(src, { somaModuli: combineResolvers(standardRegistryResolver, remote.resolver) });
    expect(r.error, r.error?.message).toBeNull();
    expect(r.output).toBe('Karibu Asha');
  });

  it('a remote package not prefetched → Kiswahili haijapatikana error', () => {
    const { fetch } = mockFetch({ salaam: SALAAM_DOC });
    const remote = createRemoteRegistry('https://reg.example', fetch);
    // No prefetch → cache empty → falls through to a missing-module error.
    const r = run('leta "salaam"\nonyesha 1', {
      somaModuli: combineResolvers(standardRegistryResolver, remote.resolver),
    });
    expect(r.error).not.toBeNull();
    expect(r.error?.ujumbe).toContain('haijapatikana');
  });
});

describe('remote package — tri-backend parity', () => {
  function norm(s: string): string {
    return s.split(/\r?\n/).map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\s+$/, '');
  }
  function runExternal(code: string, ext: 'py' | 'mjs', bin: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'snil-remote-'));
    const file = join(dir, `prog.${ext}`);
    try {
      writeFileSync(file, code, 'utf-8');
      return norm(execFileSync(bin, [file], { encoding: 'utf-8' }));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it('a prefetched remote package inlines identically across interpreter, Python, JS', async () => {
    const { fetch } = mockFetch({ salaam: SALAAM_DOC });
    const remote = createRemoteRegistry('https://reg.example', fetch);
    const src = ['leta "salaam"', 'onyesha karibu("Juma")', 'leta "salaam/rasmi"', 'onyesha heshima("Asha")'].join('\n');
    await prefetchImports(src, remote);
    const resolver = combineResolvers(standardRegistryResolver, remote.resolver);
    const interp = run(src, { somaModuli: resolver });
    expect(interp.error, interp.error?.message).toBeNull();
    const interpOut = norm(interp.output);
    expect(interpOut).toBe('Karibu Juma\nMheshimiwa Asha');
    expect(runExternal(toPython(src, resolver), 'py', 'python')).toBe(interpOut);
    expect(runExternal(toJS(src, resolver), 'mjs', 'node')).toBe(interpOut);
  });
});
