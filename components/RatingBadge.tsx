export function RatingBadge({
  avgRating,
  reviewCount,
}: {
  avgRating: number | null;
  reviewCount: number;
}) {
  if (!reviewCount || avgRating === null) {
    return (
      <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
        No ratings yet
      </span>
    );
  }

  return (
    <span className="rating-badge">
      <span className="star" aria-hidden="true">★</span>
      <span>{avgRating.toFixed(1)}</span>
      <span className="count">({reviewCount})</span>
    </span>
  );
}
