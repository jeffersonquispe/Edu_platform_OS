## 1. Test tooling setup

- [x] 1.1 Add Vitest as a dev dependency and a minimal `vitest.config.ts`, and verify `npx vitest run` executes (even with zero tests) without error
- [x] 1.2 Add an `npm run test` script wired to Vitest, and verify it runs via `npm run test`

## 2. Pure filter function (unit-tested)

- [x] 2.1 Create `lib/catalogFilter.ts` exporting a `CatalogCourse` type (`id`, `title`, `description`, `price`, plus existing display fields) and a `PriceFilter = "all" | "free" | "paid"` union
- [x] 2.2 Implement `filterCourses(courses, { query, priceFilter })`: case-insensitive substring match on `title` OR `description` when `query` is non-empty, plus `price === 0` for `"free"` / `price > 0` for `"paid"` / no-op for `"all"`, combining both filters with AND
- [x] 2.3 Write unit tests in `lib/catalogFilter.test.ts` covering: text query matches title-or-description and excludes non-matches; `free` filter returns only `price === 0` courses; `paid` filter returns only `price > 0` courses; a filter combination that matches nothing returns `[]`; verify all pass via `npx vitest run lib/catalogFilter.test.ts`

## 3. Catalog UI wiring

- [x] 3.1 Add a price filter control (gratis / de pago / todos) to `components/CourseSearch` (or a sibling component), reading/writing a `price` search param alongside the existing `q` param
- [x] 3.2 In `app/page.tsx`, read the `price` search param, fetch published courses as today (unchanged Supabase query, still gated by `status = "published"`), then apply `filterCourses` from `lib/catalogFilter.ts` to the in-memory result before rendering — verify manually that combining a text query and a price filter narrows the grid as expected in `npm run dev`
- [x] 3.3 Update the empty-state copy to account for an active price filter (not just an active text query), and verify the empty state renders when a filter combination matches nothing

## 4. RLS integration test (draft courses never visible)

- [x] 4.1 Add a pgTAP test (following the existing `supabase/migrations/0003_policy_tests.sql` convention, in a new numbered migration/test file) that inserts a `draft` course and asserts a `SELECT` against `courses` as an anonymous/other-user role returns zero rows for that course id
- [x] 4.2 Run the test against a local stack (`npx supabase start` + `npx supabase test db`, or the project's existing pgTAP invocation) and verify it passes, confirming the RLS policy — not `filterCourses` — is what excludes drafts — **Docker unavailable in this environment (user directive: do not use Docker).** Verified instead via the Supabase MCP (`execute_sql`) directly against the linked remote project (`oflbnukqsoagyxrskkki` / "Udemy2"), read-only, no fixtures inserted: `set local role anon; select count(*) from public.courses where status = 'draft'` → `0` (of 3 existing draft rows), and the same for `status = 'published'` → `11` (of 11 existing published rows), confirming RLS — not the app filter — excludes drafts for anon. The pgTAP-style script in `0006_catalog_filter_policy_tests.sql` remains for future local/CI runs once a Postgres/Supabase stack is available.
- [x] 4.3 Document in the migration/test file's comments that this test must keep passing independently of any catalog-filter application code, per `design.md` - Decisions

## 5. Wrap-up

- [x] 5.1 Run `npm run lint` and `npx vitest run` and verify both succeed
- [x] 5.2 Update `CLAUDE.md` / README if needed to mention `npm run test` as the unit test entry point (only if such a commands section already documents `npm run lint` etc., to keep it accurate)
