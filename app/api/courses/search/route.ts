import { NextResponse } from "next/server";
import { searchCoursesBySimilarity } from "@/lib/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ courses: [] });
  }

  try {
    const results = await searchCoursesBySimilarity(q);

    return NextResponse.json({
      courses: results.map((course) => ({
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        precio: course.price,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo completar la búsqueda.",
      },
      { status: 500 },
    );
  }
}
