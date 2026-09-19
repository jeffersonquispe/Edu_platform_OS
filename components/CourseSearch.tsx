"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function CourseSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // The server re-renders with new results; once the URL's query matches what
  // was submitted, the navigation has landed.
  useEffect(() => {
    setValue(initialQuery);
    setIsPending(false);
  }, [initialQuery]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q === initialQuery.trim()) return;
    setIsPending(true);
    router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
  }

  function clear() {
    setValue("");
    if (initialQuery) {
      setIsPending(true);
      router.push("/");
    }
    inputRef.current?.focus();
  }

  return (
    <form className="course-search" onSubmit={submit} role="search">
      <div className="course-search-field">
        <svg
          className="course-search-icon"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
        </svg>

        <input
          ref={inputRef}
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Busca por tema, tecnología o lo que quieras aprender…"
          aria-label="Buscar cursos"
          autoComplete="off"
          enterKeyHint="search"
        />

        {value && (
          <button
            type="button"
            className="course-search-clear"
            onClick={clear}
            aria-label="Limpiar búsqueda"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="m6 6 8 8M14 6l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <button
        className="btn btn-primary"
        type="submit"
        disabled={isPending || !value.trim()}
      >
        {isPending ? "Buscando…" : "Buscar"}
      </button>
    </form>
  );
}
