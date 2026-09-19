import { createClient } from "@/lib/supabase/server";
import { CourseCard } from "@/components/CourseCard";
import { CourseSearch } from "@/components/CourseSearch";
import { searchCoursesBySimilarity } from "@/lib/search";

export const metadata = {
  title: "Course Catalog",
};

type CourseListItem = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  authorName: string | null;
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const supabase = await createClient();

  let courses: CourseListItem[] = [];
  let error: string | null = null;

  if (query) {
    // Semantic search: match_courses ranks published courses by cosine
    // similarity, so it returns ids/titles but not the author — fetch the
    // display fields for the matched ids and re-apply the ranked order.
    try {
      const matches = await searchCoursesBySimilarity(query);
      const ids = matches.map((m) => m.id);

      if (ids.length > 0) {
        const { data } = await supabase
          .from("courses")
          .select("id, title, slug, cover_url, profiles ( display_name )")
          .in("id", ids);

        const byId = new Map((data ?? []).map((c) => [c.id, c]));
        courses = matches.flatMap((m) => {
          const c = byId.get(m.id);
          if (!c) return [];
          const author = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
          return [
            {
              id: c.id,
              title: c.title,
              slug: c.slug,
              cover_url: c.cover_url,
              authorName: author?.display_name ?? null,
            },
          ];
        });
      }
    } catch (e) {
      error =
        e instanceof Error ? e.message : "No se pudo completar la búsqueda.";
    }
  } else {
    const { data, error: listError } = await supabase
      .from("courses")
      .select("id, title, slug, cover_url, profiles ( display_name )")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    error = listError?.message ?? null;
    courses = (data ?? []).map((c) => {
      const author = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        cover_url: c.cover_url,
        authorName: author?.display_name ?? null,
      };
    });
  }

  const courseIds = courses.map((c) => c.id);
  const { data: ratings } = courseIds.length
    ? await supabase
        .from("course_ratings")
        .select("course_id, avg_rating, review_count")
        .in("course_id", courseIds)
    : {
        data: [] as {
          course_id: string;
          avg_rating: number | null;
          review_count: number;
        }[],
      };
  const ratingsByCourse = new Map((ratings ?? []).map((r) => [r.course_id, r]));

  return (
    <>
      {/* Hero */}
      <section
        className="catalog-hero animate-fade-in"
        aria-labelledby="catalog-heading"
      >
        <h1 id="catalog-heading">Learn without limits.</h1>
        <p>
          Explore expert-led courses and start building skills that matter —
          at your own pace, anytime.
        </p>
        <CourseSearch initialQuery={query} />
      </section>

      {/* Error state */}
      {error && <div className="error">{error}</div>}

      {/* Result summary */}
      {!error && query && courses.length > 0 && (
        <p className="search-summary animate-fade-in" aria-live="polite">
          {courses.length}{" "}
          {courses.length === 1 ? "curso relacionado" : "cursos relacionados"}{" "}
          con <strong>“{query}”</strong>, ordenados por relevancia.
        </p>
      )}

      {/* Empty states */}
      {!error && courses.length === 0 && (
        <div className="empty-state animate-fade-in">
          {query ? (
            <p>
              No encontramos cursos relacionados con <strong>“{query}”</strong>.
              Prueba con otras palabras.
            </p>
          ) : (
            <p>No courses published yet — check back soon.</p>
          )}
        </div>
      )}

      {/* Catalog grid */}
      {courses.length > 0 && (
        <section
          className="catalog-grid stagger animate-slide-up"
          aria-label={query ? "Resultados de búsqueda" : "Available courses"}
        >
          {courses.map((c) => {
            const rating = ratingsByCourse.get(c.id);

            return (
              <CourseCard
                key={c.id}
                id={c.id}
                title={c.title}
                slug={c.slug}
                coverUrl={c.cover_url}
                authorName={c.authorName}
                avgRating={rating?.avg_rating ?? null}
                reviewCount={rating?.review_count ?? 0}
              />
            );
          })}
        </section>
      )}
    </>
  );
}
