# Changelog

Todas las fechas usan formato AAAA-MM-DD.

## [Unreleased]

### Añadido
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
