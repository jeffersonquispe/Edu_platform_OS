import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RatingBadge } from "@/components/RatingBadge";
import { EnrollButton } from "@/components/EnrollButton";
import { ReviewList } from "@/components/ReviewList";
import { ReviewForm } from "@/components/ReviewForm";

type CourseDetailParams = { slug: string };

// RLS: visible if status='published' OR owner_id = caller. A draft
// requested by a non-owner (or anonymous visitor) returns no row, which
// we treat as "does not exist" both here and in generateMetadata.
async function getCourse(slug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, title, slug, description, cover_url, status, owner_id, profiles ( display_name, bio, avatar_url )",
    )
    .eq("slug", slug)
    .maybeSingle();

  return { supabase, user, course };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<CourseDetailParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { course } = await getCourse(slug);

  if (!course) {
    return {};
  }

  const description =
    course.description?.slice(0, 160) ??
    `Learn ${course.title} on Course Platform.`;

  return {
    title: course.title,
    description,
    alternates: { canonical: `/courses/${course.slug}` },
    openGraph: {
      title: course.title,
      description,
      type: "website",
      images: course.cover_url ? [{ url: course.cover_url }] : undefined,
    },
    twitter: {
      card: course.cover_url ? "summary_large_image" : "summary",
      title: course.title,
      description,
    },
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<CourseDetailParams>;
}) {
  const { slug } = await params;
  const { supabase, user, course } = await getCourse(slug);

  if (!course) {
    notFound();
  }

  const isOwner = user?.id === course.owner_id;

  const [{ data: modules }, { data: ratingRow }] = await Promise.all([
    supabase
      .from("modules")
      .select("id, title, position, lessons ( id, title, position )")
      .eq("course_id", course.id)
      .order("position", { ascending: true }),
    supabase
      .from("course_ratings")
      .select("avg_rating, review_count")
      .eq("course_id", course.id)
      .maybeSingle(),
  ]);

  let isEnrolled = false;
  if (user && !isOwner) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", course.id)
      .eq("user_id", user.id)
      .maybeSingle();
    isEnrolled = !!enrollment;
  }

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, user_id, rating, body, created_at, profiles ( display_name )")
    .eq("course_id", course.id)
    .order("created_at", { ascending: false });

  const myReview = user
    ? (reviews ?? []).find((r) => r.user_id === user.id) ?? null
    : null;

  const author = Array.isArray(course.profiles)
    ? course.profiles[0]
    : course.profiles;

  const sortedModules = (modules ?? []).map((m) => ({
    ...m,
    lessons: (m.lessons ?? []).slice().sort((a, b) => a.position - b.position),
  }));

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description ?? undefined,
    url: `/courses/${course.slug}`,
    image: course.cover_url ?? undefined,
    provider: {
      "@type": "Organization",
      name: "Course Platform",
    },
    ...(author?.display_name && {
      author: { "@type": "Person", name: author.display_name },
    }),
    ...(ratingRow?.review_count
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: ratingRow.avg_rating ?? 0,
            reviewCount: ratingRow.review_count,
          },
        }
      : {}),
  };

  return (
    <section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {course.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={course.cover_url}
          alt={`Cover image for ${course.title}`}
          style={{
            width: "100%",
            maxHeight: 320,
            objectFit: "cover",
            borderRadius: 8,
            marginBottom: 16,
          }}
        />
      )}

      {course.status === "draft" && isOwner && (
        <p className="muted" role="status">
          This course is a draft — only you can see it.
        </p>
      )}

      <h1>{course.title}</h1>
      <p className="muted">
        by {author?.display_name ?? "Unknown"}
        {author?.bio ? ` — ${author.bio}` : ""}
      </p>
      <RatingBadge
        avgRating={ratingRow?.avg_rating ?? null}
        reviewCount={ratingRow?.review_count ?? 0}
      />

      {course.description && <p>{course.description}</p>}

      <EnrollButton
        courseId={course.id}
        courseSlug={course.slug}
        isSignedIn={!!user}
        isOwner={isOwner}
        isEnrolled={isEnrolled}
      />

      <h2>Lessons</h2>
      {sortedModules.length === 0 ? (
        <p className="muted">No modules yet.</p>
      ) : (
        <nav aria-label="Course modules">
          <ol>
            {sortedModules.map((m) => (
              <li key={m.id} style={{ marginBottom: 8 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 4 }}>
                  {m.title}
                </h3>
                <ol>
                  {m.lessons.map((l) => (
                    <li key={l.id}>
                      {isEnrolled || isOwner ? (
                        <a href={`/courses/${course.slug}/lessons/${l.id}`}>
                          {l.title}
                        </a>
                      ) : (
                        <span>
                          {l.title}{" "}
                          <span aria-hidden="true" title="Locked — enroll to access">
                            🔒
                          </span>
                          <span className="sr-only"> (locked — enroll to access)</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <h2>Reviews</h2>
      {user && isEnrolled && (
        <ReviewForm courseId={course.id} existingReview={myReview} />
      )}
      <ReviewList reviews={reviews ?? []} />
    </section>
  );
}
