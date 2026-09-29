-- 0006_catalog_filter_policy_tests: confirms the public catalog RLS
-- guarantee that "add-catalog-search-price-filter" (openspec/changes/
-- add-catalog-search-price-filter) depends on but does not itself enforce.
--
-- The catalog's text/price filtering (lib/catalogFilter.ts) is a pure,
-- in-memory function that only ever narrows a result set already fetched
-- under the "published or own courses are readable" policy in
-- 0002_rls.sql. It never decides draft-course visibility. This test
-- verifies that guarantee holds for an ANONYMOUS visitor specifically —
-- 0003_policy_tests.sql already covers a signed-in non-owner (Bob), but
-- not the anon role that an unauthenticated catalog visitor actually
-- uses. Both are required: this test must keep passing independently of
-- any change to lib/catalogFilter.ts or app/page.tsx, since it exercises
-- the database policy directly, not the application's filter code.
--
-- Run against a throwaway database (e.g. `supabase db reset` then psql -f this).
-- NOT a migration to apply in production — it seeds fixture rows and raises
-- an exception on any failed assertion. Wrapped in a transaction and rolled back.
--
--   begin;
--   \i supabase/migrations/0006_catalog_filter_policy_tests.sql
--   rollback;

begin;

-- ---------------------------------------------------------------------------
-- Fixture: one owner with a draft course and a published, free course.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
values
  ('33333333-3333-3333-3333-333333333333', 'carla@example.com', '', now(), now(), now(), 'authenticated', 'authenticated')
on conflict do nothing;

insert into public.courses (id, owner_id, title, slug, status, price)
values
  ('dddddddd-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Curso Borrador', 'curso-borrador', 'draft', 0),
  ('dddddddd-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Curso Publicado Gratis', 'curso-publicado-gratis', 'published', 0);

-- ---------------------------------------------------------------------------
-- Simulate an ANONYMOUS visitor: the `anon` role, no JWT claims at all.
-- This is the role the public catalog page (app/page.tsx) actually queries
-- as for a signed-out visitor.
-- ---------------------------------------------------------------------------
set local role anon;

do $$
declare n int;
begin
  -- The draft course must never be returned to an anonymous query,
  -- regardless of any text/price filter the catalog UI might apply —
  -- filtering happens in-memory in lib/catalogFilter.ts, after this
  -- query, and can only narrow further, never reveal a hidden row.
  select count(*) into n from public.courses
    where id = 'dddddddd-0000-0000-0000-000000000001';
  assert n = 0, 'anonymous visitor must not see the draft course';

  -- The published course must be visible, so we know the filter isn't
  -- accidentally hiding legitimate rows either.
  select count(*) into n from public.courses
    where id = 'dddddddd-0000-0000-0000-000000000002';
  assert n = 1, 'anonymous visitor must see the published course';

  -- A broader query mimicking the catalog's own SELECT ("status = published")
  -- must include the published course and exclude the draft one, without
  -- any app-level WHERE clause narrowing it — that's the whole point: RLS
  -- alone, not the app, keeps the draft out even from an unfiltered query.
  select count(*) into n from public.courses where status = 'draft';
  assert n = 0, 'no draft course should ever be selectable by anon, filtered or not';
end $$;

rollback;
