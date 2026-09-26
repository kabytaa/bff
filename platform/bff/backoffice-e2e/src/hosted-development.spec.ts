import { expect, test } from '@playwright/test';

import { HOSTED_DEVELOPMENT_BACKOFFICE_URL } from '../playwright.hosted-development.config';
import { mintDevelopmentAuthToken } from './developmentAuth';

let token: string;

test.beforeAll(async () => {
  token = await mintDevelopmentAuthToken({
    audience: HOSTED_DEVELOPMENT_BACKOFFICE_URL,
  });
});

test('loads the real protected development overview', async ({ page }) => {
  await page.addInitScript((temporaryToken) => {
    (
      window as Window & {
        __BFF_DEVELOPMENT_AUTOMATION_TOKEN__?: string;
      }
    ).__BFF_DEVELOPMENT_AUTOMATION_TOKEN__ = temporaryToken;
  }, token);

  await page.goto('/index.development-auth.html');

  await expect(
    page.getByRole('heading', { name: 'Business Factory' }),
  ).toBeVisible();
  await expect(page.getByText('business-factory-bff').first()).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Business environments' }),
  ).toBeVisible();
  await expect(page.getByText('Read only')).toBeVisible();
  await expect(page.getByText('Access not enabled')).toHaveCount(0);
  await expect(page.getByText('Operator sign-in')).toHaveCount(0);
});
