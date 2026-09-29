/**
 * Integration test — real Supabase, real RLS, real HTTP call to the actual
 * Route Handler. No mocks.
 *
 * Starts `next dev` in the background, seeds (via the admin/service-role
 * client) a test user, a published FREE course, and a published PAID
 * course, then calls the real `POST /api/courses/[slug]/enroll` endpoint
 * as that authenticated user (via a Bearer token — see
 * app/api/courses/[slug]/enroll/route.ts's getAuthenticatedClient) and
 * asserts on what actually landed in `enrollments`:
 *
 *  - free course  -> exactly one enrollments row is created
 *  - paid course  -> zero enrollments rows are created, response has checkoutUrl
 *  - retry (free) -> still exactly one enrollments row (no duplicate)
 *
 * This is what the acceptance criteria call for explicitly ("cuando llamo a
 * POST /api/courses/[slug]/enroll") — the pure branching decision itself is
 * covered by lib/enrollDecision.test.ts; this file only proves the Route
 * Handler really does (or doesn't) write, end to end.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and
 * SUPABASE_SERVICE_ROLE_KEY (loaded from .env.local by vitest.config.ts).
 * Skips itself with a clear message if they're absent.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket as NodeWebSocket } from "ws";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import type { Database } from "@/lib/database.types";

if (typeof globalThis.WebSocket === "undefined") {
  // @ts-expect-error — ws's WebSocket is API-compatible with the DOM one
  // for supabase-js's purposes, but its types don't line up exactly.
  globalThis.WebSocket = NodeWebSocket;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasCredentials = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

const DEV_SERVER_PORT = 3100;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;
const DEV_SERVER_STARTUP_TIMEOUT_MS = 60_000;

async function waitForServer(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`dev server did not become ready within ${timeoutMs}ms`);
}

describe.runIf(hasCredentials)("POST /api/courses/[slug]/enroll — integración real", () => {
  let admin: SupabaseClient<Database>;
  let devServer: ChildProcess;

  let userId: string;
  let accessToken: string;
  let freeCourseId: string;
  let paidCourseId: string;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const userEmail = `enroll-it-${suffix}@example.com`;
  const userPassword = `Test-${suffix}-!Aa1`;
  const freeSlug = `enroll-it-free-${suffix}`;
  const paidSlug = `enroll-it-paid-${suffix}`;

  beforeAll(async () => {
    admin = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Real, confirmed user with a real password so we can sign in and get a
    // genuine access token — the same kind a browser session would carry.
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
    });
    if (userError || !userData.user) {
      throw new Error(`failed to create test user: ${userError?.message}`);
    }
    userId = userData.user.id;

    const anonForSignIn = createClient<Database>(SUPABASE_URL!, ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signInData, error: signInError } =
      await anonForSignIn.auth.signInWithPassword({
        email: userEmail,
        password: userPassword,
      });
    if (signInError || !signInData.session) {
      throw new Error(`failed to sign in test user: ${signInError?.message}`);
    }
    accessToken = signInData.session.access_token;

    const { data: free, error: freeError } = await admin
      .from("courses")
      .insert({
        owner_id: userId,
        title: "Curso gratis (enroll integration test)",
        slug: freeSlug,
        status: "published",
        price: 0,
      })
      .select("id")
      .single();
    if (freeError || !free) {
      throw new Error(`failed to insert free course: ${freeError?.message}`);
    }
    freeCourseId = free.id;

    const { data: paid, error: paidError } = await admin
      .from("courses")
      .insert({
        owner_id: userId,
        title: "Curso de pago (enroll integration test)",
        slug: paidSlug,
        status: "published",
        price: 49,
      })
      .select("id")
      .single();
    if (paidError || !paid) {
      throw new Error(`failed to insert paid course: ${paidError?.message}`);
    }
    paidCourseId = paid.id;

    // Start a real Next.js dev server so the test hits the actual Route
    // Handler over HTTP, exactly as the acceptance criteria describe.
    devServer = spawn(
      "npx",
      ["next", "dev", "--port", String(DEV_SERVER_PORT)],
      {
        cwd: process.cwd(),
        env: process.env,
        shell: true,
        stdio: "ignore",
      },
    );
    await waitForServer(DEV_SERVER_URL, DEV_SERVER_STARTUP_TIMEOUT_MS);
  }, DEV_SERVER_STARTUP_TIMEOUT_MS + 10_000);

  afterAll(async () => {
    // `spawn(..., { shell: true })` on Windows launches `next dev` as a
    // child of the shell process; `devServer.kill()` only signals that
    // shell and leaves the actual `next-server` process (and its ~600MB+
    // footprint) running. Kill the whole process tree explicitly there.
    if (devServer?.pid) {
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /pid ${devServer.pid} /t /f`, { stdio: "ignore" });
        } catch {
          // already exited, or one of the child processes in the tree beat
          // us to it — either way, nothing left to clean up.
        }
      } else {
        devServer.kill();
      }
    }
    if (!admin) return;
    await admin
      .from("courses")
      .delete()
      .in("id", [freeCourseId, paidCourseId].filter(Boolean));
    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  async function callEnroll(slug: string) {
    const res = await fetch(`${DEV_SERVER_URL}/api/courses/${slug}/enroll`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json().catch(() => ({}));
    return { res, json };
  }

  async function countEnrollments(courseId: string) {
    const { count } = await admin
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId)
      .eq("user_id", userId);
    return count ?? 0;
  }

  // AC: "Dado un curso gratis y confirmed=true, cuando llamo a POST
  // /api/courses/[slug]/enroll, entonces se crea la fila en enrollments."
  it("crea la fila en enrollments para un curso gratis", async () => {
    const { res, json } = await callEnroll(freeSlug);

    expect(res.status).toBe(201);
    expect(json.enrollment?.id).toBeTruthy();
    expect(await countEnrollments(freeCourseId)).toBe(1);
  });

  // AC: "Dado un curso de pago y confirmed=true, cuando llamo al mismo
  // endpoint, entonces NO se crea ninguna fila y la respuesta trae un
  // checkoutUrl simulado."
  it("no crea ninguna fila para un curso de pago y devuelve checkoutUrl", async () => {
    const { res, json } = await callEnroll(paidSlug);

    expect(res.status).toBe(200);
    expect(json.checkout?.checkoutUrl).toEqual(expect.stringContaining("/checkout/simulated/"));
    expect(json.enrollment).toBeUndefined();
    expect(await countEnrollments(paidCourseId)).toBe(0);
  });

  // AC: "Dado un curso ya inscrito, cuando reintento, entonces no se
  // duplica la fila."
  it("no duplica la fila al reintentar la inscripción a un curso ya inscrito", async () => {
    // First call — should already be enrolled from the earlier test, but
    // don't depend on ordering: call once to guarantee enrollment, then
    // once more to prove the retry doesn't duplicate.
    await callEnroll(freeSlug);
    const { res, json } = await callEnroll(freeSlug);

    expect(res.status).toBe(200);
    expect(json.enrollment?.id ?? json.enrolled).toBeTruthy();
    expect(await countEnrollments(freeCourseId)).toBe(1);
  });
});
