// errors.ts — SNIL speaks Kiswahili even when it fails. Every error a learner sees
// is in Kiswahili, names the line, and (where useful) suggests a fix. This is the
// make-or-break of the educational promise: an English traceback must NEVER leak.
//
// Phase: 'kupima' (lexing) | 'kuchanganua' (parsing) | 'kutekeleza' (runtime).

export type Awamu = 'kupima' | 'kuchanganua' | 'kutekeleza';

export class SnilError extends Error {
  constructor(
    public ujumbe: string,   // the Kiswahili message
    public line: number,     // 1-based source line (0 = unknown)
    public awamu: Awamu,
    public dokezo?: string,  // optional hint ("dokezo: ...")
  ) {
    super(ujumbe);
    this.name = 'SnilError';
  }

  /** Human-facing rendering, e.g. "Mstari 3: Neno halijatambulika 'jna'. dokezo: ..." */
  toString(): string {
    const loc = this.line > 0 ? `Mstari ${this.line}: ` : '';
    return `${loc}${this.ujumbe}${this.dokezo ? ` (dokezo: ${this.dokezo})` : ''}`;
  }
}

/** Factory helpers — agents may add more; keep all messages in Kiswahili. */
export const Makosa = {
  herufiTatanishi: (ch: string, line: number) =>
    new SnilError(`Herufi isiyotambulika "${ch}".`, line, 'kupima'),
  maandishiHayajafungwa: (line: number) =>
    new SnilError('Maandishi hayajafungwa kwa alama ya nukuu (").', line, 'kupima'),
  ilitarajiwa: (nini: string, badala: string, line: number) =>
    new SnilError(`Ilitarajiwa ${nini} lakini kumepatikana "${badala}".`, line, 'kuchanganua'),
  nenoHalijatambulika: (name: string, line: number) =>
    new SnilError(`Neno "${name}" halijatambulika.`, line, 'kutekeleza', 'umelitangaza kwa "weka"?'),
  kaziHaijulikani: (name: string, line: number) =>
    new SnilError(`Kazi "${name}" haijulikani.`, line, 'kutekeleza'),
  ainaMbaya: (ujumbe: string, line: number) =>
    new SnilError(ujumbe, line, 'kutekeleza'),
  kugawanyaNaSifuri: (line: number) =>
    new SnilError('Huwezi kugawanya kwa sifuri.', line, 'kutekeleza'),
};
