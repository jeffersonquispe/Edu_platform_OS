"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div
      className="container"
      style={{ paddingBlock: "var(--space-16)", textAlign: "center" }}
    >
      <div className="card" style={{ maxWidth: 480, marginInline: "auto" }}>
        <h2 style={{ marginBottom: "var(--space-3)" }}>¡Algo salió mal!</h2>
        <p style={{ marginBottom: "var(--space-6)", color: "var(--color-muted)" }}>
          Ocurrió un error inesperado. Intenta de nuevo o vuelve al inicio.
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
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
