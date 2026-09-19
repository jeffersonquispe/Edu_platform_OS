## Why

The public catalog (`course-catalog`) only lists every published course; it has no way to find courses by topic or intent. As the catalog grows, keyword-less natural-language search lets a student describe what they want to learn and get relevant published courses back, rather than scanning the whole listing.

## What Changes

- Add a `courses.embedding` vector(384) column, populated automatically by a Postgres trigger (`courses_request_embedding`) that fires on course insert and on transition to `published` status, calling the `embed-course` Edge Function (gte-small model) asynchronously via `pg_net`.
- Add a `match_courses` Postgres RPC that ranks `published` courses by cosine similarity against a query embedding.
- Add an `embed-query` Edge Function that embeds free-text search input with the same gte-small model, and a `searchCoursesBySimilarity(query)` server-side function that calls it and filters results to a minimum similarity threshold (0.8) before returning matches.
- The embedded text per course is its title, description, and the titles of its modules and lessons (via `buildCourseEmbeddingText`), so search can match on outline content, not just the course description.

## Capabilities

### New Capabilities
- `course-search`: natural-language semantic search over published courses, backed by automatically maintained embeddings.

### Modified Capabilities
(none — course-catalog's listing/detail requirements are unchanged; search is an additive discovery path, not a change to how the catalog is displayed)

## Impact

- **Database**: new migration `0004_embeddings.sql` — `vector` and `pg_net` extensions, `courses.embedding` column + HNSW index, `request_course_embedding()` trigger function, `match_courses()` RPC. Requires Vault secrets (`project_url`, `service_role_key`) configured per environment.
- **Edge Functions**: new `supabase/functions/embed-course` (writes `courses.embedding`, service-role, bypasses RLS by design) and `supabase/functions/embed-query` (read-only, embeds search input).
- **App code**: new `lib/embeddings.ts` (`buildCourseEmbeddingText`) and `lib/search.ts` (`searchCoursesBySimilarity`), plus `lib/database.types.ts` gains the `match_courses` RPC type. No existing route or component is modified by this change — a search UI entry point is a follow-up, not included here.
