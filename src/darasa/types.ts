// types.ts — the DARASA (interactive course) contract. The curriculum data
// (course.ts) and the checker (check.ts) implement these; the UI (Darasa.tsx)
// consumes them. Kiswahili-first throughout.

/** A single automated check on a learner's submission. */
export type Check =
  | { aina: 'matokeo_sawa'; thamani: string }   // program output equals this (trimmed)
  | { aina: 'matokeo_ina'; thamani: string }    // program output CONTAINS this
  | { aina: 'inatumia'; neno: string }          // source code uses this word/keyword
  | { aina: 'haina_kosa' };                     // program runs with no error

/** One lesson: explanation, a goal, starter code, checks, and a reference solution. */
export interface Lesson {
  id: string;
  kichwa: string;     // title (Kiswahili)
  maelezo: string;    // explanation — may be multi-line; plain text/Kiswahili
  lengo: string;      // the task the learner must accomplish
  anzia: string;      // starter code preloaded into the editor
  ukaguzi: Check[];   // ALL must pass for the lesson to be complete
  suluhisho: string;  // reference solution (MUST satisfy `ukaguzi`); also powers "Onyesha jibu"
}

export interface Course {
  kichwa: string;     // course title
  utangulizi: string; // one-paragraph intro
  masomo: Lesson[];   // ordered lessons
}

/** Result of running a learner's code against a lesson's checks. */
export interface CheckResult {
  passed: boolean;
  ujumbe: string;     // Kiswahili feedback (what passed / what to fix)
}
