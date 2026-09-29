/**
 * Pure, network-free filtering over an already-fetched catalog result set.
 *
 * This never talks to Supabase and never decides which courses are visible
 * in the first place — that's the job of the `status = 'published'` RLS
 * policy on `courses` (see supabase/migrations/0002_rls.sql). This function
 * only narrows a list that's already safe to show.
 */

export type CatalogCourse = {
  id: string;
  title: string;
  description: string | null;
  price: number;
};

export type PriceFilter = "all" | "free" | "paid";

export type CatalogFilterOptions = {
  query?: string;
  priceFilter?: PriceFilter;
};

export function filterCourses<T extends CatalogCourse>(
  courses: T[],
  { query = "", priceFilter = "all" }: CatalogFilterOptions = {},
): T[] {
  const trimmedQuery = query.trim().toLowerCase();

  return courses.filter((course) => {
    if (trimmedQuery) {
      const title = course.title.toLowerCase();
      const description = course.description?.toLowerCase() ?? "";
      if (!title.includes(trimmedQuery) && !description.includes(trimmedQuery)) {
        return false;
      }
    }

    if (priceFilter === "free" && course.price !== 0) return false;
    if (priceFilter === "paid" && !(course.price > 0)) return false;

    return true;
  });
}
