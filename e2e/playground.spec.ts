import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// End-to-end smoke tests for the SNIL playground.

test('landing — Karibu renders', async ({ page }) => {
  await page.goto('/');
  // Karibu screen shows the SNIL wordmark and the "Anza Kuandika" CTA.
  await expect(page.getByRole('heading', { name: 'SNIL', level: 1 })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Anza Kuandika' }).first(),
  ).toBeVisible();
});

test('playground — run a program and see its output', async ({ page }) => {
  await page.goto('/');

  // Enter the Playground (top tab is the reliable entry point).
  await page.getByRole('tab', { name: 'Playground' }).click();

  // Clear the editor and type a minimal program.
  const editor = page.getByRole('textbox', { name: 'Mhariri wa SNIL' });
  await expect(editor).toBeVisible();
  await editor.fill('onyesha "Habari, dunia!"');

  // Run it.
  await page.getByRole('button', { name: /Endesha/ }).click();

  // Output panel should contain the printed text.
  await expect(page.locator('pre.matokeo')).toContainText('Habari, dunia!');
});

test('landing — no serious or critical accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'SNIL', level: 1 })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    serious,
    `a11y violations:\n${serious.map((v) => `- ${v.id}: ${v.help}`).join('\n')}`,
  ).toEqual([]);
});
