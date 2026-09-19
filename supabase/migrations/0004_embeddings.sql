-- supabase/migrations/0004_embeddings.sql

create extension if not exists vector;

alter table public.courses
  add column embedding vector(384);

create index courses_embedding_idx
  on public.courses using hnsw (embedding vector_cosine_ops);

-- ===========================================================================
-- Async embedding generation via Edge Function.
--
-- This is the first "call an Edge Function from a trigger" pattern in this
-- repo, so it's written verbosely to serve as a reference for future ones.
-- The shape to copy for a new trigger like this:
--   1. requires the `pg_net` extension (async HTTP from Postgres).
--   2. project URL + service role key are read from Vault, never hardcoded
--      or stored in a table column (both are secrets).
--   3. the trigger function does the *validation* (which rows qualify) and
--      fires-and-forgets an HTTP POST; it does NOT wait for the response or
--      write `embedding` itself — the Edge Function calls back into
--      Postgres (via the service role client) to update the row once the
--      gte-small embedding is computed. This keeps the triggering
--      transaction fast and avoids blocking writes on an external model call.
-- ===========================================================================

create extension if not exists pg_net;

-- Vault secrets, set once per environment (via SQL editor or `supabase
-- secrets`/vault UI, NOT committed to a migration):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service-role-key>', 'service_role_key');
-- The trigger below looks them up by name at call time so the migration
-- itself never contains a secret value.

create or replace function public.request_course_embedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_url      text;
  service_role_key text;
  request_id       bigint;
begin
  -- Only (re)generate the embedding when there's new text to embed:
  --   * a brand-new course (any status), or
  --   * an existing course whose status just flipped to 'published'
  --     (drafts are never search-indexed, so no point embedding them yet).
  -- Skip everything else (e.g. a title-only edit on a still-published
  -- course) to avoid re-embedding on every unrelated update.
  if tg_op = 'INSERT' then
    -- fall through: always embed on insert
    null;
  elsif tg_op = 'UPDATE' and new.status = 'published' and old.status is distinct from 'published' then
    -- fall through: just got published
    null;
  else
    return new;
  end if;

  -- Look up project URL + service role key from Vault. If they aren't
  -- configured yet (e.g. local dev without secrets set up), log and skip
  -- instead of failing the INSERT/UPDATE that triggered this.
  select decrypted_secret into project_url
    from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into service_role_key
    from vault.decrypted_secrets where name = 'service_role_key';

  if project_url is null or service_role_key is null then
    raise warning 'request_course_embedding: project_url/service_role_key not set in Vault, skipping embedding for course %', new.id;
    return new;
  end if;

  -- Fire-and-forget async HTTP call via pg_net. The Edge Function
  -- ("embed-course") is responsible for:
  --   1. building the embedding input text (title + description + module/
  --      lesson titles, see lib/embeddings.ts's buildCourseEmbeddingText),
  --   2. running it through gte-small,
  --   3. writing the resulting vector(384) back to courses.embedding
  --      using its own service-role Supabase client.
  -- pg_net queues the request and returns immediately; it does not block
  -- this transaction on the Edge Function's response.
  select net.http_post(
    url     := project_url || '/functions/v1/embed-course',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body    := jsonb_build_object('course_id', new.id)
  ) into request_id;

  return new;
end;
$$;

create trigger courses_request_embedding
  after insert or update on public.courses
  for each row execute function public.request_course_embedding();

-- ===========================================================================
-- match_courses: cosine-similarity search over published courses only.
--
-- security invoker (the default) so it runs as the calling role and stays
-- subject to the "published or own courses" RLS policy from 0002_rls —
-- the `status = 'published'` filter below is belt-and-suspenders, not the
-- only gate. Called via supabase.rpc('match_courses', ...) from lib/search.ts.
-- ===========================================================================
create or replace function public.match_courses(
  query_embedding vector(384),
  match_count     int default 10
)
returns table (
  id          uuid,
  title       text,
  slug        text,
  description text,
  price       numeric,
  similarity  float
)
language sql
stable
as $$
  select
    c.id,
    c.title,
    c.slug,
    c.description,
    c.price,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.courses c
  where c.status = 'published'
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;