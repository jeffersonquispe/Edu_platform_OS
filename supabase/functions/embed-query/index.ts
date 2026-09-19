// supabase/functions/embed-query/index.ts
//
// Invoked by lib/search.ts's searchCoursesBySimilarity via
// supabase.functions.invoke("embed-query", { body: { text } }).
//
// Embeds a free-text search query with the same gte-small model used for
// courses (see supabase/functions/embed-course), so the resulting vector
// lives in the same embedding space and can be compared against
// courses.embedding via match_courses' cosine distance. Read-only — this
// function never touches the database.

const model = new Supabase.ai.Session("gte-small");

Deno.serve(async (req: Request) => {
  let text: string | undefined;
  try {
    ({ text } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
    });
  }

  if (!text || !text.trim()) {
    return new Response(JSON.stringify({ error: "text is required" }), {
      status: 400,
    });
  }

  const embedding = await model.run(text.trim(), {
    mean_pool: true,
    normalize: true,
  });

  return new Response(JSON.stringify({ embedding }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
