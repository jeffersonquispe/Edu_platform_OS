import Link from "next/link";
import { RatingBadge } from "@/components/RatingBadge";

export interface CourseCardProps {
  id: string;
  title: string;
  slug: string;
  coverUrl?: string | null;
  authorName?: string | null;
  avgRating?: number | null;
  reviewCount?: number;
}

export function CourseCard({
  title,
  slug,
  coverUrl,
  authorName,
  avgRating = null,
  reviewCount = 0,
}: CourseCardProps) {
  // Generate consistent dynamic gradient based on course title char code
  const titleCharCode = title.charCodeAt(0) || 65;
  const hue1 = (titleCharCode * 7) % 360;
  const hue2 = (titleCharCode * 13) % 360;

  return (
    <Link
      href={`/courses/${slug}`}
      className="course-card"
      aria-label={`${title} por ${authorName ?? "Instructor desconocido"}`}
      data-testid="course-card"
      data-course-title={title}
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={`Portada del curso ${title}`}
          className="course-card-thumb"
        />
      ) : (
        /* Placeholder gradient thumb */
        <div
          className="course-card-thumb"
          style={{
            background: `linear-gradient(135deg, hsl(${hue1}deg 60% 55%), hsl(${hue2}deg 70% 65%))`,
          }}
          aria-hidden="true"
        />
      )}

      <div className="course-card-body">
        <p className="course-card-author">
          {authorName || "Instructor desconocido"}
        </p>
        <h2 className="course-card-title">{title}</h2>
        <RatingBadge avgRating={avgRating} reviewCount={reviewCount} />
      </div>
    </Link>
  );
}
