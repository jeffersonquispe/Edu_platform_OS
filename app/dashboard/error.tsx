"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div
      className="card error"
      style={{ padding: "var(--space-8)", textAlign: "center" }}
    >
      <h2
        style={{
          fontSize: "var(--text-xl)",
          marginBottom: "var(--space-2)",
          color: "var(--color-text)",
        }}
      >
        No se pudo cargar el panel
      </h2>
      <p style={{ marginBottom: "var(--space-4)", color: "var(--color-muted)" }}>
        No se pudieron obtener las métricas del panel. Intenta de nuevo.
      </p>
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          justifyContent: "center",
        }}
      >
        <button onClick={() => reset()} className="btn btn-primary btn-sm">
          Reintentar
        </button>
        <Link href="/" className="btn btn-secondary btn-sm">
          Volver al catálogo
        </Link>
      </div>
    </div>
  );
}
