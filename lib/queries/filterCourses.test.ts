import { describe, expect, it } from "vitest";
import { filterCourses, type CatalogCourse } from "../catalogFilter";

// Fixture catalog used across the three unitary acceptance criteria.
// Deliberately mixes matching/non-matching titles, matching-only-by-description
// courses, and both free (price = 0) and paid (price > 0) courses.
const catalog: CatalogCourse[] = [
  {
    id: "1",
    title: "Introducción a React",
    description: "Aprende los fundamentos de React desde cero.",
    price: 0,
  },
  {
    id: "2",
    title: "Marketing digital para emprendedores",
    description: "Estrategias de contenido y publicidad online.",
    price: 39,
  },
  {
    id: "3",
    title: "Curso de repostería",
    description: "Aprende a preparar postres con React de horno.",
    price: 0,
  },
];

describe("filterCourses — criterios unitarios", () => {
  // AC: "Dado el catálogo, cuando busco por un texto que coincide con el
  // título o la descripción, entonces solo veo esos cursos."
  it("con un texto que coincide con el título o la descripción, solo devuelve esos cursos", () => {
    const result = filterCourses(catalog, { query: "react" });

    // Coincide por título (curso 1) y por descripción (curso 3, "de horno" con React).
    expect(result.map((c) => c.id).sort()).toEqual(["1", "3"]);
    // El curso sin ninguna coincidencia no debe aparecer.
    expect(result.some((c) => c.id === "2")).toBe(false);
  });

  // AC: "Dado un filtro 'gratis', cuando lo aplico, entonces solo veo cursos
  // con precio = 0."
  it("con el filtro 'gratis' aplicado, solo devuelve cursos con precio = 0", () => {
    const result = filterCourses(catalog, { priceFilter: "free" });

    expect(result.map((c) => c.id).sort()).toEqual(["1", "3"]);
    expect(result.every((c) => c.price === 0)).toBe(true);
  });

  // AC: "Dado que ningún curso cumple los filtros, entonces la lista queda
  // vacía."
  it("cuando ningún curso cumple los filtros, la lista queda vacía", () => {
    const result = filterCourses(catalog, {
      query: "jardinería",
      priceFilter: "free",
    });

    expect(result).toEqual([]);
  });
});
