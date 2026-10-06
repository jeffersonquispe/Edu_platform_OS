import { createClient } from "@/lib/supabase/server";
import { CourseCard } from "@/components/CourseCard";
import { CourseSearch } from "@/components/CourseSearch";
import { PromoBanner } from "@/components/PromoBanner";
import { searchCoursesBySimilarity } from "@/lib/search";
import { filterCourses, type PriceFilter } from "@/lib/catalogFilter";
import { getPublishedCourses } from "@/lib/queries/getPublishedCourses";

export const metadata = {
  title: "Course Catalog",
};

type CourseListItem = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  slug: string;
  cover_url: string | null;
  authorName: string | null;
};

function parsePriceFilter(value: string | undefined): PriceFilter {
  return value === "free" || value === "paid" ? value : "all";
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; price?: string }>;
}) {
  const { q, price } = await searchParams;
  const query = q?.trim() ?? "";
  const priceFilter = parsePriceFilter(price);
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
          .select("id, title, description, price, slug, cover_url, profiles ( display_name )")
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
              description: c.description,
              price: c.price,
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
    const { data, error: listError } = await getPublishedCourses(supabase);

    error = listError?.message ?? null;
    courses = (data ?? []).map((c) => {
      const author = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        price: c.price,
        slug: c.slug,
        cover_url: c.cover_url,
        authorName: author?.display_name ?? null,
      };
    });
  }

  // filterCourses is a pure, network-free narrowing of the already-fetched,
  // already-published-only result set above — it never decides which
  // courses are visible in the first place (that's the `status = 'published'`
  // RLS policy's job), it only applies the price filter on top.
  courses = filterCourses(courses, { priceFilter });

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
      <PromoBanner />

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
        <CourseSearch initialQuery={query} initialPriceFilter={priceFilter} />
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
          {query && priceFilter !== "all" ? (
            <p>
              No encontramos cursos {priceFilter === "free" ? "gratis" : "de pago"}{" "}
              relacionados con <strong>“{query}”</strong>. Prueba con otras
              palabras o quita el filtro de precio.
            </p>
          ) : query ? (
            <p>
              No encontramos cursos relacionados con <strong>“{query}”</strong>.
              Prueba con otras palabras.
            </p>
          ) : priceFilter !== "all" ? (
            <p>
              No hay cursos {priceFilter === "free" ? "gratis" : "de pago"} disponibles
              por ahora.
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
          {courses.map((c, idx) => {
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
                priority={idx < 2}
              />
            );
          })}
        </section>
      )}
    </>
  );
}
