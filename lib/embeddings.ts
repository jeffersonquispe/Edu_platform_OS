import { createClient } from "@/lib/supabase/server";

/**
 * Builds the text to embed for a course: title + description, followed by
 * each module's title and, nested under it, its lessons' titles. Order
 * follows `position` so the embedded text matches what students see.
 */
export async function buildCourseEmbeddingText(
  courseId: string,
): Promise<string | null> {
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("title, description")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) {
    return null;
  }

  const { data: modules } = await supabase
    .from("modules")
    .select("title, position, lessons ( title, position )")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  const parts = [course.title, course.description ?? ""];

  for (const m of modules ?? []) {
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
