// Seed de datos: crea usuarios (Auth) y cursos de ejemplo con módulos,
// lecciones, contenido, inscripciones y reseñas.
//
// Uso:
//   node scripts/seed.mjs
//
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Usa el service role: bypassa RLS, solo correr localmente / en CI de confianza.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Node 20 has no global WebSocket; @supabase/supabase-js instantiates a
// realtime client at construction time even though this script never uses
// it. A no-op stub avoids requiring the `ws` package just for a seed script.
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
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local",
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_PASSWORD = "Seed1234!";

const USERS = [
  { email: "instructor.ana@example.com", display_name: "Ana Torres", role: "instructor" },
  { email: "instructor.luis@example.com", display_name: "Luis Fernández", role: "instructor" },
  { email: "estudiante.maria@example.com", display_name: "María Gómez", role: "student" },
  { email: "estudiante.carlos@example.com", display_name: "Carlos Ruiz", role: "student" },
];

const COURSES = [
  {
    ownerEmail: "instructor.ana@example.com",
    title: "Introducción a JavaScript",
    description: "Fundamentos de JavaScript moderno: variables, funciones, arrays y objetos.",
    status: "published",
    price: 0,
    cover_url: "/images/courses/javascript.jpg",
    modules: [
      {
        title: "Primeros pasos",
        lessons: [
          { title: "¿Qué es JavaScript?", body_md: "JavaScript es un lenguaje de programación...", youtube_url: null },
          { title: "Variables y tipos de datos", body_md: "En JavaScript existen let, const y var...", youtube_url: null },
        ],
      },
      {
        title: "Funciones y control de flujo",
        lessons: [
          { title: "Funciones", body_md: "Las funciones permiten reutilizar código...", youtube_url: null },
          { title: "Condicionales y bucles", body_md: "if, else, for y while...", youtube_url: null },
        ],
      },
    ],
  },
  {
    ownerEmail: "instructor.ana@example.com",
    title: "React desde Cero",
    description: "Aprende a construir interfaces con React 19 y componentes funcionales.",
    status: "published",
    price: 29.99,
    cover_url: "/images/courses/react.jpg",
    modules: [
      {
        title: "Componentes",
        lessons: [
          { title: "Tu primer componente", body_md: "Un componente de React es una función...", youtube_url: null },
          { title: "Props y estado", body_md: "Props permiten pasar datos, useState maneja estado...", youtube_url: null },
        ],
      },
    ],
  },
  {
    ownerEmail: "instructor.luis@example.com",
    title: "Bases de Datos con PostgreSQL",
    description: "Modelado relacional, SQL y buenas prácticas con PostgreSQL.",
    status: "draft",
    price: 19.99,
    cover_url: "/images/courses/postgres.jpg",
    modules: [
      {
        title: "Fundamentos de SQL",
        lessons: [
          { title: "SELECT, INSERT, UPDATE, DELETE", body_md: "Las cuatro operaciones básicas de SQL...", youtube_url: null },
        ],
      },
    ],
  },
  {
    ownerEmail: "instructor.luis@example.com",
    title: "Node.js y APIs REST",
    description: "Construye APIs REST con Node.js, Express y buenas prácticas de diseño.",
    status: "published",
    price: 24.99,
    cover_url: "/images/courses/nodejs.jpg",
    modules: [
      {
        title: "Fundamentos de Node.js",
        lessons: [
          { title: "El runtime de Node.js", body_md: "Node.js ejecuta JavaScript fuera del navegador...", youtube_url: null },
          { title: "Módulos y npm", body_md: "CommonJS, ES Modules y el ecosistema npm...", youtube_url: null },
        ],
      },
      {
        title: "Construyendo la API",
        lessons: [
          { title: "Rutas y controladores con Express", body_md: "Express simplifica el enrutamiento HTTP...", youtube_url: null },
        ],
      },
    ],
  },
  {
    ownerEmail: "instructor.ana@example.com",
    title: "TypeScript para Desarrolladores JS",
    description: "Tipado estático, interfaces, genéricos y migración de proyectos JavaScript a TypeScript.",
    status: "published",
    price: 15.99,
    cover_url: "/images/courses/typescript.jpg",
    modules: [
      {
        title: "Tipos básicos",
        lessons: [
          { title: "¿Por qué TypeScript?", body_md: "TypeScript añade tipado estático opcional a JavaScript...", youtube_url: null },
          { title: "Interfaces y tipos", body_md: "interface y type permiten describir formas de datos...", youtube_url: null },
        ],
      },
    ],
  },
  {
    ownerEmail: "instructor.luis@example.com",
    title: "Diseño UX/UI para Desarrolladores",
    description: "Principios de diseño de interfaces, accesibilidad y flujos de usuario para equipos técnicos.",
    status: "draft",
    price: 0,
    cover_url: "/images/courses/uxui.jpg",
    modules: [
      {
        title: "Principios de diseño",
        lessons: [
          { title: "Jerarquía visual y espaciado", body_md: "La jerarquía visual guía la atención del usuario...", youtube_url: null },
        ],
      },
    ],
  },
  {
    ownerEmail: "instructor.ana@example.com",
    title: "Python para Análisis de Datos",
    description: "Manipulación de datos con pandas, NumPy y visualización con Matplotlib.",
    status: "published",
    price: 22.99,
    cover_url: "/images/courses/python.jpg",
    modules: [
      {
        title: "Fundamentos de Python",
        lessons: [
          { title: "Sintaxis básica de Python", body_md: "Variables, tipos de datos y estructuras de control...", youtube_url: null },
          { title: "Listas, tuplas y diccionarios", body_md: "Las estructuras de datos nativas de Python...", youtube_url: null },
        ],
      },
      {
        title: "Análisis con pandas",
        lessons: [
          { title: "DataFrames y Series", body_md: "pandas ofrece estructuras tabulares para analizar datos...", youtube_url: null },
        ],
      },
    ],
  },
  {
    ownerEmail: "instructor.luis@example.com",
    title: "Docker y Contenedores",
    description: "Empaqueta y despliega aplicaciones con Docker: imágenes, volúmenes y redes.",
    status: "published",
    price: 18.99,
    cover_url: "/images/courses/docker.jpg",
    modules: [
      {
        title: "Introducción a Docker",
        lessons: [
          { title: "¿Qué es un contenedor?", body_md: "Los contenedores empaquetan una aplicación con sus dependencias...", youtube_url: null },
          { title: "Dockerfile y build de imágenes", body_md: "Un Dockerfile describe cómo construir una imagen...", youtube_url: null },
        ],
      },
    ],
  },
  {
    ownerEmail: "instructor.ana@example.com",
    title: "Testing en JavaScript",
    description: "Pruebas unitarias y de integración con Jest y Testing Library.",
    status: "draft",
    price: 12.99,
    cover_url: "/images/courses/testing.jpg",
    modules: [
      {
        title: "Fundamentos de testing",
        lessons: [
          { title: "¿Por qué escribir tests?", body_md: "Los tests automatizados previenen regresiones...", youtube_url: null },
        ],
      },
    ],
  },
  {
    ownerEmail: "instructor.luis@example.com",
    title: "Git y Control de Versiones",
    description: "Flujos de trabajo con Git: ramas, merges, rebase y colaboración en equipo.",
    status: "published",
    price: 0,
    cover_url: "/images/courses/git.jpg",
    modules: [
      {
        title: "Fundamentos de Git",
        lessons: [
          { title: "Commits, ramas y merges", body_md: "Git registra el historial de cambios mediante commits...", youtube_url: null },
          { title: "Resolviendo conflictos", body_md: "Los conflictos surgen cuando dos ramas modifican lo mismo...", youtube_url: null },
        ],
      },
    ],
  },
  {
    ownerEmail: "instructor.luis@example.com",
    title: "Machine Learning",
    description: "Introducción al aprendizaje automático: regresión, clasificación, y modelos con scikit-learn.",
    status: "published",
    price: 29.99,
    cover_url: "/images/courses/machine-learning.jpg",
    modules: [
      {
        title: "Fundamentos de Machine Learning",
        lessons: [
          { title: "¿Qué es el Machine Learning?", body_md: "El aprendizaje automático permite a los sistemas aprender patrones a partir de datos sin ser programados explícitamente...", youtube_url: null },
          { title: "Tipos de aprendizaje: supervisado, no supervisado y por refuerzo", body_md: "El aprendizaje supervisado usa datos etiquetados, el no supervisado busca patrones sin etiquetas...", youtube_url: null },
        ],
      },
      {
        title: "Modelos con scikit-learn",
        lessons: [
          { title: "Regresión lineal", body_md: "La regresión lineal modela la relación entre variables mediante una función lineal...", youtube_url: null },
          { title: "Clasificación con árboles de decisión", body_md: "Los árboles de decisión dividen el espacio de datos en regiones para clasificar ejemplos...", youtube_url: null },
        ],
      },
      {
        title: "Evaluación de modelos",
        lessons: [
          { title: "Overfitting, underfitting y validación cruzada", body_md: "Evaluar correctamente un modelo requiere separar datos de entrenamiento y prueba...", youtube_url: null },
        ],
      },
    ],
  },
  {
    ownerEmail: "instructor.ana@example.com",
    title: "IA para la Innovación",
    description: "Cómo aplicar inteligencia artificial para generar y validar ideas de negocio: casos de uso, prototipado con LLMs y medición de impacto.",
    status: "published",
    price: 34.99,
    cover_url: "/images/courses/ia-innovacion.jpg",
    modules: [
      {
        title: "El potencial de la IA en la innovación",
        lessons: [
          { title: "Qué puede y qué no puede hacer la IA hoy", body_md: "Separar capacidades reales de expectativas infladas es el primer paso para innovar con criterio...", youtube_url: null },
          { title: "Mapeo de oportunidades en tu organización", body_md: "Identifica procesos con datos abundantes y decisiones repetitivas, donde la IA aporta más valor...", youtube_url: null },
        ],
      },
      {
        title: "Prototipado rápido con modelos de lenguaje",
        lessons: [
          { title: "Diseño de prompts para exploración de ideas", body_md: "Un buen prompt define rol, contexto, restricciones y formato de salida esperado...", youtube_url: null },
          { title: "De la idea al prototipo funcional en una semana", body_md: "Usa LLMs para construir un prototipo desechable que valide la hipótesis antes de invertir en desarrollo...", youtube_url: null },
        ],
      },
      {
        title: "Del piloto al impacto medible",
        lessons: [
          { title: "Métricas para evaluar iniciativas de IA", body_md: "Define indicadores de negocio antes de lanzar el piloto, no después...", youtube_url: null },
          { title: "Ética, sesgos y adopción en equipos", body_md: "La innovación con IA falla más por resistencia organizacional y falta de confianza que por limitaciones técnicas...", youtube_url: null },
        ],
      },
    ],
  },
  {
    ownerEmail: "instructor.ana@example.com",
    title: "Accesibilidad Web (a11y)",
    description: "Construye interfaces accesibles siguiendo WCAG: semántica, ARIA y navegación por teclado.",
    status: "published",
    price: 9.99,
    cover_url: "/images/courses/accesibilidad.jpg",
    modules: [
      {
        title: "Fundamentos de accesibilidad",
        lessons: [
          { title: "HTML semántico", body_md: "Usar las etiquetas correctas mejora la accesibilidad...", youtube_url: null },
        ],
      },
    ],
  },
];

