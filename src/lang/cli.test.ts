// cli.test.ts — end-to-end tests for the SNIL CLI plus a unit test of the
// Kiswahili code-frame formatter. The CLI is invoked exactly as users would:
// `node --experimental-strip-types scripts/snil.ts ...`.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SnilError } from './errors';
import { formatError } from './diagnose';
import { fsModuleResolver } from './node_io';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = path.join(ROOT, 'scripts', 'snil.ts');

/** Run the CLI, returning {stdout, stderr, code}. Never throws on non-zero exit. */
function runCli(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      process.execPath,
      ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', CLI, ...args],
      { cwd: ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { stdout, stderr: '', code: 0 };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; status?: number };
    return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', code: err.status ?? 1 };
  }
}

describe('snil CLI', () => {
  it('endesha habari.snil prints "Habari Dunia" and exits 0', () => {
    const { stdout, code } = runCli(['endesha', 'examples/habari.snil']);
    expect(code).toBe(0);
    expect(stdout).toContain('Habari Dunia');
  });

  it('endesha hesabu.snil produces the golden hesabu output', () => {
    const { stdout, code } = runCli(['endesha', 'examples/hesabu.snil']);
    expect(code).toBe(0);
    expect(stdout).toContain('Jumla ni 15');
    expect(stdout).toContain('Habari Asha');
    expect(stdout).toContain('a ni kubwa');
    expect(stdout).toContain('1');
    expect(stdout).toContain('2');
    expect(stdout).toContain('3');
  });

  it('tengeneza habari.snil emits Python containing print(', () => {
    const { stdout, code } = runCli(['tengeneza', 'examples/habari.snil']);
    expect(code).toBe(0);
    expect(stdout).toContain('print(');
  });

  it('endesha on an undefined variable exits 1 with a Kiswahili code-frame', () => {
    const tmp = path.join(os.tmpdir(), `snil-test-${Date.now()}.snil`);
    fs.writeFileSync(tmp, 'onyesha jumla\n', 'utf-8');
    try {
      const { stderr, code } = runCli(['endesha', tmp]);
      expect(code).toBe(1);
      expect(stderr).toContain('Mstari');
      expect(stderr).toContain('halijatambulika');
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  });

  it('endesha on a missing file gives a Kiswahili error and exits 1', () => {
    const { stderr, code } = runCli(['endesha', 'hakuna-faili-hili.snil']);
    expect(code).toBe(1);
    expect(stderr).toContain('halipatikani');
  });

  it('--toleo prints the version', () => {
    const { stdout, code } = runCli(['--toleo']);
    expect(code).toBe(0);
    expect(stdout).toContain('SNIL 0.1');
  });

  it('msaada prints Kiswahili help', () => {
    const { stdout, code } = runCli(['msaada']);
    expect(code).toBe(0);
    expect(stdout).toContain('Matumizi');
  });
});

describe('fsModuleResolver', () => {
  it('resolves a sibling module by name and by name + ".snil", and returns null when missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snil-resolver-'));
    try {
      fs.writeFileSync(path.join(dir, 'salamu.snil'), 'kazi karibisha(jina)\n', 'utf-8');
      fs.writeFileSync(path.join(dir, 'halisi'), 'onyesha "bila kiendelezi"\n', 'utf-8');
      const resolve = fsModuleResolver(dir);
      expect(resolve('salamu')).toContain('kazi karibisha(jina)');
      expect(resolve('salamu.snil')).toContain('kazi karibisha(jina)');
      expect(resolve('halisi')).toContain('bila kiendelezi');
      expect(resolve('hakuna')).toBeNull();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('snil CLI file imports (leta)', () => {
  function withProject<T>(fn: (dir: string) => T): T {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snil-imports-'));
    try {
      fs.writeFileSync(
        path.join(dir, 'main.snil'),
        'leta "salamu"\nonyesha karibisha("Asha")\n',
        'utf-8',
      );
      fs.writeFileSync(
        path.join(dir, 'salamu.snil'),
        'kazi karibisha(jina)\n    rudisha "Karibu " + jina\nmwisho\n',
        'utf-8',
      );
      return fn(dir);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  it('endesha resolves a sibling module and prints the imported function result', () => {
    withProject((dir) => {
      const { stdout, code } = runCli(['endesha', path.join(dir, 'main.snil')]);
      expect(code).toBe(0);
      expect(stdout).toContain('Karibu Asha');
    });
  });

  it('tengeneza inlines the imported function into generated Python', () => {
    withProject((dir) => {
      const { stdout, code } = runCli(['tengeneza', path.join(dir, 'main.snil')]);
      expect(code).toBe(0);
      expect(stdout).toContain('def karibisha');
    });
  });
});

describe('formatError', () => {
  it('renders a code-frame with header, source line, caret, message and dokezo', () => {
    const source = 'weka bei kuwa 10\nonyesha jumla(bei)';
    const err = new SnilError(
      'Neno "jumla" halijatambulika.',
      2,
      'kutekeleza',
      'umelitangaza kwa "weka"?',
    );
    const out = formatError(source, err);
    expect(out).toContain('Hitilafu (kutekeleza) — Mstari 2:');
    expect(out).toContain('2 | onyesha jumla(bei)');
    expect(out).toContain('^');
    expect(out).toContain('Neno "jumla" halijatambulika.');
    expect(out).toContain('(dokezo: umelitangaza kwa "weka"?)');
  });

  it('omits the frame when the line is 0 or out of range', () => {
    const err = new SnilError('Kitu kimeharibika.', 0, 'kutekeleza');
    const out = formatError('onyesha 1', err);
    expect(out).toContain('Hitilafu (kutekeleza):');
    expect(out).toContain('Kitu kimeharibika.');
    expect(out).not.toContain('|');
    expect(out).not.toContain('^');
  });
});
