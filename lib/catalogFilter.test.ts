import { describe, expect, it } from "vitest";
import { filterCourses, type CatalogCourse } from "./catalogFilter";

const courses: CatalogCourse[] = [
  {
    id: "1",
    title: "Introducción a React",
    description: "Aprende los fundamentos de React desde cero.",
    price: 0,
  },
  {
    id: "2",
    title: "Next.js avanzado",
    description: "Server Components, Server Actions y despliegue.",
    price: 49,
  },
  {
    id: "3",
    title: "Bases de datos con Postgres",
    description: "Modelado, índices y Row Level Security.",
    price: 29,
  },
];

describe("filterCourses", () => {
  it("returns only courses whose title matches the query", () => {
    const result = filterCourses(courses, { query: "react" });
    expect(result.map((c) => c.id)).toEqual(["1"]);
  });

  it("returns only courses whose description matches the query", () => {
    const result = filterCourses(courses, { query: "security" });
    expect(result.map((c) => c.id)).toEqual(["3"]);
  });

  it("matches case-insensitively", () => {
    const result = filterCourses(courses, { query: "NEXT.JS" });
    expect(result.map((c) => c.id)).toEqual(["2"]);
  });

  it("returns only free courses when the free filter is applied", () => {
    const result = filterCourses(courses, { priceFilter: "free" });
    expect(result.map((c) => c.id)).toEqual(["1"]);
  });

  it("returns only paid courses when the paid filter is applied", () => {
    const result = filterCourses(courses, { priceFilter: "paid" });
    expect(result.map((c) => c.id).sort()).toEqual(["2", "3"]);
  });

  it("returns all courses when the price filter is 'all'", () => {
    const result = filterCourses(courses, { priceFilter: "all" });
    expect(result).toHaveLength(3);
  });

  it("combines text query and price filter with AND semantics", () => {
    const result = filterCourses(courses, { query: "postgres", priceFilter: "free" });
    expect(result).toEqual([]);
  });

  it("returns an empty array, not an error, when nothing matches", () => {
    const result = filterCourses(courses, { query: "jardinería" });
    expect(result).toEqual([]);
  });

  it("returns an empty array for an empty catalog", () => {
    const result = filterCourses([], { query: "react" });
    expect(result).toEqual([]);
  });
});
