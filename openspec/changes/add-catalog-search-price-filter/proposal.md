## Why

Visitors currently can only search the catalog via semantic (embedding) similarity — there is no way to filter results by price, and no fast, pure text-match path that doesn't depend on the embeddings Edge Function. A visitor who wants "solo los cursos gratis" or who types an exact title fragment has no reliable way to narrow the list. We need a text + price filter whose matching logic is a pure, unit-testable function, decoupled from the network/RLS-dependent Supabase query.

## What Changes

- Add a pure filtering function (`lib/catalogFilter.ts` or similar) that takes an in-memory list of catalog courses plus a text query and a price filter (`all` | `free` | `paid`), and returns the filtered list. No network calls, no Supabase client — fully unit-testable.
  - Text match: case-insensitive substring match against `title` OR `description`.
  - Price filter `free`: only courses with `price = 0`. `paid`: only courses with `price > 0`. `all`: no price filtering.
  - No matches: returns an empty array (not an error).
- Wire this pure function into the catalog page/query layer as an additional, independent filter path alongside (not replacing) the existing semantic search — the Supabase query still only ever selects `status = 'published'` rows; the pure function filters/narrows what's already been fetched from a published-only, RLS-governed query.
- Add a price filter UI control (gratis / de pago / todos) alongside the existing `CourseSearch` text input.
- No changes to RLS policies: the existing `published`-only visibility on `courses` already guarantees draft courses never reach the catalog query, for any visitor. This change adds a test that confirms that guarantee against a real Supabase instance, it does not change the policy itself.

## Capabilities

### Modified Capabilities
- `course-catalog`: adds a requirement that the public catalog SHALL support filtering by free-text query (title/description match) and by price tier (gratis/de pago), on top of the existing "published courses only" visibility rule.

## Impact

- **Affected code**: `lib/` (new pure filter function + unit tests), `app/page.tsx` (wire in price filter param, reuse pure function), `components/CourseSearch` (add price filter control), no migration changes.
- **New dependency**: Vitest for unit tests (not currently configured in this repo — `package.json`, `vitest.config.ts` to be added). A `.agents/skills/vitest/` skill already exists in the repo for generating these tests.
- **Testing split**:
  - Unit (Vitest, no network): the pure filter function's text-match, free-filter, and empty-result behavior.
  - Integration (against a real Supabase instance — local `supabase start` or a test project): confirms a `draft` course is never returned by the public catalog query, for any caller, proving RLS — not the app-level filter — is what blocks it. This belongs in `supabase/migrations/0003_policy_tests.sql` style pgTAP tests and/or a Supabase-backed integration test, not in the Vitest unit suite.
