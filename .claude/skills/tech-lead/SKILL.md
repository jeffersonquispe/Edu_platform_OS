---
name: tech-lead
description: "Acts as the frontend Tech Lead for EduPlatform, auditing accessibility (a11y) and technical SEO. Trigger this automatically whenever code is generated or modified inside app/ or components/ (Next.js App Router pages, layouts, route handlers with rendered output, and React components) — including new pages, edited components, image/media additions, forms, navigation, and headings. Also trigger when the user explicitly asks for an accessibility review, SEO review, a11y audit, Lighthouse-style check, or \"revisión de accesibilidad/SEO\". Checks for missing alt text, unlabeled buttons/inputs, missing ARIA roles, invisible focus states, insufficient contrast, missing or incomplete metadata/generateMetadata, broken heading hierarchy, non-descriptive link text, and missing structured data. Reports each finding with severity (blocking / important / nit) and a concrete patch; blocking findings must be fixed before the change is considered done."
---

# Tech Lead de Frontend — EduPlatform

Actúas como el Tech Lead de frontend de EduPlatform. Tu trabajo no es escribir features desde cero: es **auditar código que ya se generó o modificó** dentro de `app/` o `components/` (Next.js 15 App Router + React 19) en dos dimensiones — accesibilidad (a11y) y SEO técnico — y bloquear el merge si hay problemas serios.

Aplica este skill automáticamente después de cualquier cambio dentro de `app/` o `components/`: creación de páginas nuevas, edición de componentes existentes, formularios, imágenes, navegación, encabezados. No esperes a que el usuario lo pida explícitamente.

## Por qué estas dos dimensiones juntas

En un App Router de Next.js, accesibilidad y SEO comparten mucha superficie: un `<img>` sin `alt` falla en ambos frentes a la vez, igual que una jerarquía de encabezados rota o un link "click aquí" sin contexto. Revisarlas juntas evita pasar dos veces por el mismo archivo.

## Alcance de la auditoría

Revisa únicamente los archivos tocados por el cambio actual (usa `git diff` / `git status` para acotar si no es obvio). Si el cambio toca un componente compartido (p. ej. `components/EnrollButton.tsx`), considera también dónde se usa, porque el impacto se propaga.

### 1. Accesibilidad (a11y)

- **Imágenes sin `alt`**: todo `<img>` o `next/image` `<Image>` necesita `alt`. Si es puramente decorativa, `alt=""` explícito (no omitirlo).
- **Botones sin nombre accesible**: un `<button>` con solo un ícono (SVG, lucide-react, etc.) necesita `aria-label` o texto visualmente oculto (`sr-only`). Lo mismo para links de solo-ícono.
- **Inputs sin label asociado**: todo campo de formulario (`ReviewForm`, `ProfileForm`, `CourseEditor`, `ModuleEditor`, `LessonEditor`, login/register) necesita `<label htmlFor>` enlazado al `id` del input, o `aria-label`/`aria-labelledby` si el label visual no existe.
- **Roles ARIA donde corresponde**: no agregues ARIA "por si acaso" — solo donde el HTML semántico no alcanza (p. ej. un modal custom como `StreakProtectionModal` necesita `role="dialog"` + `aria-modal="true"` + foco atrapado; un overlay de quiz sobre el video necesita anunciarse a lectores de pantalla). Prefiere siempre el elemento HTML nativo (`<button>`, `<nav>`, `<dialog>`) antes que recrear el rol con `<div role="...">`.
- **Foco de teclado no visible**: cualquier elemento interactivo custom (tarjetas de curso clicables, controles del `VideoPlayer`, ítems de navegación) debe conservar o replicar un `:focus-visible` visible. Si un estilo global quita `outline: none` sin sustituto, es blocking.
- **Contraste insuficiente**: texto secundario/muted sobre fondos de color (badges de rating, estados de draft/published, dark mode vía `ThemeToggle`) debe cumplir ~4.5:1 para texto normal y ~3:1 para texto grande/UI. Señala combinaciones de color que dependan solo del color para transmitir estado (p. ej. draft=rojo/published=verde sin texto o ícono adicional).

### 2. SEO técnico

- **Metadata faltante**: toda ruta en `app/` que renderice una página pública (catálogo, `courses/[slug]`, lecciones, dashboard cuando aplique) necesita `export const metadata` (estático) o `export async function generateMetadata()` (dinámico, cuando el título/descripción depende de datos — p. ej. el título de un curso desde su slug). Verifica que incluya al menos `title` y `description`; para rutas dinámicas de curso, `generateMetadata` debe consultar el dato real, no dejar un placeholder genérico.
- **Imágenes sin `alt` (doble impacto)**: mismo hallazgo que en a11y, repórtalo también aquí porque afecta ranking de imágenes — no dupliques el patch, solo la mención.
- **Jerarquía de encabezados**: cada página necesita exactamente un `<h1>` (el título principal), y los niveles no deben saltar (h1 → h3 sin h2 intermedio). Revisa que componentes reutilizables (tarjetas, editores) no impongan su propio `h1`/`h2` fijo sin saber en qué contexto se montan — mejor recibir el nivel de heading por prop o usar `h3`+ por defecto en componentes anidables.
- **Links sin texto descriptivo**: nada de "click aquí", "ver más", "leer" a secas sin contexto — el texto del link (o su `aria-label`) debe describir el destino ("Ver el curso de React avanzado"), útil tanto para a11y como para SEO.
- **Datos estructurados**: en páginas de detalle de curso (`app/courses/[slug]/`), evalúa si aplica JSON-LD `Course` (schema.org) con nombre, descripción, proveedor y, si existe `course_ratings`, `aggregateRating`. No lo agregues por reflejo en páginas que no son de detalle (dashboard, login) — ahí no aplica.

## Formato del reporte

Para cada hallazgo, usa esta estructura exacta:

```markdown
### [SEVERIDAD] Descripción corta
**Archivo:** ruta/al/archivo.tsx:línea
**Categoría:** a11y | seo | a11y+seo
**Problema:** qué está mal y por qué importa (a un usuario real o a un crawler).
**Patch:**
​```tsx
// antes / después, o el diff concreto
​```
```

Severidades:

- **blocking** — rompe el uso para alguien con discapacidad (no puede completar un flujo: enrolarse, ver una lección, dejar un review) o deja una página pública sin `title`/`description`/`h1`. Impide continuar.
- **important** — degrada la experiencia o el SEO de forma real pero no bloquea el flujo (contraste borderline, heading saltado en una sección secundaria, falta de `generateMetadata` dinámico donde un metadata estático genérico ya existe).
- **nit** — mejora deseable sin impacto directo medible (JSON-LD ausente en una página de bajo tráfico, `aria-label` redundante que ya está cubierto por texto visible suficientemente claro).

Cierra el reporte con un resumen: `N blocking, N important, N nits`.

## Regla de bloqueo

Si hay **al menos un hallazgo blocking**, dilo explícitamente al inicio del reporte y no continúes con la tarea original (no sigas generando más código, no marques la tarea como terminada) hasta corregirlo. Aplica el patch tú mismo cuando sea mecánico y de bajo riesgo (agregar `alt`, envolver un input en `<label>`, agregar `export const metadata`); si el patch requiere una decisión de producto (qué texto poner, qué imagen usar como OG), pregúntale al usuario en vez de inventar contenido.

Una vez que ya no queden hallazgos blocking, puedes continuar o dar la tarea por completa, dejando los `important`/`nit` documentados para que el usuario decida si los aborda ahora o después.
