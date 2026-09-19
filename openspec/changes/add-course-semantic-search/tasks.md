## 1. Database schema

- [x] 1.1 Add `vector` and `pg_net` extensions, `courses.embedding vector(384)` column, and `courses_embedding_idx` HNSW index in `supabase/migrations/0004_embeddings.sql`
- [x] 1.2 Add `request_course_embedding()` trigger function and `courses_request_embedding` trigger (fires on insert, and on update where status transitions to `published`) — verify by inspecting `tg_op`/`old.status`/`new.status` branches in the migration
- [x] 1.3 Add `match_courses(query_embedding, match_count)` RPC filtering to `status = 'published' and embedding is not null`, ordered by cosine distance — verify by reading the function body in the migration
- [ ] 1.4 Apply the migration to a local/dev Supabase instance and verify it runs cleanly (`supabase db reset` or `db push`)
- [ ] 1.5 Configure Vault secrets `project_url` and `service_role_key` in each target environment and verify the trigger no longer logs the "not set in Vault" warning after a test insert

## 2. Edge Functions

- [x] 2.1 Implement `supabase/functions/embed-course/index.ts`: re-fetch course + modules/lessons, build embedding text, run gte-small, write `courses.embedding` via service-role client
- [x] 2.2 Implement `supabase/functions/embed-query/index.ts`: embed free-text input with gte-small, return `{ embedding }`, no DB access
- [ ] 2.3 Deploy both functions (`supabase functions deploy embed-course embed-query`) and verify each responds correctly to a manual test invocation

## 3. Application data layer

- [x] 3.1 Implement `buildCourseEmbeddingText(courseId)` in `lib/embeddings.ts` (title + description + module/lesson titles, ordered by `position`)
- [x] 3.2 Implement `searchCoursesBySimilarity(query, matchCount?)` in `lib/search.ts`: embed query via `embed-query`, call `match_courses` RPC, filter by `MIN_SIMILARITY`
- [x] 3.3 Add `match_courses` RPC typing to `lib/database.types.ts`'s `Functions` map — verify `supabase.rpc("match_courses", ...)` type-checks

## 4. Verification

- [ ] 4.1 End-to-end check: publish a course, wait for the embed-course trigger to complete, then call `searchCoursesBySimilarity` with a query matching that course's content and verify it appears in results
- [ ] 4.2 Verify a draft course never appears in `searchCoursesBySimilarity` results even with a strongly matching query
- [ ] 4.3 Verify an unrelated/nonsense query returns an empty result list (similarity threshold excludes baseline noise)
- [ ] 4.4 Verify `searchCoursesBySimilarity("")` (empty/whitespace query) returns `[]` without invoking the embed-query function

## 5. Follow-ups (explicitly out of scope for this change)

- [ ] 5.1 One-off backfill of `embedding` for courses already `published` before this migration (see design.md - Migration Plan, step 4)
- [ ] 5.2 Search UI / route handler that calls `searchCoursesBySimilarity` (see proposal.md - Impact)
