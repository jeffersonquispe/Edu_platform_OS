## 1. Environment & config

- [x] 1.1 Add `edyServiceUrl()` to `lib/env.ts` (server-only, `EDY_SERVICE_URL`)
- [x] 1.2 Add `liveKitConfig()` to `lib/env.ts` (server-only, `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`)
- [x] 1.3 Document `EDY_SERVICE_URL` in `.env.local.example`
- [ ] 1.4 Confirm `LIVEKIT_URL`/`LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` values match exactly what Edy's own voice worker uses (coordinated outside this repo) in each deployed environment

## 2. Text channel

- [x] 2.1 Implement `app/api/edy/chat/route.ts`: validate request body, POST to `{EDY_SERVICE_URL}/chat`, map Edy's `{reply}` through, return a structured error on non-2xx or timeout
- [x] 2.2 Set proxy timeout wide enough to clear Edy's observed tool-use latency (20s, see design.md - Risks) rather than racing it
- [x] 2.3 Widget-side: send message, append to in-memory history, show a typing indicator while awaiting the reply, surface proxy errors inline

## 3. Voice channel

- [x] 3.1 Implement `app/api/edy/voice-token/route.ts`: mint a fresh LiveKit `AccessToken` per call (`roomJoin`, `canPublish`, `canSubscribe`), identity from the authenticated user or a generated guest id
- [x] 3.2 Add `livekit-client`/`livekit-server-sdk` dependencies
- [x] 3.3 Implement `useEdyVoiceCall` hook: fetch token, connect to the room, enable the microphone, attach the remote (Edy) audio track, track `ActiveSpeakersChanged` for UI feedback, expose `start`/`stop`/`toggleMute`
- [x] 3.4 Disconnect and release the microphone on hangup and on widget unmount

## 4. Widget UI

- [x] 4.1 Floating launcher + panel (`components/EdyAssistant/EdyAssistant.tsx`), welcome state with suggested questions
- [x] 4.2 "Llamada" toggle that swaps the panel between chat view and call view (orb animation, audio-reactive bars, mute/hangup controls), preserving chat history underneath
- [x] 4.3 Mount `<EdyAssistant />` globally in `app/layout.tsx`
- [x] 4.4 Style with the platform's own design tokens (`app/globals.css`) so the widget matches light/dark theme, rather than the external mock's own palette

## 5. Verification

- [x] 5.1 Type-check and lint the new files clean
- [x] 5.2 Text channel manually verified against a running Edy instance (`POST /chat` round-trip, including a `search_courses`-triggering query)
- [ ] 5.3 Voice channel manually verified end-to-end against Edy's actual voice worker (join room, worker auto-joins, two-way audio, hangup releases the room) — requires the Edy voice worker running, not exercised yet in this session
- [ ] 5.4 Verify behavior when `EDY_SERVICE_URL` or `LIVEKIT_*` env vars are unset in a given environment: widget still renders, each channel fails with a visible error rather than hanging
- [ ] 5.5 Production build (`next build`) run clean in an environment where `.next` isn't locked by a concurrent `next dev` process (blocked by a local Windows file-lock in this session, not by app code — see design.md)

## 6. Follow-ups (explicitly out of scope for this change)

- [ ] 6.1 Timeout/feedback when a voice call connects to the LiveKit room but Edy's worker never joins (see design.md - Risks)
- [ ] 6.2 Authentication on Edy's `/chat` endpoint itself, if `EDY_SERVICE_URL` ever becomes reachable outside a trusted network (must originate on Edy's side per its contract)