const ENROLLMENTS = [
  { studentEmail: "estudiante.maria@example.com", courseTitle: "Introducción a JavaScript" },
  { studentEmail: "estudiante.maria@example.com", courseTitle: "React desde Cero" },
  { studentEmail: "estudiante.carlos@example.com", courseTitle: "Introducción a JavaScript" },
];

const REVIEWS = [
  { studentEmail: "estudiante.maria@example.com", courseTitle: "Introducción a JavaScript", rating: 5, body: "Excelente curso para empezar." },
  { studentEmail: "estudiante.carlos@example.com", courseTitle: "Introducción a JavaScript", rating: 4, body: "Muy claro, me hubiera gustado más ejercicios." },
];

async function getOrCreateUser({ email, display_name }) {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  const existing = list.users.find((u) => u.email === email);
  if (existing) {
    console.log(`- Usuario ya existe: ${email}`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name },
  });
  if (error) throw error;
  console.log(`- Usuario creado: ${email} (password: ${SEED_PASSWORD})`);
  return data.user.id;
}

async function ensureProfileDisplayName(userId, display_name) {
  const { error } = await admin
    .from("profiles")
    .update({ display_name })
    .eq("id", userId);
  if (error) throw error;
}

async function main() {
  console.log("Creando usuarios...");
  const userIdByEmail = new Map();
  for (const u of USERS) {
    const id = await getOrCreateUser(u);
    userIdByEmail.set(u.email, id);
    await ensureProfileDisplayName(id, u.display_name);
  }

  console.log("\nCreando cursos...");
  const courseIdByTitle = new Map();
  for (const course of COURSES) {
    const ownerId = userIdByEmail.get(course.ownerEmail);
    const slug = course.title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const { data: existingCourse } = await admin
      .from("courses")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    let courseId;
    if (existingCourse) {
      courseId = existingCourse.id;
      const { error: updateErr } = await admin
        .from("courses")
        .update({
          cover_url: course.cover_url,
          description: course.description,
          price: course.price,
        })
        .eq("id", courseId);
      if (updateErr) console.warn(`Error al actualizar cover_url para ${course.title}:`, updateErr);
      console.log(`- Curso existente actualizado: ${course.title}`);
    } else {
      const { data: inserted, error } = await admin
        .from("courses")
        .insert({
          owner_id: ownerId,
          title: course.title,
          slug,
          description: course.description,
          status: course.status,
          price: course.price,
          cover_url: course.cover_url,
        })
        .select("id")
        .single();
      if (error) throw error;
      courseId = inserted.id;
      console.log(`- Curso creado: ${course.title} (${course.status})`);
    }
    courseIdByTitle.set(course.title, courseId);

    for (const [moduleIndex, mod] of course.modules.entries()) {
      const { data: existingModule } = await admin
        .from("modules")
        .select("id")
        .eq("course_id", courseId)
        .eq("title", mod.title)
        .maybeSingle();

      let moduleId;
      if (existingModule) {
        moduleId = existingModule.id;
      } else {
        const { data: insertedModule, error: moduleError } = await admin
          .from("modules")
          .insert({ course_id: courseId, title: mod.title, position: moduleIndex })
          .select("id")
          .single();
        if (moduleError) throw moduleError;
        moduleId = insertedModule.id;
      }

      for (const [lessonIndex, lesson] of mod.lessons.entries()) {
        const { data: existingLesson } = await admin
          .from("lessons")
          .select("id")
          .eq("module_id", moduleId)
          .eq("title", lesson.title)
          .maybeSingle();

        let lessonId;
        if (existingLesson) {
          lessonId = existingLesson.id;
        } else {
          const { data: insertedLesson, error: lessonError } = await admin
            .from("lessons")
            .insert({ module_id: moduleId, title: lesson.title, position: lessonIndex })
            .select("id")
            .single();
          if (lessonError) throw lessonError;
          lessonId = insertedLesson.id;
        }

        const { error: contentError } = await admin
          .from("lesson_contents")
          .upsert({
            lesson_id: lessonId,
            body_md: lesson.body_md,
            youtube_url: lesson.youtube_url,
          });
        if (contentError) throw contentError;
      }
    }
  }

  console.log("\nCreando inscripciones...");
  for (const e of ENROLLMENTS) {
    const userId = userIdByEmail.get(e.studentEmail);
    const courseId = courseIdByTitle.get(e.courseTitle);
    const { error } = await admin
      .from("enrollments")
      .upsert({ user_id: userId, course_id: courseId }, { onConflict: "user_id,course_id" });
    if (error) throw error;
    console.log(`- ${e.studentEmail} inscrito en "${e.courseTitle}"`);
  }

  console.log("\nCreando reseñas...");
  for (const r of REVIEWS) {
    const userId = userIdByEmail.get(r.studentEmail);
    const courseId = courseIdByTitle.get(r.courseTitle);
    const { error } = await admin
      .from("reviews")
      .upsert(
        { user_id: userId, course_id: courseId, rating: r.rating, body: r.body },
        { onConflict: "user_id,course_id" },
      );
    if (error) throw error;
    console.log(`- Reseña de ${r.studentEmail} en "${r.courseTitle}"`);
  }

  console.log("\nListo. Usuarios de prueba (password para todos: " + SEED_PASSWORD + "):");
  for (const u of USERS) console.log(`  - ${u.email} (${u.role})`);
}

main().catch((err) => {
  console.error("Error en el seed:", err);
  process.exit(1);
});
