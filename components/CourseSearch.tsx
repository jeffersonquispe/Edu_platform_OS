"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PriceFilter } from "@/lib/catalogFilter";

const PRICE_OPTIONS: { value: PriceFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "free", label: "Gratis" },
  { value: "paid", label: "De pago" },
];

function buildCatalogUrl(query: string, price: PriceFilter) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (price !== "all") params.set("price", price);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export function CourseSearch({
  initialQuery = "",
  initialPriceFilter = "all",
}: {
  initialQuery?: string;
  initialPriceFilter?: PriceFilter;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>(initialPriceFilter);
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);

  // The input is uncontrolled so text typed before hydration survives it (a
  // controlled input would be reset to initialQuery). On mount, adopt what's
  // in the DOM; afterwards, the server re-renders with new results and once
  // the URL's query matches what was submitted, the navigation has landed.
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      setValue(inputRef.current?.value ?? initialQuery);
      return;
    }
    if (inputRef.current) inputRef.current.value = initialQuery;
    setValue(initialQuery);
    setPriceFilter(initialPriceFilter);
    setIsPending(false);
  }, [initialQuery, initialPriceFilter]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q === initialQuery.trim() && priceFilter === initialPriceFilter) return;
    setIsPending(true);
    router.push(buildCatalogUrl(q, priceFilter));
  }

  function selectPrice(next: PriceFilter) {
    if (next === priceFilter) return;
    setPriceFilter(next);
    setIsPending(true);
    router.push(buildCatalogUrl(value.trim(), next));
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setValue("");
    if (initialQuery) {
      setIsPending(true);
      router.push(buildCatalogUrl("", priceFilter));
    }
    inputRef.current?.focus();
  }

  return (
    <div className="course-search-wrapper">
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
            defaultValue={initialQuery}
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
          disabled={isPending || value.trim() === initialQuery.trim()}
        >
          {isPending ? "Buscando…" : "Buscar"}
        </button>
      </form>

      <div className="course-search-price-filter" role="group" aria-label="Filtrar por precio">
        {PRICE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`price-filter-pill${priceFilter === option.value ? " active" : ""}`}
            aria-pressed={priceFilter === option.value}
            onClick={() => selectPrice(option.value)}
            disabled={isPending}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
