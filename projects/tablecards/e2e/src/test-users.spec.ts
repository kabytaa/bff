import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { expect, test, type Page } from '@playwright/test';
import {
  CUSTOMER_AUTH_CSRF_HEADER,
  CUSTOMER_AUTH_CSRF_HEADER_VALUE,
} from '@bff/contracts';
import {
  logInFromLanding,
  uniquePersona,
  expectNoHorizontalPageOverflow,
} from './support/hosted';

const execFileAsync = promisify(execFile);

async function expectLegacyGrantDenied(page: Page) {
  const sessionResponse = await page.request.post(
    'https://api.tablecards-dev.tofler.app/_tofler/auth/context',
    {
      headers: {
        [CUSTOMER_AUTH_CSRF_HEADER]: CUSTOMER_AUTH_CSRF_HEADER_VALUE,
        origin: 'https://tablecards-dev.tofler.app',
      },
      data: {},
    },
  );
  expect(sessionResponse.ok()).toBe(true);
  const session = (await sessionResponse.json()) as {
    status?: string;
    token?: string;
  };
  if (session.status !== 'authenticated' || typeof session.token !== 'string')
    throw new Error('Expected the synthetic customer session.');
  const response = await page.request.post(
    'https://compassionate-buffalo-689.convex.site/v1/product-access/development',
    {
      headers: {
        authorization: `Bearer ${session.token}`,
        'x-tofler-environment': 'tablecards-development',
        origin: 'https://tablecards-dev.tofler.app',
      },
      data: {
        offerKey: 'studio',
        offerRevision: 1,
        featureFlags: [],
        numericLimits: [],
        unitGrants: [],
      },
    },
  );
  // Only the denial status is retained; never print/store the context token.
  expect(response.status()).toBe(403);
}

test('operator-designated test user can simulate checkout and disabling preserves access', async ({
  page,
  context,
}, testInfo) => {
  // This journey never opens Help or invokes paid models/mail.
  await page.route('**/v1/operations/helper*', (route) => route.abort());
  const persona = uniquePersona('test-user-checkout', testInfo.project.name);
  await logInFromLanding(page, persona);
  await page.goto('/settings?offer=studio');
  await expect(page.getByRole('alert')).toContainText(
    'operator-designated test users',
  );
  await expect(page).toHaveURL(/tablecards-dev\.tofler\.app\/settings/u);
  await expectLegacyGrantDenied(page);
  const operator = await context.newPage();
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      'node_modules/tsx/dist/cli.mjs',
      '--tsconfig',
      'tsconfig.base.json',
      'platform/bff/backoffice-e2e/src/mintDevelopmentAuthToken.ts',
      'https://ops-dev.tofler.tech/',
    ],
    { cwd: process.cwd(), timeout: 30_000, maxBuffer: 8_192 },
  );
  await operator.addInitScript((token) => {
    (
      window as Window & { __BFF_DEVELOPMENT_AUTOMATION_TOKEN__?: string }
    ).__BFF_DEVELOPMENT_AUTOMATION_TOKEN__ = token;
  }, stdout.trim());
  await operator.goto(
    'https://ops-dev.tofler.tech/index.development-auth.html',
  );
  await operator
    .getByLabel('Business / environment')
    .selectOption('tablecards-development');
  await operator
    .getByRole('navigation', { name: /^(?:Mobile )?operator navigation$/iu })
    .filter({ visible: true })
    .getByRole('link', { name: 'Customers', exact: true })
    .click();
  await operator
    .getByLabel('Exact email or public customer ID')
    .fill(persona.email);
  await operator
    .getByRole('button', { name: 'Find customer', exact: true })
    .click();
  const control = operator.getByRole('region', { name: 'Test-user settings' });
  await expect(control.getByText('Normal user', { exact: true })).toBeVisible();
  await control.getByRole('button', { name: 'Mark as test user' }).click();
  await control.getByRole('button', { name: 'Enable test user' }).click();
  await expect(control.getByText('Test user', { exact: true })).toBeVisible();
  await expectLegacyGrantDenied(page);
  await expectNoHorizontalPageOverflow(operator);
  await control.screenshot({
    path: `.playwright-cli/test-user-enabled-${testInfo.project.name}.png`,
  });
  await page.reload();
  await page.waitForURL(/auth-dev\.tofler\.app\/checkout/u);
  await expect(
    page.getByRole('heading', { name: 'Studio', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Complete test payment' }).click();
  await page.waitForURL(/tablecards-dev\.tofler\.app\/settings/u);
  await expect(
    page.getByText('Test-user simulation · no payment charged'),
  ).toBeVisible();
  await control
    .getByRole('button', { name: 'Remove test-user status' })
    .click();
  await control.getByRole('button', { name: 'Confirm removal' }).click();
  await expect(control.getByText('Normal user', { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByText(
      'Test checkout is not available for this user and workspace. Real payments are not enabled yet.',
    ),
  ).toBeVisible();
  await expect(page.getByText('Studio', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('Test-user simulation · no payment charged'),
  ).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
  await page.screenshot({
    path: `.playwright-cli/test-user-disabled-access-retained-${testInfo.project.name}.png`,
  });
  await page.goto('/settings?offer=planner_pro');
  await expect(page.getByRole('alert')).toContainText(
    'operator-designated test users',
  );
  await expect(page).toHaveURL(/tablecards-dev\.tofler\.app\/settings/u);
  await operator.close();
});
