/**
 * Integration test — real Supabase, real RLS. No mocks.
 *
 * Inserts one `published` and one `draft` course via the admin (service-role)
 * client, which bypasses RLS, then queries the public catalog with the SAME
 * anon-key client a real, signed-out visitor's browser uses
 * (getPublishedCourses -> lib/supabase/browser.ts's anon key), and asserts
 * the draft course never appears — because RLS blocks it, not because
 * getPublishedCourses filters it out in application code (it doesn't; its
 * only filter is `.eq("status", "published")`, and RLS is what actually
 * enforces that a draft row can't leak even if that clause were removed).
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and
 * SUPABASE_SERVICE_ROLE_KEY (loaded from .env.local by vitest.config.ts).
 * Skips itself with a clear message if they're absent, rather than failing
 * everyone's `npm run test` run in an environment with no Supabase project
 * configured.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket as NodeWebSocket } from "ws";
import type { Database } from "@/lib/database.types";
import { getPublishedCourses } from "./getPublishedCourses";

// Node 20 (this repo's current runtime) has no native `WebSocket` global;
// supabase-js always builds a RealtimeClient on createClient(), even when
// only REST queries are used, and throws without one. Polyfill it for this
// test process only.
if (typeof globalThis.WebSocket === "undefined") {
  // @ts-expect-error — ws's WebSocket is API-compatible with the DOM one
  // for supabase-js's purposes, but its types don't line up exactly.
  globalThis.WebSocket = NodeWebSocket;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasCredentials = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

describe.runIf(hasCredentials)("getPublishedCourses — integración RLS real", () => {
  let admin: SupabaseClient<Database>;
  let anon: SupabaseClient<Database>;

  let ownerId: string;
  let publishedCourseId: string;
  let draftCourseId: string;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ownerEmail = `catalog-it-${suffix}@example.com`;
  const publishedSlug = `catalog-it-published-${suffix}`;
  const draftSlug = `catalog-it-draft-${suffix}`;

  beforeAll(async () => {
    admin = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anon = createClient<Database>(SUPABASE_URL!, ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // A course needs a real owner_id (FK -> profiles -> auth.users). Create
    // one via the admin client's auth API; the handle_new_user trigger
    // creates the matching profiles row.
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email: ownerEmail,
      email_confirm: true,
    });
    if (userError || !userData.user) {
      throw new Error(`failed to create test owner: ${userError?.message}`);
    }
    ownerId = userData.user.id;

    // Insert one published and one draft course as the admin client, which
    // bypasses RLS entirely — this is only test setup, not what's under test.
    const { data: published, error: publishedError } = await admin
      .from("courses")
      .insert({
        owner_id: ownerId,
        title: "Curso publicado (integration test)",
        slug: publishedSlug,
        status: "published",
        price: 0,
      })
      .select("id")
      .single();
    if (publishedError || !published) {
      throw new Error(`failed to insert published course: ${publishedError?.message}`);
    }
    publishedCourseId = published.id;

    const { data: draft, error: draftError } = await admin
      .from("courses")
      .insert({
        owner_id: ownerId,
        title: "Curso borrador (integration test)",
        slug: draftSlug,
        status: "draft",
        price: 0,
      })
      .select("id")
      .single();
    if (draftError || !draft) {
      throw new Error(`failed to insert draft course: ${draftError?.message}`);
    }
    draftCourseId = draft.id;
  });

  afterAll(async () => {
    if (!admin) return;
    // Clean up everything this test created, regardless of which
    // assertions passed or failed.
    await admin.from("courses").delete().in("id", [publishedCourseId, draftCourseId].filter(Boolean));
    if (ownerId) {
      await admin.auth.admin.deleteUser(ownerId);
    }
  });

  it("nunca devuelve el curso en borrador al consultar el catálogo como visitante anónimo", async () => {
    const { data, error } = await getPublishedCourses(anon);

    expect(error).toBeNull();

    const ids = (data ?? []).map((c) => c.id);
    expect(ids).not.toContain(draftCourseId);
  });

  it("sí devuelve el curso publicado al consultar el catálogo como visitante anónimo", async () => {
    const { data, error } = await getPublishedCourses(anon);

    expect(error).toBeNull();

    const ids = (data ?? []).map((c) => c.id);
    expect(ids).toContain(publishedCourseId);
  });
});

if (!hasCredentials) {
  // eslint-disable-next-line no-console
  console.warn(
    "[getPublishedCourses.integration.test.ts] skipped — set NEXT_PUBLIC_SUPABASE_URL, " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY to run it.",
  );
}
