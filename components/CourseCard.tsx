import Image from "next/image";
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
  priority?: boolean;
}

export function CourseCard({
  title,
  slug,
  coverUrl,
  authorName,
  avgRating = null,
  reviewCount = 0,
  priority = false,
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
        <Image
          src={coverUrl}
          alt={`Portada del curso ${title}`}
          className="course-card-thumb"
          width={640}
          height={360}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          quality={70}
          priority={priority}
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
