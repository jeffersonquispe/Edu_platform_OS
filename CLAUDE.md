# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Course Platform — an online course platform built with Next.js 15 (App Router), React 19, TypeScript, and Supabase (Postgres + Auth). Instructors create courses with modules/lessons and multimedia content; students enroll, consume content, and leave reviews. UI copy and docs are in Spanish.

## Commands

```bash
npm run dev      # dev server with hot reload (localhost:3000)
npm run build    # production build
npm start        # serve production build
npm run lint     # ESLint (eslint-config-next)
npm run test     # Vitest unit tests (pure functions only, no network/DB)
```

`npm run test` runs both levels together: pure, network-free unit tests (e.g. `lib/catalogFilter.ts`, `lib/enrollDecision.ts`) and real-Supabase integration tests (`lib/queries/*.integration.test.ts`, `describe.runIf`-guarded on `.env.local` credentials being present, seeding/cleaning up via the admin client). Some integration coverage instead lives as SQL assertions run directly against Postgres (`supabase/migrations/0003_policy_tests.sql`, `0006_catalog_filter_policy_tests.sql`), outside the Vitest suite — used when the guarantee under test is an RLS policy itself, not application code.

### Database

Migrations live in `supabase/migrations/` and are applied in order (`0001_init.sql`, `0002_rls.sql`, `0003_policy_tests.sql`) either via the Supabase SQL Editor or `supabase db push`. When changing schema, add a new numbered migration rather than editing an applied one, and update `lib/database.types.ts` to match.

Required env vars (see `.env.local.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and optionally `SUPABASE_SERVICE_ROLE_KEY` (server-only, bypasses RLS — never expose to the client).

## Architecture

### Supabase client boundary

Three distinct Supabase clients exist in `lib/supabase/`, each with a specific trust level — always pick the right one:

- `browser.ts` — Client Components, subject to RLS via the signed-in user's session.
- `server.ts` — Server Components / Server Actions / Route Handlers; reads/writes the auth cookie via `next/headers`, subject to RLS.
- `admin.ts` — service-role client that **bypasses RLS**. Route Handlers only, for privileged operations; any authorization check it skips must be re-implemented explicitly in code. Never import into a Client Component.
- `middleware.ts` — `updateSession` used by the root `middleware.ts` to refresh the Supabase session cookie on every request (matcher excludes `_next/static`, `_next/image`, favicon, and static image assets).

Env access is centralized in `lib/env.ts` (`env.supabaseUrl`, `env.supabaseAnonKey`, `serviceRoleKey()`) — import from there instead of reading `process.env` directly; it fails loudly at point-of-use rather than at module load, so `next build` still works without credentials present.

### Data model & RLS

Core tables/views (defined across the three migrations): `profiles` (1:1 with `auth.users`, auto-created on signup), `courses` (title, slug, description, cover, price, draft/published state), `modules` and `lessons` (ordered, hierarchical: course → module → lesson), `lesson_contents` (Markdown + YouTube, gated by enrollment), `enrollments` (unique per user/course), `reviews` (1–5 rating + text, unique per user/course), and `course_ratings` (aggregated view: average + count per course).

All tables have Row Level Security enabled — course ownership gates create/edit, published courses are publicly readable, lesson content requires ownership or enrollment, and enrollments/reviews are self-managed. Authorization logic lives at the database layer; when adding privileged server-side operations via `admin.ts`, replicate the equivalent check in application code.

### App structure

- `app/` — App Router routes: public catalog (`app/page.tsx`), course detail (`app/courses/[slug]/`) and lesson pages (`app/courses/[slug]/lessons/[lessonId]/`), auth (`login/`, `register/`), and the dashboard split into `dashboard/profile/`, `dashboard/learning/` (student view, includes gamification widgets), and `dashboard/teaching/` (instructor view: course list, new course, per-course editor at `[slug]/`). `app/api/` holds Route Handlers (e.g. `courses`, `courses/[courseId]/enroll` — despite the folder name, this resolves its param as a course **slug**; Next.js requires sibling routes at this depth to share one dynamic-segment name, so it stayed `[courseId]` when the handler was extended to decide free-enroll vs. simulated-checkout by price, see `lib/enrollDecision.ts`).
- `components/` — shared React components (editors: `CourseEditor`, `ModuleEditor`, `LessonEditor`; reviews: `ReviewForm`, `ReviewList`, `RatingBadge`; `EnrollButton`, `ProfileForm`, `SiteHeader`, `SignOutButton`, `ThemeToggle`). Two feature subfolders: `components/VideoPlayer/` (video playback with timestamped notes and quiz overlay, plus a `useVideoPlayer` hook) and `components/Gamification/` (XP/streak UI: `XPBurst`, `StreakProtectionModal`).
- `lib/` — `database.types.ts` (generated Supabase schema types), `slug.ts`, `youtube.ts` helpers, plus `env.ts` and `supabase/` described above.

### Spec-driven development (OpenSpec)

This repo uses OpenSpec (`openspec/`) for spec-driven change management, with matching Claude skills/commands under `.claude/skills/opsx-*` and `.claude/commands/opsx/`. Current capability specs live in `openspec/specs/<capability>/spec.md` (`user-accounts`, `course-authoring`, `course-catalog`, `enrollment`, `course-reviews`, `edtech-ui-ux`); completed change proposals are archived under `openspec/changes/archive/`. For non-trivial feature work, prefer proposing a change (spec delta + design + tasks) before implementing, per the opsx workflow skills.

### Path aliases

`@/*` resolves to the project root (see `tsconfig.json`), e.g. `@/lib/env`, `@/lib/database.types`.
