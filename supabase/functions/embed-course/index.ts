// supabase/functions/embed-course/index.ts
//
// Invoked by the `courses_request_embedding` trigger (see
// supabase/migrations/0004_embeddings.sql) whenever a course is inserted or
// flips to status = 'published'. Body: { course_id: string }.
//
// Responsibilities:
//   1. Re-fetch the course + its modules/lessons (the trigger only passes
//      the id, not the text — the row can have changed by the time this
//      runs, so we always read fresh).
//   2. Build the same embedding text as lib/embeddings.ts's
//      buildCourseEmbeddingText (title + description + module titles +
//      nested lesson titles). Duplicated here — not imported — because Edge
//      Functions run on Deno and can't import Next.js's `lib/` tree
//      (it pulls in next/headers via lib/supabase/server.ts). If you change
//      one, change the other.
//   3. Run that text through gte-small (Supabase's built-in free embedding
//      model, via the Supabase.ai session) to get a vector(384).
//   4. Write it back to courses.embedding with the service-role client,
//      bypassing RLS (this function IS the privileged write path — there is
//      no client-facing route that sets `embedding` directly).

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Supabase Edge Functions ship gte-small on-board; no external API key or
// network call to a third-party model provider is needed.
// https://supabase.com/docs/guides/functions/ai-models
const model = new Supabase.ai.Session("gte-small");

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
};

type ModuleWithLessons = {
  title: string;
  position: number;
  lessons: { title: string; position: number }[] | null;
};

/** Mirrors lib/embeddings.ts's buildCourseEmbeddingText — keep in sync. */
function buildEmbeddingText(
  course: CourseRow,
  modules: ModuleWithLessons[],
): string {
  const parts: string[] = [course.title, course.description ?? ""];

  for (const m of modules) {
    parts.push(m.title);
    const lessons = (m.lessons ?? [])
      .slice()
      .sort((a, b) => a.position - b.position);
    for (const l of lessons) {
      parts.push(l.title);
    }
  }

  return parts.filter((p) => p.trim().length > 0).join("\n");
}

Deno.serve(async (req: Request) => {
  let courseId: string | undefined;
  try {
    ({ course_id: courseId } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
    });
  }

  if (!courseId) {
    return new Response(JSON.stringify({ error: "course_id is required" }), {
      status: 400,
    });
  }

  // Service-role client: this function bypasses RLS by design (it's the
  // only writer of courses.embedding) and must re-implement the "which
  // course" check itself — we only ever touch the row matching courseId.
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, description")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError || !course) {
    return new Response(
      JSON.stringify({ error: courseError?.message ?? "course not found" }),
      { status: 404 },
    );
  }

  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("title, position, lessons ( title, position )")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  if (modulesError) {
    return new Response(JSON.stringify({ error: modulesError.message }), {
      status: 500,
    });
  }

  const text = buildEmbeddingText(course, modules ?? []);

  const embedding = await model.run(text, {
    mean_pool: true,
    normalize: true,
  });

  const { error: updateError } = await supabase
    .from("courses")
    .update({ embedding: embedding as unknown as number[] })
    .eq("id", courseId);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ course_id: courseId, ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
