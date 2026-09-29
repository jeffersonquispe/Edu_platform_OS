import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  // Integration tests (getPublishedCourses.integration.test.ts) need real
  // Supabase credentials. Vite only loads `.env*` files into import.meta.env
  // by default, but this repo reads `process.env` directly (see lib/env.ts)
  // — so mirror the loaded vars onto process.env for the test run only.
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    test: {
      environment: "node",
      include: ["**/*.test.ts", "**/*.test.tsx"],
      exclude: ["node_modules", ".next"],
      // enrollCourse.integration.test.ts spawns a real `next dev` server and
      // waits for it to become ready before running — well past Vitest's
      // 5s default for slower machines/first compiles.
      testTimeout: 90_000,
      hookTimeout: 90_000,
    },
  };
});
