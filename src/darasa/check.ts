// check.ts — runs a learner's SNIL submission and evaluates a lesson's checks,
// returning warm, specific Kiswahili feedback. Built by the Curriculum agent.
import { run } from '../lang/index';
import type { Lesson, Check, CheckResult } from './types';

/** Strip comments and string literals so `inatumia` matches real code, not text. */
function ondoaMaoniNaMaandishi(code: string): string {
  let out = '';
  let i = 0;
  const n = code.length;
  while (i < n) {
    const ch = code[i];
    // multi-line comment  ### ... ###
    if (ch === '#' && code.startsWith('###', i)) {
      const end = code.indexOf('###', i + 3);
      i = end === -1 ? n : end + 3;
      continue;
    }
    // single-line comment  # ...
    if (ch === '#') {
      const nl = code.indexOf('\n', i);
      i = nl === -1 ? n : nl;
      continue;
    }
    // string literal  "..."
    if (ch === '"') {
      i++;
      while (i < n) {
        if (code[i] === '\\') { i += 2; continue; }
        if (code[i] === '"') { i++; break; }
        i++;
      }
      out += ' '; // keep tokens apart
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

export function checkLesson(lesson: Lesson, code: string): CheckResult {
  const matokeo = run(code);
  const kosaUjumbe = matokeo.error ? matokeo.error.toString() : null;
  const codeBila = ondoaMaoniNaMaandishi(code);

  for (const ukaguzi of lesson.ukaguzi as Check[]) {
    switch (ukaguzi.aina) {
      case 'haina_kosa': {
        if (matokeo.error) {
          return { passed: false, ujumbe: `Kuna kosa katika msimbo wako: ${kosaUjumbe}` };
        }
        break;
      }
      case 'matokeo_sawa': {
        if (matokeo.error) {
          return {
            passed: false,
            ujumbe: `Msimbo haukukamilika kwa sababu ya kosa: ${kosaUjumbe}`,
          };
        }
        const got = matokeo.output.trim();
        const want = ukaguzi.thamani.trim();
        if (got !== want) {
          return {
            passed: false,
            ujumbe:
              `Matokeo bado hayajalingana.\nYalitarajiwa:\n${want}\n\nUlipata:\n${got || '(hakuna matokeo)'}\n\nAngalia tena kwa makini — jaribu tena!`,
          };
        }
        break;
      }
      case 'matokeo_ina': {
        if (matokeo.error) {
          return {
            passed: false,
            ujumbe: `Msimbo haukukamilika kwa sababu ya kosa: ${kosaUjumbe}`,
          };
        }
        if (!matokeo.output.includes(ukaguzi.thamani)) {
          return {
            passed: false,
            ujumbe:
              `Matokeo yako yanapaswa kuwa na "${ukaguzi.thamani}", lakini sikuyaona. Ulipata:\n${matokeo.output.trim() || '(hakuna matokeo)'}`,
          };
        }
        break;
      }
      case 'inatumia': {
        if (!codeBila.includes(ukaguzi.neno)) {
          return {
            passed: false,
            ujumbe: `Somo hili linakuhimiza kutumia "${ukaguzi.neno}". Jaribu kuliingiza katika msimbo wako.`,
          };
        }
        break;
      }
    }
  }

  return { passed: true, ujumbe: 'Hongera! Umekamilisha somo hili kwa ufanisi. 🎉' };
}
