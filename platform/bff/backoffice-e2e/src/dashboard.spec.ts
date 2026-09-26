import { expect, test } from '@playwright/test';

test('shows the read-only Business environment overview', async ({ page }) => {
  await page.goto('');

  await expect(
    page.getByRole('heading', { name: 'Business Factory' }),
  ).toBeVisible();
  await expect(page.getByText('business-factory-bff')).toBeVisible();
  await expect(page.getByText('sample-development')).toBeVisible();
  await expect(page.getByText('sample-qa')).toBeVisible();
  await expect(page.getByText('Business environments').last()).toBeVisible();
  await expect(page.getByRole('button', { name: /create/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /delete/i })).toHaveCount(0);
});
