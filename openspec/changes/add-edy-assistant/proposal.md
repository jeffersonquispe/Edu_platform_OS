## Why

Students browsing the catalog or a lesson have no way to ask a question in context — they either search the catalog themselves or leave the platform. Edy is a separate conversational-assistant microservice (own repo, own `SYSTEM_PROMPT` and tools) that already knows how to answer catalog questions and guide students, over both text and voice. Integrating it as a floating widget gives every page a tutor without duplicating that logic inside this app.

## What Changes

- Add a floating `EdyAssistant` widget, mounted globally in the root layout, with a text chat mode and a voice call mode toggled from the same panel.
- **Text channel**: the browser never calls Edy directly. `POST /api/edy/chat` proxies to Edy's `POST {EDY_SERVICE_URL}/chat` server-side, since Edy has no auth of its own and assumes an internal/trusted network. Edy keeps no conversation history — each call is a fresh turn; multi-turn context exists only in the widget's client state.
- **Voice channel**: no HTTP call to Edy at all. `POST /api/edy/voice-token` issues a signed LiveKit `AccessToken` (one fresh room per call) using shared `LIVEKIT_*` credentials; the browser joins that room directly with `livekit-client`. Edy's own voice worker (external process, not part of this app) auto-joins any room it sees a participant enter.
- Edy depends on this app for catalog data: it calls back into `GET /api/courses/search?q=` (already shipped by the `course-search` capability) to answer questions about courses. This change does not modify that endpoint — it documents the dependency.
- New server-only env vars: `EDY_SERVICE_URL`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.

## Capabilities

### New Capabilities
- `edy-assistant`: conversational tutor widget (text + voice) backed by the external Edy microservice.

### Modified Capabilities
(none — this change adds a new UI surface and two new Route Handlers; it does not alter `course-catalog`, `course-search`, or any existing capability's behavior. Edy *consumes* `course-search`'s public endpoint but that endpoint's contract is unchanged.)

## Impact

- **App code**: new `components/EdyAssistant/` (`EdyAssistant.tsx`, `useEdyVoiceCall.ts`, `edy-assistant.css`), new `app/api/edy/chat/route.ts` and `app/api/edy/voice-token/route.ts`, `lib/env.ts` gains `edyServiceUrl()` and `liveKitConfig()`. `app/layout.tsx` mounts `<EdyAssistant />` alongside `<SiteHeader />`.
- **Dependencies**: adds `livekit-client` and `livekit-server-sdk`.
- **Environment**: `.env.local.example` documents `EDY_SERVICE_URL`; `LIVEKIT_URL`/`LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` are shared with Edy's own voice worker and must be coordinated with whoever operates Edy.
- **External dependency**: this change is inert without the Edy microservice (text) and its voice worker (voice) actually running and reachable at `EDY_SERVICE_URL` / joining the shared LiveKit project. Neither is part of this repo.
- **Security**: Edy's `/chat` endpoint has no authentication (internal-network contract) — this app is the only thing allowed to hold `EDY_SERVICE_URL`; the browser only ever talks to this app's own Route Handlers.
