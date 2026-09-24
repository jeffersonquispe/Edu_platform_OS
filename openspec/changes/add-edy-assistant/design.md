## Context

Edy is developed and deployed as a separate microservice with its own repo (`.claude/skills/edy-edu-platform-os.md` there is its domain source of truth). This app only implements the *client side* of an integration contract that Edy's team defines; the contract itself was handed to this app as a fixed document (see proposal.md - Why). This design records how that external contract was translated into this codebase's conventions.

Existing conventions this design follows: the Supabase client boundary (`lib/supabase/{browser,server,admin}.ts`) already establishes the pattern of "a privileged/trusted-network capability lives behind a server-only accessor, never reaches the client directly" — `edyServiceUrl()` and `liveKitConfig()` in `lib/env.ts` extend that same pattern to a non-Supabase external service.

## Goals / Non-Goals

**Goals:**
- Never let the browser learn `EDY_SERVICE_URL` or LiveKit API secrets.
- Match Edy's actual contract exactly (request/response shapes, statelessness, no HTTP for voice) rather than a convenient reinterpretation of it.
- Keep the widget usable the moment `EDY_SERVICE_URL`/`LIVEKIT_*` are set and Edy is reachable — no additional coordination needed on this app's side.

**Non-Goals:**
- Authenticating requests to Edy's `/chat` endpoint. Edy's contract states it has no auth (internal-network assumption); adding auth on this side alone would not change that, and is explicitly called out as a risk this change does not solve (see Risks).
- Persisting chat history server-side. Edy is stateless per call by contract; the widget's in-memory history is lost on page reload by design, matching Edy's own statelessness rather than working around it.
- Operating or deploying the Edy microservice or its voice worker. Out of this repo's scope entirely.

## Decisions

**Text goes through a server-side proxy (`/api/edy/chat`), not a direct browser→Edy call.**
Edy's contract explicitly has no CORS story and no auth, and assumes an internal/trusted network. A Route Handler is the only place in this app allowed to hold `EDY_SERVICE_URL`, matching how `admin.ts` is the only place allowed to hold the Supabase service-role key.
Alternative considered: expose `EDY_SERVICE_URL` as `NEXT_PUBLIC_*` and call Edy directly from the browser. Rejected outright — Edy's own integration doc flags this as unsafe without auth, and it would leak Edy's internal network location to every visitor.

**Voice never touches this app's server for the actual media/HTTP — only for the token.**
Per Edy's contract, its voice worker auto-joins any LiveKit room it sees a participant enter; there is no endpoint on Edy to call to "start" a voice session. This app's only responsibility is minting a valid `AccessToken`. `app/api/edy/voice-token/route.ts` does exactly that and nothing else — it does not proxy audio, does not know if Edy's worker is even running, and cannot know whether the call "succeeded" beyond the LiveKit room itself connecting.
Alternative considered: build a richer voice-session Route Handler that also pings Edy's worker or waits for it to join before returning the token. Rejected — no such endpoint exists on Edy per the contract, and inventing one would require a change on Edy's side that hasn't happened.

**One fresh LiveKit room per call (`edy-<uuid>`), not a stable per-user room.**
Avoids two browser tabs (or two visits) from the same user colliding in the same room, and avoids a stale/abandoned room being rejoined later with an old worker session still attached. The `voice-token` route mints a new UUID room every time it's called, regardless of whether the same user already has (or had) an active call.
Alternative considered: `edy-${session-id}` deterministic per session. Rejected — session IDs are not something this app currently tracks per-tab, and a deterministic name reintroduces the multi-tab collision risk for no benefit.

**`LIVEKIT_URL` is not duplicated as a `NEXT_PUBLIC_*` variable.**
The browser needs the `wss://` URL to open the LiveKit connection, and it isn't a secret, but instead of adding a second env var (`NEXT_PUBLIC_LIVEKIT_URL`) that must be kept in sync with the server-only `LIVEKIT_URL`, the token endpoint's JSON response carries `url` alongside `token`. Single source of truth, one fewer env var to misconfigure.
Alternative considered: a `NEXT_PUBLIC_LIVEKIT_URL` var. Rejected as an unnecessary duplication risk for a value the server already has to read anyway to mint tokens.

**The voice call view replaces the text panel rather than running alongside it.**
Matches the interaction the widget was designed around (see the original mock this change implements): toggling "Llamada" swaps the whole panel to the call UI (orb, audio-reactive bars, mute/hangup) and back, rather than showing both simultaneously. Chat history is preserved in state while a call is active and reappears when the call ends.
Alternative considered: run text and voice concurrently in a split view. Rejected as unnecessary complexity for this iteration and a departure from the agreed widget design; nothing in Edy's contract requires text and voice to be usable at the same time.

**The client (`useEdyVoiceCall`) treats a non-`idle` LiveKit connection state as "call active," independent of whether Edy's worker has actually joined.**
This app has no way to observe Edy's worker joining beyond the room's participant list, and the contract doesn't promise a specific join latency. The UI shows "Conectando…" while the LiveKit room handshake is in flight and "En llamada" once connected, without asserting Edy itself is present yet.
Alternative considered: wait for a second remote participant (Edy's worker) before showing "active." Rejected — adds a dependency on Edy's join timing to this app's UI state, and if the worker is down entirely the user would see an indefinite "connecting" state instead of a normal-looking call they can hang up.

## Risks / Trade-offs

- **[No auth on Edy's /chat]** Anyone able to reach `EDY_SERVICE_URL` from this app's server can call `/chat` — the proxy adds no authorization of its own beyond "you can reach this app's Route Handler." → Accepted per Edy's contract (internal-network assumption); if `EDY_SERVICE_URL` is ever a publicly reachable host, this must be revisited on Edy's side first, since the proxy has nothing to add auth *to*.
- **[Silent no-op if Edy's voice worker isn't running]** A user can toggle "Llamada," successfully join the LiveKit room, and just hear nothing, with no signal from this app that the worker never joined. → Accepted for this iteration (see Decisions); a follow-up could surface a "no one joined" state after a timeout, not included here.
- **[Edy round-trip latency on tool-use turns]** Text replies that trigger Edy's `search_courses` tool were observed taking ~9-11s end to end (Edy's own 6s catalog-lookup budget plus its LLM turn). The proxy's own timeout is set to 20s to clear this with margin rather than race it, but the widget's perceived wait on a slow network could still approach that ceiling. → Accepted; no further mitigation in this change beyond the typing-indicator already shown while `sending`.
- **[Two systems must agree on LiveKit credentials out-of-band]** `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` must be the exact same values Edy's voice worker uses, coordinated outside this repo (no shared config source). → Accepted per the contract; documented in `.env.local.example` and proposal.md - Impact.

## Migration Plan

1. Set `EDY_SERVICE_URL`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` in each environment's `.env.local` (or hosting platform's env config) before deploying this change — the widget renders regardless, but both channels fail closed (chat: 502 from `/api/edy/chat`; voice: the token route throws) without them.
2. No database migration and no change to `GET /api/courses/search` — Edy calls that existing endpoint as-is.
3. Rollback: removing `<EdyAssistant />` from `app/layout.tsx` (or deleting `components/EdyAssistant/` and the two `app/api/edy/*` routes) fully removes the surface; nothing else in the app depends on it.
