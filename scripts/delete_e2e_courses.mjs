import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class NoopWebSocket {
    close() {}
  };
}

const { createClient } = await import("@supabase/supabase-js");

function loadEnvLocal() {
  const envPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    ".env.local",
  );
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Faltan variables de entorno en .env.local");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("Buscando cursos de prueba E2E...");

  // Select courses matching title or slug with E2E
  const { data: courses, error } = await admin
    .from("courses")
    .select("id, title, slug")
    .or("title.ilike.%e2e%,slug.ilike.%e2e%");

  if (error) {
    console.error("Error al buscar cursos:", error);
    process.exit(1);
  }

  if (!courses || courses.length === 0) {
    console.log("No se encontraron cursos de prueba E2E.");
    return;
  }

  console.log(`Se encontraron ${courses.length} cursos E2E:`);
  for (const c of courses) {
    console.log(` - [${c.id}] ${c.title} (${c.slug})`);
  }

  const ids = courses.map((c) => c.id);
  const { error: deleteError, count } = await admin
    .from("courses")
    .delete({ count: "exact" })
    .in("id", ids);

  if (deleteError) {
    console.error("Error al eliminar cursos:", deleteError);
    process.exit(1);
  }

  console.log(`\n¡Eliminados con éxito ${ids.length} cursos E2E!`);
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
