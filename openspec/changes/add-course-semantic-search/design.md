## Context

See proposal.md - Why. This is the first place the codebase calls an Edge Function from a Postgres trigger, and the first vector/embedding data in the schema, so the approach is documented here as the reference pattern for future async-trigger work (per the code comment in `0004_embeddings.sql`).

Existing conventions this design follows: RLS is the authorization layer (CLAUDE.md); reads happen directly against Supabase clients from `lib/`, no repository/query-object layer; `admin.ts` is used only where RLS must be bypassed, with the equivalent check re-implemented in code.

## Goals / Non-Goals

**Goals:**
- Keep embeddings current without making course writes wait on an external model call.
- Reuse one embedding space (gte-small, 384 dims) for both course content and search queries.
- Keep the privileged write path (setting `courses.embedding`) narrow and auditable.

**Non-Goals:**
- A search results UI / route handler — this change ships the data layer (`lib/search.ts`) only, not a page that calls it.
- Incremental/partial re-embedding (e.g. only when title changes vs. description). Any publish event recomputes the full text.
- Configurable similarity threshold per request — `MIN_SIMILARITY` is a single constant for this iteration.

## Decisions

**Trigger fires async via `pg_net`, not a synchronous call.**
The `courses_request_embedding` trigger function only validates which rows qualify (insert, or update where status just became `published`) and fires an HTTP POST via `pg_net.http_post`, then returns immediately. It does not wait for the Edge Function's response or write `embedding` itself.
Alternative considered: compute the embedding synchronously inside the trigger (e.g. via an `http` extension blocking call). Rejected — it would make every course insert/publish latency-bound on an external model call and hold the transaction open longer than necessary.

**The Edge Function, not the trigger, writes `courses.embedding`.**
`embed-course` re-fetches the course + modules/lessons itself (using only the `course_id` the trigger passed) and writes the result back with its own service-role client. This means the row read for embedding is whatever is current when the function runs, not a stale snapshot from the trigger's `NEW` row.
Alternative considered: pass the already-built text in the HTTP body from the trigger (`NEW.title`, etc.). Rejected — would require building the full module/lesson join inside PL/pgSQL and lose the guarantee that the embedded text matches the latest DB state if multiple writes race.

**Secrets via Supabase Vault, not hardcoded or column-stored.**
`project_url` and `service_role_key` are read from `vault.decrypted_secrets` by name at call time. Neither value is committed to the migration.
Alternative considered: read from a Postgres config GUC (`current_setting`). Rejected — GUCs set via `ALTER DATABASE ... SET` are visible to any role that can read `pg_settings`; Vault is the documented Supabase pattern for secrets a trigger function needs.

**One capability (`course-search`), not a delta on `course-catalog`.**
Search is a distinct discovery mechanism (query in, ranked subset out) from the catalog's "list everything published" behavior, and the embedding-maintenance requirement belongs with search, not authoring. Keeping it a separate spec avoids conflating "what the catalog shows" with "how search ranks."

**Duplicated embedding-text builder between `lib/embeddings.ts` and the Edge Function.**
`buildCourseEmbeddingText` (Next.js, uses `lib/supabase/server.ts` → `next/headers`) cannot be imported into the Deno-runtime Edge Function. The same title+description+module/lesson-titles logic is reimplemented in `supabase/functions/embed-course/index.ts` with a code comment flagging the two must stay in sync.
Alternative considered: extract a framework-agnostic text-assembly function (pure, takes already-fetched rows) into a shared module usable by both runtimes. Deferred as a non-goal for this change since it would require introducing a shared-package boundary between the Next.js app and `supabase/functions/`; worth revisiting if a third consumer appears.

**`match_courses` runs as `security invoker`, filters `status = 'published'` explicitly.**
Even though the caller's RLS policy on `courses` already restricts SELECT to published-or-own rows, the RPC repeats the `published` filter itself rather than relying solely on RLS. This keeps the function's contract self-evident and correct even if it is ever called with a service-role client.

**Minimum similarity threshold (0.8) applied in application code, not in the RPC.**
`lib/search.ts` filters `match_courses`' results by `MIN_SIMILARITY` rather than passing a threshold into the SQL function. Empirically, gte-small puts unrelated text pairs around 0.75-0.79 cosine similarity, so a fixed cutoff is needed to avoid returning the whole catalog re-ranked as "results" for a nonsense query — this is a model-specific tuning value most naturally owned by the TypeScript layer that already documents it.

## Risks / Trade-offs

- **[Eventual consistency]** A course is briefly searchable-by-catalog before its embedding finishes computing (async trigger). → Acceptable: `match_courses` filters `embedding is not null`, so the course simply doesn't appear in search results until the Edge Function completes, typically within seconds of publish.
- **[Silent skip on missing Vault secrets]** If `project_url`/`service_role_key` aren't configured in an environment, the trigger logs a `WARNING` and returns without erroring the insert/publish. → Intentional (don't block course writes on search infra), but means search can silently stay empty in a misconfigured environment. Operators must check Postgres logs for the warning after deploying this migration.
- **[Duplicated text-building logic]** `lib/embeddings.ts` and the Edge Function's inline builder can drift. → Mitigated only by a code comment today; revisit if it causes an actual bug.
- **[Fixed similarity threshold]** 0.8 was picked empirically against gte-small's observed baseline noise, not derived analytically. → If gte-small is ever swapped for a different model, `MIN_SIMILARITY` must be re-tuned.

## Migration Plan

1. Apply `0004_embeddings.sql` (adds `vector`/`pg_net` extensions, `embedding` column, HNSW index, trigger, `match_courses`).
2. Configure Vault secrets (`project_url`, `service_role_key`) in each environment before or immediately after applying the migration — until then, the trigger no-ops with a warning.
3. Deploy `embed-course` and `embed-query` Edge Functions.
4. Backfill: existing published courses have `embedding = null` until they're next updated to `published` (a no-op transition won't retrigger — see design decision above). A one-off backfill script/RPC call per existing published course is needed to populate embeddings for pre-existing data; not included in this change's tasks since it's an operational step, not new system behavior.
5. Rollback: dropping the trigger and `embed-course` function stops new embeddings from being generated; existing `embedding` values and `match_courses` can remain harmless if unused. Full rollback of the column/extensions would need a follow-up migration (not scripted here, consistent with the project's forward-only migration convention).
