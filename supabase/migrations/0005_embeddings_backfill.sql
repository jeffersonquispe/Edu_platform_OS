-- supabase/migrations/0005_embeddings_backfill.sql
--
-- 0004_embeddings.sql's trigger only fires on INSERT, or on UPDATE when
-- status just flipped to 'published'. Courses that were already published
-- before 0004 was applied never crossed that edge, so their `embedding`
-- stayed NULL forever.
--
-- Fix: extract the actual "fire the embed-course request" logic out of the
-- trigger function into a standalone public.request_course_embedding_for(
-- course_id) that can be called directly (not just via trigger NEW/OLD).
-- The trigger function becomes a thin wrapper around it, and this migration
-- also does a one-time backfill call for every published course still
-- missing an embedding.

create or replace function public.request_course_embedding_for(course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  project_url      text;
  service_role_key text;
  request_id       bigint;
begin
  select decrypted_secret into project_url
    from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into service_role_key
    from vault.decrypted_secrets where name = 'service_role_key';

  if project_url is null or service_role_key is null then
    raise warning 'request_course_embedding_for: project_url/service_role_key not set in Vault, skipping embedding for course %', course_id;
    return;
  end if;

  select net.http_post(
    url     := project_url || '/functions/v1/embed-course',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body    := jsonb_build_object('course_id', course_id)
  ) into request_id;
end;
$$;

-- Trigger function now just decides *whether* to request an embedding and
-- delegates the actual HTTP call to request_course_embedding_for above.
create or replace function public.request_course_embedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    null;
  elsif tg_op = 'UPDATE' and new.status = 'published' and old.status is distinct from 'published' then
    null;
  else
    return new;
  end if;

  perform public.request_course_embedding_for(new.id);

  return new;
end;
$$;

-- One-time backfill: request an embedding for every published course that
-- doesn't have one yet (pre-existing rows that never crossed the
-- INSERT/just-published edge the trigger watches for).
do $$
declare
  course record;
begin
  for course in
    select id from public.courses
    where status = 'published' and embedding is null
  loop
    perform public.request_course_embedding_for(course.id);
  end loop;
end;
$$;
