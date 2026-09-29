import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { decideEnrollAction } from "@/lib/enrollDecision";
import { env } from "@/lib/env";
import type { Database } from "@/lib/database.types";

// NOTE ON THE FOLDER NAME: this route resolves its dynamic segment as a
// course SLUG (see openspec/changes/add-enroll-decision-checkout), matching
// how components/EnrollButton and the course detail page already navigate
// (`courseSlug`). The folder is still named `[courseId]` — not `[slug]` —
// because Next.js requires every route sharing the `/api/courses/*`
// prefix at this depth to use the SAME dynamic segment name; this route
// replaces what used to be a courseId-keyed handler at the same path, so
// the parameter name stayed `courseId` for that reason alone. Read the
// incoming value as a slug, not a UUID.
async function getAuthenticatedClient(request: Request) {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  // Real browsers authenticate via the cookie session (lib/supabase/server.ts).
  // A `Bearer` token is also accepted so non-browser callers (integration
  // tests, future mobile/API clients) can authenticate the same request
  // without needing to fabricate `@supabase/ssr`'s internal cookie format.
  // Either path still goes through the anon-key client, so RLS applies
  // identically — this is not a way to bypass authorization.
  if (bearerToken) {
    const supabase = createSupabaseClient<Database>(
      env.supabaseUrl,
      env.supabaseAnonKey,
      {
        global: { headers: { Authorization: `Bearer ${bearerToken}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser(bearerToken);
    return { supabase, user };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  // Despite the parameter name (forced by Next.js's routing constraints,
  // see the note above), this value is the course's slug.
  const { courseId: slug } = await params;
  const { supabase, user } = await getAuthenticatedClient(request);

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // RLS ("published or own courses are readable") already hides a draft
  // course from a non-owner here — no row back means 404, same as the
  // course detail page's "Draft course detail hidden" behavior.
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, price, status")
    .eq("slug", slug)
    .maybeSingle();

  if (courseError || !course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const action = decideEnrollAction(course.price);

  if (action === "checkout") {
    // Simulated checkout — no real payment provider integration yet, and
    // no enrollments row is written for a paid course until checkout
    // actually completes (out of scope for this stub).
    return NextResponse.json(
      {
        checkout: {
          checkoutUrl: `/checkout/simulated/${course.id}`,
          courseId: course.id,
          price: course.price,
        },
      },
      { status: 200 },
    );
  }

  // Already enrolled? Treat as a no-op success rather than an error.
  const { data: existing } = await supabase
    .from("enrollments")
    .select("id")
    .eq("course_id", course.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ enrollment: existing }, { status: 200 });
  }

  // RLS also enforces: user_id = auth.uid() AND target course is published.
  const { data, error } = await supabase
    .from("enrollments")
    .insert({ user_id: user.id, course_id: course.id })
    .select("id")
    .single();

  if (error) {
    // Unique violation (race) => already enrolled, not an error to the user.
    if (error.code === "23505") {
      return NextResponse.json({ enrolled: true }, { status: 200 });
    }
    return NextResponse.json(
      { error: "Could not enroll. The course may not be published." },
      { status: 400 },
    );
  }

  return NextResponse.json({ enrollment: data }, { status: 201 });
}
