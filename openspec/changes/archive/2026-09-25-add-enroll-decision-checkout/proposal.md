## Why

Enrollment currently assumes every course is free: `POST /api/courses/[courseId]/enroll` always inserts an `enrollments` row. `courses.price` already exists in the schema but nothing branches on it. A visitor enrolling in a paid course needs a different outcome — a checkout step, not immediate access — and that branching decision needs to be a pure, unit-testable function, separate from the Route Handler that actually talks to Supabase (same split as `add-catalog-search-price-filter`: pure decision logic vs. an integration-tested handler).

## What Changes

- Add a pure decision function (e.g. `lib/enrollDecision.ts`) that takes a course's price and returns one of two outcomes: `"enroll"` (price = 0) or `"checkout"` (price > 0). No network calls, no Supabase client — fully unit-testable.
- Add a new Route Handler `POST /api/courses/[slug]/enroll` (by slug, not `courseId` — matches how the course detail page and `EnrollButton` already navigate) that:
  - Resolves the course by slug.
  - Uses the pure decision function to branch:
    - `"enroll"`: creates the `enrollments` row exactly as the existing courseId-based handler does today (idempotent — a retry does not duplicate the row).
    - `"checkout"`: does **not** write to `enrollments`; returns a simulated `checkoutUrl` in the JSON response instead.
  - Requires an authenticated user, same as the existing handler.
- Wire `components/EnrollButton` to call the new slug-based endpoint (it already receives `courseSlug` as a prop) and handle a `checkoutUrl` response by treating it as "go to checkout" rather than "you're enrolled" — the exact UI treatment (redirect vs. link) is left to design.md/tasks, not specified here.
- The existing `POST /api/courses/[courseId]/enroll` handler is left as-is; not superseded or removed by this change.
- No real payment provider integration — "checkout" is simulated (a URL/stub), matching the acceptance criteria's "checkout simulado".

## Capabilities

### Modified Capabilities
- `enrollment`: adds a requirement that enrolling in a course with `price > 0` returns a simulated checkout instead of creating an enrollment record, while `price = 0` keeps the existing free-enrollment behavior; duplicate enroll attempts remain non-duplicating for the free path.

## Impact

- **Affected code**: `lib/` (new pure decision function + unit tests), `app/api/courses/[slug]/enroll/route.ts` (new Route Handler), `components/EnrollButton.tsx` (call the new endpoint, handle checkout response), no migration changes (`courses.price` already exists).
- **Testing split**:
  - Unit (Vitest, no network): the pure decision function's `price = 0` → `"enroll"` and `price > 0` → `"checkout"` branching.
  - Integration (against a real Supabase instance): confirms the free path actually inserts a row, the paid path inserts nothing and returns a `checkoutUrl`, and a repeat call on an already-enrolled free course does not duplicate the row. Same real-Supabase pattern used in `add-catalog-search-price-filter`'s `lib/queries/getPublishedCourses.integration.test.ts` (admin client to seed, real endpoint under test, cleanup in `afterAll`).
