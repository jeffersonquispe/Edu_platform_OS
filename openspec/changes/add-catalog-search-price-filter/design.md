## Context

See `proposal.md` - Why/What Changes for motivation. Today `app/page.tsx` fetches courses via one of two paths: a semantic-similarity RPC (`match_courses`, network-bound) when there's a text query, or a plain `.eq("status", "published")` Supabase query otherwise (see `lib/search.ts`, `app/page.tsx`). Neither path filters by price, and the matching/filtering logic is currently inline in the Server Component, entangled with the Supabase call — not unit-testable on its own. `courses.price` already exists in the schema (`lib/database.types.ts`).

Per the user story, acceptance criteria split cleanly into two testing levels that must land in two different places:
- Pure text/price matching logic → unit tests (Vitest, no network, no Supabase).
- "Draft courses never appear to anyone" → this is an RLS guarantee already enforced by the existing `courses` policies (see `supabase/migrations/0002_rls.sql` policy for published-only public read). It can only be meaningfully confirmed by querying a real Postgres instance with RLS active — an integration test, not a unit test.

## Goals / Non-Goals

**Goals:**
- Extract a pure, dependency-free filter function covering text-match and price-tier logic, testable with plain Vitest unit tests and no mocks.
- Add a price filter control to the catalog UI, combinable with the existing text search.
- Add (or extend) an integration test that proves a `draft` course is excluded from the public catalog query for any caller — verifying the RLS policy itself, independent of and not superseded by the new app-level filter.
- Introduce Vitest as the unit test runner for this repo (none configured today), scoped narrowly to this filter logic to start.

**Non-Goals:**
- Replacing or modifying the existing semantic (embedding) search path — text filtering here is a separate, simpler substring-match capability that composes with price filtering; it is not required to rank by semantic similarity.
- Any change to RLS policies themselves. The integration test asserts existing behavior; it does not introduce new policy.
- Building a general-purpose test framework beyond what's needed for this story (e.g., no broader integration test harness beyond what's needed to stand up/query a real or locally-running Supabase instance for this one guarantee).

## Decisions

- **Pure function boundary**: introduce `lib/catalogFilter.ts` exporting a function shaped like `filterCourses(courses: CatalogCourse[], { query, priceFilter }): CatalogCourse[]`, operating only on in-memory data already fetched from Supabase. Rationale: this is the only way to satisfy "unitaria, sin red" — any function that itself calls `supabase.from(...)` cannot be unit tested without a network/DB dependency. Alternative considered: filtering via Postgres `ilike`/`or()` query builder chains directly in `app/page.tsx` — rejected because it would make the filter logic untestable except via integration tests, contradicting the story's explicit two-tier testing requirement.
- **Price filter values**: model as a small union `"all" | "free" | "paid"` rather than a raw boolean, to keep the "todos" (no filter) state explicit and avoid a `price === undefined` ambiguity.
- **Text match semantics**: case-insensitive substring match on `title` OR `description` (simple `includes`), not a fuzzy/semantic match — deliberately distinct from and simpler than the existing embeddings-based search, per the story's "busco por un texto que coincide con el título o la descripción" wording.
- **Where the pure function is called**: in `app/page.tsx`, after the existing published-only Supabase fetch, applied to the in-memory result set — so RLS/`status = 'published'` remains the sole gate on draft visibility, and the pure filter only narrows what's already safe to show.
- **Test runner**: Vitest, per the repo's own `.agents/skills/vitest/` skill already present for generating these tests, and because it needs no request/response server and runs fast for pure-function unit tests.
- **Integration test placement**: a pgTAP-style test alongside `supabase/migrations/0003_policy_tests.sql`'s existing pattern (or a new numbered migration/test file following that convention), run against a local `supabase start` stack — asserting that a `SELECT` against `courses` filtered to `status = 'draft'` returns zero rows for an anonymous/other-user role, and that this holds regardless of any app-level filter params. This directly exercises the RLS policy rather than app code.

## Risks / Trade-offs

- [Two test suites for one story could get out of sync — e.g. someone "fixes" a bug by weakening RLS without re-running the integration suite] → Mitigation: tasks.md calls out both suites explicitly as required for this change; CI (or at minimum local `npm run test` + a documented `supabase start` + pgTAP run) should run both before merge.
- [Introducing Vitest adds a new dev dependency and config to a repo with "no test suite configured"] → Mitigation: scope the initial Vitest setup narrowly (config + this one test file) rather than migrating other code to tests in this change.
- [Price filter and text filter both applied could produce a confusing "no results" state indistinguishable from a real empty catalog] → Mitigation: existing empty-state UI already branches on `query` vs. no-query (see `app/page.tsx`); extend that branch to mention the price filter too so the message stays accurate (implementation detail, not spec-level).
