import { test, expect } from "@playwright/test";

/**
 * Flujo encadenado: visitante -> instructor crea y publica un curso gratis ->
 * estudiante se inscribe en ESE curso. test.describe.serial garantiza que
 * los tres bloques corran en ese orden y nunca en paralelo entre sí, ya que
 * el segundo y tercer bloque dependen del estado que deja el anterior.
 */

const courseTitle = `Curso E2E ${Date.now()}`;
const courseDescription = "Curso de prueba generado por el test E2E.";

test.describe.serial("Flujo EduPlatform: visitante, instructor y estudiante", () => {
  test.describe("Visitante navega el catálogo", () => {
    test("ve el catálogo público y el widget de Edy", async ({ page }) => {
      await page.goto("/");

      await expect(
        page.getByRole("heading", { name: "Learn without limits." }),
      ).toBeVisible();

      // Navega el catálogo: usa el buscador visible para cualquier visitante.
      await expect(page.getByRole("search")).toBeVisible();
      await expect(page.getByLabel("Buscar cursos")).toBeVisible();

      // El widget de Edy (o su botón de apertura) está presente en el DOM.
      // No se simula conversación de voz ni de texto.
      await expect(page.getByTestId("edy-launcher")).toBeAttached();
    });
  });

  test.describe("Instructor crea y publica un curso gratis", () => {
    test.use({ storageState: "e2e/.auth/instructor.json" });

    test("crea el curso, lo publica y aparece en el catálogo público", async ({
      page,
    }) => {
      await page.goto("/dashboard/teaching/new");

      await page.getByLabel("Title").fill(courseTitle);
      await page.getByLabel("Description").fill(courseDescription);

      await page.getByTestId("create-course-submit").click();

      // El submit crea el curso (precio 0 por defecto) y redirige al editor.
      // (el slug nunca es literalmente "new", así se excluye la propia URL
      // del formulario del match.)
      await expect(page).toHaveURL(
        /\/dashboard\/teaching\/(?!new$)[a-z0-9-]+$/,
        { timeout: 15_000 },
      );
      await expect(
        page.getByRole("heading", { name: "Edit course" }),
      ).toBeVisible();
      await expect(page.getByTestId("course-status")).toHaveText(
        "Status: Draft",
      );

      await page.getByTestId("toggle-publish").click();
      await expect(page.getByTestId("course-status")).toHaveText(
        "Status: Published",
      );

      // Verifica que aparece en el catálogo público buscándolo por título.
      await page.goto("/");
      await page.getByLabel("Buscar cursos").fill(courseTitle);
      await page.getByRole("button", { name: "Buscar" }).click();
      await expect(page).toHaveURL(/\?q=/);

      await expect(
        page.getByTestId("course-card").filter({
          has: page.getByRole("heading", { name: courseTitle, exact: true }),
        }),
      ).toBeVisible();
    });
  });

  test.describe("Estudiante se inscribe en el curso publicado", () => {
    test.use({ storageState: "e2e/.auth/estudiante.json" });

    test("busca el curso, se inscribe gratis y lo ve en su panel", async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByLabel("Buscar cursos").fill(courseTitle);
      await page.getByRole("button", { name: "Buscar" }).click();

      // La búsqueda navega a /?q=... vía router.push; espera a que aterrice
      // antes de buscar la card, para no leerla a mitad de la navegación.
      await expect(page).toHaveURL(/\?q=/);

      const courseCard = page
        .getByTestId("course-card")
        .filter({ has: page.getByRole("heading", { name: courseTitle, exact: true }) });
      await expect(courseCard).toBeVisible();
      await courseCard.click();

      await expect(page).toHaveURL(/\/courses\/[a-z0-9-]+$/, {
        timeout: 15_000,
      });
      await expect(
        page.getByRole("heading", { name: courseTitle }),
      ).toBeVisible();

      await page.getByTestId("enroll-button").click();

      // Confirmación directa: el curso es gratis, no hay checkout simulado.
      await expect(page.getByTestId("enrolled-confirmation")).toBeVisible();

      await page.goto("/dashboard/learning");
      await expect(page.getByTestId("resume-card")).toBeVisible();
      await expect(page.getByTestId("resume-card")).toHaveAttribute(
        "data-course-title",
        courseTitle,
      );
    });
  });
});
