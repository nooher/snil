// supabase.ts — SNIL's optional cloud backend for DARASA (progress + certificates).
//
// SNIL is OFFLINE-FIRST: localStorage is always the source of truth, and cloud
// sync only activates when Supabase is configured. To avoid a second paid
// project, SNIL reuses *Kasuku's* Supabase project by default — the URL and
// anon key below are PUBLIC client values (the anon key already ships in
// Kasuku's browser bundle), safe to embed. Either can be overridden per-deploy
// via VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
//
// Learners are identified with Supabase ANONYMOUS auth (no email/username),
// matching the Laetoli no-email ethos: each device gets a stable uid the first
// time it goes online. If Supabase is unconfigured, everything stays local.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Strip BOM/zero-width characters that sneak into pasted env values — a single
// U+FEFF in the apikey header makes every fetch throw "String contains non
// ISO-8859-1 code point". (Mirrors Kasuku's hardening.)
const ZERO_WIDTH = new RegExp('[\\u200B-\\u200D\\uFEFF]', 'g');
const clean = (v: unknown): string | undefined => {
  const s = typeof v === 'string' ? v.replace(ZERO_WIDTH, '').trim() : '';
  return s || undefined;
};

// Kasuku's PUBLIC Supabase project (reused to avoid a second paid project).
// These are client-safe values, overridable by env. The anon key is gated by
// row-level security — it grants only the access RLS policies allow.
const KASUKU_SUPABASE_URL = 'https://ujokjnfdhtswomhgjkfp.supabase.co';
const KASUKU_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqb2tqbmZkaHRzd29taGdqa2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDg5NjcsImV4cCI6MjA5NTkyNDk2N30.Iacm8WUH6kJvRgMvBNzQjLIylAxoIz4MF-CVwKfUeVo';

export const supabaseUrl = clean(import.meta.env.VITE_SUPABASE_URL) ?? KASUKU_SUPABASE_URL;
export const supabaseAnonKey =
  clean(import.meta.env.VITE_SUPABASE_ANON_KEY) ?? KASUKU_SUPABASE_ANON_KEY;

export const hasBackend = !!(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = hasBackend
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

/** True when a cloud backend is configured and usable. */
export function isCloudOn(): boolean {
  return supabase !== null;
}

// Cache the in-flight sign-in so concurrent callers share one anonymous user.
let signInPromise: Promise<string | null> | null = null;

/**
 * Ensure a stable per-device anonymous identity and return its uid.
 * Returns null when offline/unconfigured or if auth fails — callers must
 * treat null as "stay local". Never throws.
 */
export async function ensureUser(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const existing = sessionData.session?.user?.id;
    if (existing) return existing;

    if (!signInPromise) {
      signInPromise = supabase.auth
        .signInAnonymously()
        .then(({ data, error }) => {
          if (error) return null;
          return data.user?.id ?? null;
        })
        .catch(() => null)
        .finally(() => {
          signInPromise = null;
        });
    }
    return await signInPromise;
  } catch {
    return null;
  }
}
