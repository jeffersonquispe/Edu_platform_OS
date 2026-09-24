/**
 * Centralised environment access. Import from here instead of reading
 * process.env directly so a missing public variable fails fast and loudly
 * at the point of use (not at module load, so `next build` can run without
 * credentials).
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.local.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
  },
  get supabaseAnonKey() {
    return required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
};

/** Server-only. Optional in the MVP — only Route Handlers that bypass RLS need it. */
export function serviceRoleKey(): string {
  return required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/**
 * Server-only. Base URL of the Edy assistant microservice (e.g.
 * http://localhost:8000). Edy has no auth of its own — never expose this
 * URL to the client; always call it from a Route Handler. See
 * app/api/edy/chat/route.ts.
 */
export function edyServiceUrl(): string {
  return required("EDY_SERVICE_URL", process.env.EDY_SERVICE_URL);
}

/**
 * LiveKit project config, shared with Edy's voice worker (see the Edy
 * integration doc, section 04). Server-only: the API key/secret sign
 * access tokens and must never reach the client. LIVEKIT_URL itself is not
 * a secret — the browser needs it to open the wss:// connection — but it
 * is handed to the client via the token endpoint's JSON response instead
 * of a NEXT_PUBLIC_ var, so there is a single source of truth.
 */
export function liveKitConfig(): {
  url: string;
  apiKey: string;
  apiSecret: string;
} {
  return {
    url: required("LIVEKIT_URL", process.env.LIVEKIT_URL),
    apiKey: required("LIVEKIT_API_KEY", process.env.LIVEKIT_API_KEY),
    apiSecret: required("LIVEKIT_API_SECRET", process.env.LIVEKIT_API_SECRET),
  };
}
