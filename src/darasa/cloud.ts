// cloud.ts — DARASA progress + certificate sync, offline-first.
//
// localStorage is ALWAYS the source of truth and the offline cache. When a
// cloud backend is configured (see lib/supabase.ts) we additionally read/write
// Supabase, merging cloud + local so progress follows the learner across
// devices. Every cloud call is wrapped in try/catch and falls back to local —
// a backend hiccup must never break the lesson UI.
import { supabase, isCloudOn, ensureUser } from '../lib/supabase';

export const HIFADHI = 'snil:darasa'; // localStorage key — array of completed lesson ids
const HIFADHI_CHETI = 'snil:darasa:cheti'; // localStorage key — last issued certificate code

// ── localStorage helpers (the offline store) ───────────────────────────────
export function someaZilizokamilika(): Set<string> {
  try {
    const raw = localStorage.getItem(HIFADHI);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? new Set(arr.filter((x) => typeof x === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
}

export function hifadhiZilizokamilika(set: Set<string>): void {
  try {
    localStorage.setItem(HIFADHI, JSON.stringify([...set]));
  } catch {
    // hifadhi inaweza kuzuiwa (private mode); UI haijalemewa.
  }
}

function someaChetiLocal(): string | null {
  try {
    return localStorage.getItem(HIFADHI_CHETI);
  } catch {
    return null;
  }
}

function hifadhiChetiLocal(code: string): void {
  try {
    localStorage.setItem(HIFADHI_CHETI, code);
  } catch {
    // imezuiwa — sawa.
  }
}

// ── progress ────────────────────────────────────────────────────────────────

/**
 * Load completed-lesson ids. Always returns at least the local set instantly
 * (the caller can render it immediately). When cloud is on, also pulls cloud
 * rows, merges them with local, and writes the union back to both stores so the
 * two converge. Never throws.
 */
export async function loadProgress(): Promise<Set<string>> {
  const local = someaZilizokamilika();
  if (!isCloudOn() || !supabase) return local;

  try {
    const uid = await ensureUser();
    if (!uid) return local;

    const { data, error } = await supabase
      .from('snil_progress')
      .select('lesson_id')
      .eq('user_id', uid);
    if (error || !data) return local;

    const merged = new Set(local);
    for (const row of data) {
      if (row && typeof row.lesson_id === 'string') merged.add(row.lesson_id);
    }

    // Cache the union locally so offline reloads keep cloud progress.
    hifadhiZilizokamilika(merged);

    // Push any local-only lessons up so the cloud catches up too (fire/forget).
    const localOnly = [...local].filter(
      (id) => !data.some((r) => r.lesson_id === id),
    );
    if (localOnly.length > 0) {
      void supabase
        .from('snil_progress')
        .upsert(
          localOnly.map((lesson_id) => ({ user_id: uid, lesson_id })),
          { onConflict: 'user_id,lesson_id' },
        )
        .then(() => undefined, () => undefined);
    }

    return merged;
  } catch {
    return local;
  }
}

/**
 * Mark a lesson complete. Writes localStorage immediately (always) and, when
 * cloud is on, upserts the row in the background. Never throws.
 */
export async function markComplete(lessonId: string): Promise<void> {
  const set = someaZilizokamilika();
  set.add(lessonId);
  hifadhiZilizokamilika(set);

  if (!isCloudOn() || !supabase) return;
  try {
    const uid = await ensureUser();
    if (!uid) return;
    await supabase
      .from('snil_progress')
      .upsert(
        { user_id: uid, lesson_id: lessonId },
        { onConflict: 'user_id,lesson_id' },
      );
  } catch {
    // imeshahifadhiwa ndani; wingu litapatana baadaye.
  }
}

// ── certificates ─────────────────────────────────────────────────────────────

/** Generate a short, human-friendly verification code, e.g. SNIL-7K2Q-9F3X. */
function tengenezaCode(): string {
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  const block = () =>
    Array.from(
      { length: 4 },
      () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
    ).join('');
  return `SNIL-${block()}-${block()}`;
}

/**
 * Issue a certificate for `name` and return its public verification code.
 * Offline (or on any cloud error) it still mints a code locally so the learner
 * always gets a cheti namba; when cloud is on the row is persisted so the code
 * is verifiable from anywhere. Never throws.
 */
export async function issueCertificate(name: string): Promise<{ code: string }> {
  const safeName = (name || '').trim() || 'Mwanafunzi';

  if (isCloudOn() && supabase) {
    try {
      const uid = await ensureUser();
      if (uid) {
        // A few attempts in the unlikely event of a code collision.
        for (let attempt = 0; attempt < 4; attempt++) {
          const code = tengenezaCode();
          const { error } = await supabase
            .from('snil_certificates')
            .insert({ user_id: uid, name: safeName, code });
          if (!error) {
            hifadhiChetiLocal(code);
            return { code };
          }
        }
      }
    } catch {
      // anguka kwenye toleo la ndani hapa chini.
    }
  }

  // Offline / fallback: reuse an existing local code if present, else mint one.
  const existing = someaChetiLocal();
  const code = existing ?? tengenezaCode();
  hifadhiChetiLocal(code);
  return { code };
}

/**
 * Verify a certificate code. Returns the certificate record when found in the
 * cloud, null when not found, or undefined when verification is unavailable
 * (offline / cloud off / error) so the UI can distinguish "invalid" from
 * "can't check right now". Never throws.
 */
export async function verifyCertificate(
  code: string,
): Promise<{ name: string; issued_at: string; code: string } | null | undefined> {
  if (!isCloudOn() || !supabase) return undefined;
  try {
    const { data, error } = await supabase
      .from('snil_certificates')
      .select('name, issued_at, code')
      .eq('code', code.trim())
      .maybeSingle();
    if (error) return undefined;
    if (!data) return null;
    return data as { name: string; issued_at: string; code: string };
  } catch {
    return undefined;
  }
}
