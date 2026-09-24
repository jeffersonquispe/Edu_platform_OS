# Changelog

Todas las fechas usan formato AAAA-MM-DD.

## [Unreleased]

### Añadido
- Asistente conversacional **Edy** integrado como widget flotante disponible en toda la plataforma (`components/EdyAssistant/`), con modo texto y modo llamada de voz conmutables desde el mismo panel. Ver especificación en `openspec/changes/add-edy-assistant/`.
  - Canal de texto: `app/api/edy/chat/route.ts` actúa como proxy server-side hacia el microservicio Edy (`POST {EDY_SERVICE_URL}/chat`); el navegador nunca llama a Edy directamente, ya que su endpoint no tiene autenticación propia (contrato de red interna).
  - Canal de voz: `app/api/edy/voice-token/route.ts` emite tokens de acceso de LiveKit (`livekit-server-sdk`); el navegador se conecta directo a la room vía `livekit-client` (`components/EdyAssistant/useEdyVoiceCall.ts`) — sin HTTP hacia Edy para voz, el worker de voz de Edy se auto-asigna a la room.
  - Nuevas variables de entorno server-only: `EDY_SERVICE_URL`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (documentadas en `.env.local.example`).
  - Edy consume el endpoint existente `GET /api/courses/search` (capacidad `course-search`) para responder preguntas sobre el catálogo; ese endpoint no fue modificado.
- Embed standalone del "Piano de Cola Negro" en `public/embeds/piano-hero.html` para usarse como recurso incrustable (iframe) en el catálogo de cursos.
- Archivo fuente `Piano de Cola Negro (Standalone)(1).html` en la raíz del proyecto.

## [2026-09-14] - Commit inicial

### Añadido
- Estructura base del proyecto Next.js (App Router): rutas de `login`, `register`, `dashboard` (perfil, aprendizaje, enseñanza), catálogo de `courses` y sus páginas dinámicas (`[slug]`).
- Integración con Supabase: clientes browser/server/admin, middleware de sesión y migraciones iniciales (`0001_init.sql`, `0002_rls.sql`, `0003_policy_tests.sql`).
- Componentes principales: `CourseEditor`, `ModuleEditor`, `LessonEditor`, `EnrollButton`, `ReviewForm`/`ReviewList`, `RatingBadge`, `SiteHeader`, `ThemeToggle`, `ProfileForm`, `SignOutButton`.
- Reproductor de video con notas con marca de tiempo y overlay de quiz (`components/VideoPlayer`).
- Componentes de gamificación: `XPBurst` y `StreakProtectionModal`.
- Especificaciones OpenSpec para catálogo de cursos, autoría de cursos, reseñas, inscripciones, cuentas de usuario y UI/UX de EdTech.
