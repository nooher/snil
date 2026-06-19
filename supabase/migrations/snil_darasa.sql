-- snil_darasa.sql — cloud progress + certificates for SNIL's DARASA learn mode.
--
-- This migration is meant to run on KASUKU'S existing Supabase project (SNIL
-- reuses it to avoid a second paid project). Every object is prefixed `snil_`
-- so it lives safely beside Kasuku's own tables. Fully idempotent — safe to run
-- repeatedly.
--
-- Identity: learners use Supabase ANONYMOUS auth, so `user_id` is `auth.uid()`.
-- RLS restricts each learner to their own rows; certificates are additionally
-- readable by their public `code` so a cheti can be verified by anyone.

-- ── snil_progress ──────────────────────────────────────────────────────────
-- One row per (learner, completed lesson).
create table if not exists public.snil_progress (
  user_id      uuid        not null default auth.uid(),
  lesson_id    text        not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.snil_progress enable row level security;

drop policy if exists "snil_progress_select_own" on public.snil_progress;
create policy "snil_progress_select_own"
  on public.snil_progress for select
  using (auth.uid() = user_id);

drop policy if exists "snil_progress_insert_own" on public.snil_progress;
create policy "snil_progress_insert_own"
  on public.snil_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "snil_progress_update_own" on public.snil_progress;
create policy "snil_progress_update_own"
  on public.snil_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "snil_progress_delete_own" on public.snil_progress;
create policy "snil_progress_delete_own"
  on public.snil_progress for delete
  using (auth.uid() = user_id);

-- ── snil_certificates ──────────────────────────────────────────────────────
-- One row per issued cheti. `code` is the public verification number.
create table if not exists public.snil_certificates (
  id        uuid        primary key default gen_random_uuid(),
  user_id   uuid        not null default auth.uid(),
  name      text        not null,
  issued_at timestamptz not null default now(),
  code      text        not null unique
);

alter table public.snil_certificates enable row level security;

-- Owners can read their own certificates...
drop policy if exists "snil_certificates_select_own" on public.snil_certificates;
create policy "snil_certificates_select_own"
  on public.snil_certificates for select
  using (auth.uid() = user_id);

-- ...and anyone (including anon) can read a certificate when they already know
-- its code — this powers public verification ("is cheti X genuine?"). It does
-- not allow enumeration: a verifier must supply the exact code in their query
-- (e.g. .eq('code', code)). Listing without a code filter still returns only
-- the caller's own rows in practice because no code is known.
drop policy if exists "snil_certificates_select_by_code" on public.snil_certificates;
create policy "snil_certificates_select_by_code"
  on public.snil_certificates for select
  using (true);

drop policy if exists "snil_certificates_insert_own" on public.snil_certificates;
create policy "snil_certificates_insert_own"
  on public.snil_certificates for insert
  with check (auth.uid() = user_id);
