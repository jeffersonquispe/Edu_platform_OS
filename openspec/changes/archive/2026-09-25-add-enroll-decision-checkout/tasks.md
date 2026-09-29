## 1. Pure enroll decision (unit-tested)

- [x] 1.1 Create `lib/enrollDecision.ts` exporting `type EnrollAction = "enroll" | "checkout"` and `decideEnrollAction(price: number): EnrollAction`: `price === 0` → `"enroll"`, `price > 0` → `"checkout"`
- [x] 1.2 Write unit tests in `lib/enrollDecision.test.ts` covering both acceptance criteria: price = 0 → `"enroll"`; price > 0 (e.g. 1, 29, 100) → `"checkout"`; verify all pass via `npx vitest run lib/enrollDecision.test.ts`

## 2. Slug-based enroll Route Handler

- [x] 2.1 Create `app/api/courses/[slug]/enroll/route.ts`: require an authenticated user (401 if absent, same as the existing courseId handler), fetch the course by slug (id, price, status) — treat "no row" (RLS-hidden draft or nonexistent slug) as 404
- [x] 2.2 Branch on `decideEnrollAction(course.price)`: `"enroll"` path creates the `enrollments` row (reusing the existing handler's already-enrolled short-circuit + `23505` unique-violation fallback so retries never duplicate); `"checkout"` path performs no write and returns `{ checkout: { checkoutUrl: "/checkout/simulated/<courseId>", courseId, price } }`
- [x] 2.3 Confirm `npm run lint` and `npx tsc --noEmit` are clean for the new route file

## 3. EnrollButton wiring

- [x] 3.1 Update `components/EnrollButton.tsx` to call `POST /api/courses/${courseSlug}/enroll` instead of the courseId endpoint
- [x] 3.2 Handle a `checkout` response distinctly from an `enrollment` response (e.g. navigate to `checkoutUrl` or render a "Proceed to checkout" link) rather than showing the "✓ You're enrolled" state
- [ ] 3.3 Verify manually in `npm run dev` that enrolling in a free course still shows the enrolled state, and enrolling in a paid course reaches the simulated checkout path instead — **not run**: this requires an interactive browser session against a running dev server with a signed-in test user, which this environment can't drive. Covered instead by the group-4 integration tests (server-side, same endpoint) and lint/tsc passing on the component; flagging so you can spot-check the UI manually if you want that specific confirmation.

## 4. Integration tests (real Supabase, following getPublishedCourses.integration.test.ts's pattern)

- [x] 4.1 Create `lib/queries/enrollCourse.integration.test.ts` that seeds, via the admin client: a test user (with a real password, signed in for a genuine access token), one published free course (price 0), one published paid course (price > 0) — unique slugs/emails per run, `describe.runIf(hasCredentials)` skip guard, cleanup in `afterAll`. Starts a real `next dev` server in-process (spawn) and calls the actual Route Handler over HTTP with `Authorization: Bearer <token>` — see the route's `getAuthenticatedClient`, added specifically so a non-browser caller (this test) can authenticate without fabricating `@supabase/ssr`'s cookie format
- [x] 4.2 Test: calling the enroll endpoint as the authenticated test user against the free course creates exactly one `enrollments` row for that user/course (asserted via a `count` query, not just the response body)
- [x] 4.3 Test: calling it against the paid course creates zero `enrollments` rows for that user/course, and the response includes a `checkoutUrl` (and no `enrollment` key)
- [x] 4.4 Test: calling it a second time against the already-enrolled free course still results in exactly one `enrollments` row (no duplicate) — verified by counting rows for that user/course id, not just checking the response
- [x] 4.5 Ran `npx vitest run lib/queries/enrollCourse.integration.test.ts` against the linked Supabase project — 3/3 passed. Verified via Supabase MCP `execute_sql` that `afterAll` left zero residual `courses`/`auth.users` rows, and via `tasklist` that no orphaned `next dev` process remained (Windows `spawn(..., {shell:true})` requires `taskkill /pid <pid> /t /f`, not `child.kill()`, to reap the actual `next-server` process — fixed in `afterAll`)

## 5. Wrap-up

- [x] 5.1 Run `npm run lint`, `npx tsc --noEmit`, and `npx vitest run` (full suite) and verify all succeed — 23/23 tests pass via `npm run test` (added `testTimeout`/`hookTimeout: 90_000` to `vitest.config.ts` so the enroll integration test's `next dev` bootstrap fits under the default runner, no extra flags needed)
- [x] 5.2 Updated `CLAUDE.md`: the Commands section's test-suite note now describes both unit and real-Supabase integration tests running under `npm run test`; the App structure section's `courses/[courseId]/enroll` mention now notes it resolves by slug and why the folder kept that name
