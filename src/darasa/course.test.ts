// course.test.ts — guarantees every lesson is sound: each reference solution passes
// its own checks, intentionally-incomplete starters fail, and the checker behaves
// correctly per check type.
import { describe, it, expect } from 'vitest';
import { COURSE } from './course';
import { checkLesson } from './check';
import type { Lesson } from './types';

describe('COURSE shape', () => {
  it('has at least 8 lessons', () => {
    expect(COURSE.masomo.length).toBeGreaterThanOrEqual(8);
  });

  it('has unique lesson ids', () => {
    const ids = COURSE.masomo.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every lesson has the required fields', () => {
    for (const l of COURSE.masomo) {
      expect(l.id).toBeTruthy();
      expect(l.kichwa).toBeTruthy();
      expect(l.maelezo).toBeTruthy();
      expect(l.lengo).toBeTruthy();
      expect(l.suluhisho).toBeTruthy();
      expect(l.ukaguzi.length).toBeGreaterThan(0);
    }
  });
});

describe('every reference solution passes its own checks', () => {
  for (const lesson of COURSE.masomo) {
    it(`suluhisho passes: ${lesson.id}`, () => {
      const res = checkLesson(lesson, lesson.suluhisho);
      expect(res.passed, `${lesson.id}: ${res.ujumbe}`).toBe(true);
    });
  }
});

describe('intentionally-incomplete starters fail', () => {
  for (const lesson of COURSE.masomo) {
    // A starter is "complete" only if it already passes — our starters are all
    // partial (TODO comments), so each should fail.
    it(`anzia fails: ${lesson.id}`, () => {
      const res = checkLesson(lesson, lesson.anzia);
      expect(res.passed, `${lesson.id} starter unexpectedly passed`).toBe(false);
    });
  }
});

// ───────────────────────── direct checker unit tests ─────────────────────────
function lessonWith(ukaguzi: Lesson['ukaguzi']): Lesson {
  return {
    id: 'jaribio',
    kichwa: 'Jaribio',
    maelezo: '',
    lengo: '',
    anzia: '',
    ukaguzi,
    suluhisho: '',
  };
}

describe('checkLesson — per check type', () => {
  it('haina_kosa: passes clean code', () => {
    const res = checkLesson(lessonWith([{ aina: 'haina_kosa' }]), 'onyesha "habari"');
    expect(res.passed).toBe(true);
  });

  it('haina_kosa: fails on runtime error with Kiswahili message', () => {
    const res = checkLesson(lessonWith([{ aina: 'haina_kosa' }]), 'onyesha jna');
    expect(res.passed).toBe(false);
    expect(res.ujumbe).toMatch(/kosa/i);
  });

  it('matokeo_sawa: matches trimmed output', () => {
    const res = checkLesson(
      lessonWith([{ aina: 'matokeo_sawa', thamani: 'mambo' }]),
      'onyesha "mambo"',
    );
    expect(res.passed).toBe(true);
  });

  it('matokeo_sawa: fails when output differs', () => {
    const res = checkLesson(
      lessonWith([{ aina: 'matokeo_sawa', thamani: 'mambo' }]),
      'onyesha "poa"',
    );
    expect(res.passed).toBe(false);
    expect(res.ujumbe).toMatch(/mambo/);
  });

  it('matokeo_ina: passes when output contains substring', () => {
    const res = checkLesson(
      lessonWith([{ aina: 'matokeo_ina', thamani: 'duni' }]),
      'onyesha "Habari, dunia!"',
    );
    expect(res.passed).toBe(true);
  });

  it('inatumia: detects keyword in code', () => {
    const res = checkLesson(
      lessonWith([{ aina: 'inatumia', neno: 'weka' }]),
      'weka x kuwa 1\nonyesha x',
    );
    expect(res.passed).toBe(true);
  });

  it('inatumia: ignores keyword inside strings/comments', () => {
    const res = checkLesson(
      lessonWith([{ aina: 'inatumia', neno: 'weka' }]),
      'onyesha "weka hapa"  # weka tu\n',
    );
    expect(res.passed).toBe(false);
  });
});
