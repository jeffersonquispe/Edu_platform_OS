import Link from "next/link";

interface Course {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
}

interface ResumeCardProps {
  /** Most recent active enrollment */
  course: Course | null;
  /** 0–100 */
  progressPercent?: number;
}

export function ResumeCard({ course, progressPercent = 0 }: ResumeCardProps) {
  if (!course) {
    return (
      <div className="bento-card bento-resume" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "var(--space-4)", textAlign: "center" }}>
        <span style={{ fontSize: 40 }}>📚</span>
        <div>
          <h3 style={{ color: "var(--color-text)", marginBottom: "var(--space-2)" }}>Start learning today</h3>
          <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
            Browse the catalog and enroll in your first course.
          </p>
          <Link href="/" className="btn">Browse catalog</Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bento-card bento-resume"
      style={{ display: "flex", gap: "var(--space-6)", alignItems: "stretch" }}
      data-testid="resume-card"
      data-course-title={course.title}
    >
      {/* Thumbnail */}
      {course.cover_url && (
        <div
          style={{
            width: 180,
            flexShrink: 0,
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            background: "var(--color-surface-2)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={course.cover_url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
        <div>
          <span
            className="badge badge-brand"
            style={{ marginBottom: "var(--space-3)" }}
          >
            ▶ Continue learning
          </span>
          <h2
            className="truncate"
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: "var(--fw-bold)",
              color: "var(--color-text)",
              marginBottom: "var(--space-2)",
              letterSpacing: "-0.02em",
            }}
          >
            {course.title}
          </h2>

          {/* Progress bar */}
          <div style={{ marginBottom: "var(--space-2)" }}>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${progressPercent}% complete`}
              />
            </div>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginTop: "var(--space-1)" }}>
              {progressPercent}% complete
            </p>
          </div>
        </div>

        <Link
          href={`/courses/${course.slug}`}
          className="btn"
          style={{ alignSelf: "flex-start" }}
        >
          Resume →
        </Link>
      </div>
    </div>
  );
}
