import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * The public catalog's "list everything" query — every course with
 * `status = 'published'`, newest first, with the author's display name.
 *
 * This performs no filtering of its own beyond `status = 'published'`: it
 * relies entirely on the "published or own courses are readable" RLS policy
 * (supabase/migrations/0002_rls.sql) to keep draft courses out. Called with
 * an anon-key client (browser/server), RLS guarantees a draft course never
 * appears here regardless of the caller — see
 * lib/queries/getPublishedCourses.integration.test.ts.
 *
 * Text/price narrowing on top of this result belongs to the pure
 * `filterCourses` function in lib/catalogFilter.ts, not here.
 */
export async function getPublishedCourses(supabase: SupabaseClient<Database>) {
  return supabase
    .from("courses")
    .select("id, title, description, price, slug, cover_url, profiles ( display_name )")
    .eq("status", "published")
    .order("created_at", { ascending: false });
}
