import { test as setup, expect } from '@playwright/test';

const instructorFile = 'e2e/.auth/instructor.json';
const estudianteFile = 'e2e/.auth/estudiante.json';

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;
if (!TEST_PASSWORD) {
  throw new Error('E2E_TEST_PASSWORD env var is required to run auth setup');
}

async function loginAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(TEST_PASSWORD!);
  await page.getByRole('button', { name: /log in|signing in/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

setup('authenticate as instructor', async ({ page }) => {
  await loginAs(page, 'instructor.test@example.com');
  await page.context().storageState({ path: instructorFile });
});

setup('authenticate as estudiante', async ({ page }) => {
  await loginAs(page, 'estudiante.test@example.com');
  await page.context().storageState({ path: estudianteFile });
});
