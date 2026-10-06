import { test, expect } from "@playwright/test";

test.describe("Banner de promoción del catálogo", () => {
  test("se muestra al visitante y no reaparece tras descartarlo en la sesión", async ({
    page,
  }) => {
    await page.goto("/");

    const banner = page.getByTestId("promo-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("50% de descuento");
    await expect(banner).toContainText("31 de octubre");

    await page.getByRole("button", { name: "Cerrar banner de promoción" }).click();
    await expect(banner).toBeHidden();

    // Recarga y navegación dentro de la misma sesión: sigue oculto.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Learn without limits." })).toBeVisible();
    await expect(page.getByTestId("promo-banner")).toHaveCount(0);

    await page.goto("/login");
    await page.goto("/");
    await expect(page.getByTestId("promo-banner")).toHaveCount(0);
  });

  test("una sesión nueva vuelve a mostrarlo", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByTestId("promo-banner")).toBeVisible();
    await context.close();
  });
});
