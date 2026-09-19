import { createClient } from "@/lib/supabase/server";

export type CourseSearchResult = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  similarity: number;
};

/**
 * Embeds `query` with the same gte-small model used for courses (via the
 * "embed-query" Edge Function) and returns the most similar *published*
 * courses, ranked by cosine similarity.
 *
 * Read-only and RLS-safe: `match_courses` runs with the caller's privileges
 * and only ever selects `status = 'published'` rows (see 0004_embeddings.sql).
 */
/**
 * gte-small puts any two texts at ~0.75-0.79 cosine similarity regardless of
 * topic, so unrelated queries ("jardinería") still rank every course. Genuine
 * matches sit at 0.85+. Cutting at 0.80 drops that baseline noise and lets the
 * "no results" state actually appear.
 */
const MIN_SIMILARITY = 0.8;

export async function searchCoursesBySimilarity(
  query: string,
  matchCount = 10,
): Promise<CourseSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const supabase = await createClient();

  const { data: embedResponse, error: embedError } =
    await supabase.functions.invoke<{ embedding: number[] }>("embed-query", {
      body: { text: trimmed },
    });

  if (embedError || !embedResponse?.embedding) {
    throw new Error(
      `searchCoursesBySimilarity: failed to embed query — ${embedError?.message ?? "no embedding returned"}`,
    );
  }

  const { data, error } = await supabase.rpc("match_courses", {
    query_embedding: embedResponse.embedding,
    match_count: matchCount,
  });

  if (error) {
    throw new Error(`searchCoursesBySimilarity: ${error.message}`);
  }

  return (data ?? []).filter((r) => r.similarity >= MIN_SIMILARITY);
}
