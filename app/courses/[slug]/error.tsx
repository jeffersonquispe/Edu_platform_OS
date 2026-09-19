"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CourseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Course error:", error);
  }, [error]);

  return (
    <div
      className="container"
      style={{ paddingBlock: "var(--space-12)", textAlign: "center" }}
    >
      <div className="card" style={{ maxWidth: 500, marginInline: "auto" }}>
        <h2 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-2)" }}>
          Curso no disponible
        </h2>
        <p style={{ marginBottom: "var(--space-6)", color: "var(--color-muted)" }}>
          Ocurrió un problema al cargar este curso. Intenta de nuevo o vuelve al catálogo.
        </p>
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            justifyContent: "center",
          }}
        >
          <button onClick={() => reset()} className="btn btn-primary">
            Intentar de nuevo
          </button>
          <Link href="/" className="btn btn-secondary">
            Volver al catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
