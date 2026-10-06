// Crea usuarios de prueba (profesores y estudiantes) vía Supabase Auth admin.
// Idempotente: si el email ya existe, no lo vuelve a crear.
//
// Uso:
//   node scripts/create_test_users.mjs
//
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Password: E2E_TEST_PASSWORD si está definida; si no, "Test1234!".
// Usa el service role: bypassa RLS, solo correr localmente.

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
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
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
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local",
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = process.env.E2E_TEST_PASSWORD || "Test1234!";

const USERS = [
  { email: "profesor.sofia@example.com", display_name: "Sofía Ramírez", role: "profesor" },
  { email: "profesor.diego@example.com", display_name: "Diego Herrera", role: "profesor" },
  { email: "estudiante.lucia@example.com", display_name: "Lucía Paredes", role: "estudiante" },
  { email: "estudiante.pedro@example.com", display_name: "Pedro Salazar", role: "estudiante" },
  { email: "estudiante.valeria@example.com", display_name: "Valeria Núñez", role: "estudiante" },
];

const { data: list, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (listError) throw listError;

for (const { email, display_name, role } of USERS) {
  let id = list.users.find((u) => u.email === email)?.id;
  if (id) {
    console.log(`- Ya existe: ${email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name },
    });
    if (error) throw error;
    id = data.user.id;
    console.log(`- Creado: ${email} (${role})`);
  }
  const { error: profileError } = await admin
    .from("profiles")
    .update({ display_name })
    .eq("id", id);
  if (profileError) throw profileError;
}

console.log("\nListo. Los usuarios usan la password de E2E_TEST_PASSWORD (o Test1234! por defecto).");
