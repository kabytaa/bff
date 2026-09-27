import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';

import {
  HOSTED_CUSTOMER_AUTH_URL,
  HOSTED_EXAMPLE_URL,
} from '../playwright.hosted-development.config';

const execFileAsync = promisify(execFile);
const bffSiteUrl = 'https://compassionate-buffalo-689.convex.site';
const bffDeployment = 'compassionate-buffalo-689';
const environmentKey = 'example-development';
const contextTokenLifetimeMilliseconds = 10 * 60 * 1_000;
const workspaceRoot = process.cwd();

async function waitForProtectedEvidence(page: Page) {
  await expect(
    page.getByRole('heading', { name: 'Verified Business context' }),
  ).toBeVisible();
  for (const title of [
    'Native Convex query',
    'Business HTTP API',
    'Shared BFF /v1/me',
  ]) {
    const card = page
      .getByRole('article')
      .filter({ has: page.getByText(title, { exact: true }) });
    await expect(card).not.toContainText('Checking the protected context');
    await expect(card).toContainText(/account_/u);
  }
  await expect(page.locator('.error-banner')).toHaveCount(0);
}

async function startLogin(context: BrowserContext) {
  const page = await context.newPage();
  await page.goto(HOSTED_EXAMPLE_URL);
  await expect(
    page.getByRole('heading', { name: 'One session, one verified context' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Sign in with Google' }).click();
  await page.waitForURL(`${HOSTED_CUSTOMER_AUTH_URL}/**`);
  const location = new URL(page.url());
  const reference = location.searchParams.get('transaction');
  expect(reference).toMatch(/^[A-Za-z0-9_-]{16,128}$/u);
  await page.close();
  return { location, reference: reference as string };
}

async function finishDevelopmentLogin(
  context: BrowserContext,
  transaction: Awaited<ReturnType<typeof startLogin>>,
  personaId: string,
) {
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      'node_modules/tsx/dist/cli.mjs',
      '--tsconfig',
      'tsconfig.base.json',
      'tools/bff-customer-auth/src/mintDevelopmentGrant.ts',
      JSON.stringify({
        bffSiteUrl,
        environmentKey,
        transactionReference: transaction.reference,
        target: {
          capability: 'signup',
          personaId,
          profile: {
            verifiedEmail: `${personaId}@example.invalid`,
            displayName: `Hosted ${personaId}`,
          },
        },
      }),
    ],
    { cwd: workspaceRoot, maxBuffer: 32 * 1_024 },
  );
  const grant = stdout.trim();
  expect(grant).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u);
  const page = await context.newPage();
  await page.addInitScript((developmentGrant) => {
    (
      window as Window & { __BFF_CUSTOMER_DEVELOPMENT_GRANT__?: string }
    ).__BFF_CUSTOMER_DEVELOPMENT_GRANT__ = developmentGrant;
  }, grant);
  const developmentEntry = new URL(
    '/index.development-auth.html',
    HOSTED_CUSTOMER_AUTH_URL,
  );
  developmentEntry.search = transaction.location.search;
  await page.goto(developmentEntry.href);
  await page.waitForURL(`${HOSTED_EXAMPLE_URL}/**`);
  await page.close();

  const cleanPage = await context.newPage();
  await cleanPage.goto(HOSTED_EXAMPLE_URL);
  await waitForProtectedEvidence(cleanPage);
  return cleanPage;
}

async function publicId(page: Page, label: 'Active account' | 'User') {
  const card = page
    .getByRole('article')
    .filter({ has: page.getByText(label, { exact: true }) });
  const value = (await card.locator('.identifier').textContent())?.trim();
  expect(value).toBeTruthy();
  return value as string;
}

async function provisionSecondAccount(userId: string, displayName: string) {
  const suffix = randomBytes(10).toString('hex');
  const args = {
    environmentKey,
    userPublicId: userId,
    accountPublicId: `account_hosted_${suffix}`,
    membershipPublicId: `membership_hosted_${suffix}`,
    displayName,
    now: Date.now(),
  };
  await execFileAsync(
    process.execPath,
    [
      'node_modules/convex/bin/main.js',
      'run',
      'customerOperations:provisionDevelopmentFixtureAccount',
      JSON.stringify(args),
      '--deployment',
      bffDeployment,
    ],
    { cwd: workspaceRoot, maxBuffer: 256 * 1_024 },
  );
}

async function ensureSecondAccount(page: Page, displayName: string) {
  if ((await page.getByLabel('Account').count()) === 0) {
    await provisionSecondAccount(await publicId(page, 'User'), displayName);
    await page.reload();
    await waitForProtectedEvidence(page);
  }
  await expect(page.getByLabel('Account')).toHaveCount(1);
}

async function loginPair(browser: Browser, prefix: string) {
  const [primaryContext, secondaryContext] = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const [primaryTransaction, secondaryTransaction] = await Promise.all([
    startLogin(primaryContext),
    startLogin(secondaryContext),
  ]);
  const [primaryPage, secondaryPage] = await Promise.all([
    finishDevelopmentLogin(
      primaryContext,
      primaryTransaction,
      `${prefix}-primary`,
    ),
    finishDevelopmentLogin(
      secondaryContext,
      secondaryTransaction,
      `${prefix}-secondary`,
    ),
  ]);
  return {
    contexts: [primaryContext, secondaryContext] as const,
    pages: [primaryPage, secondaryPage] as const,
  };
}

test('proves the complete hosted development customer session lifecycle', async ({
  browser,
  browserName,
}) => {
  const { contexts, pages } = await loginPair(browser, `hosted-${browserName}`);
  const [primaryContext, secondaryContext] = contexts;
  const [primaryPage, secondaryPage] = pages;

  await expect(await publicId(primaryPage, 'User')).not.toBe(
    await publicId(secondaryPage, 'User'),
  );
  await secondaryContext.close();

  await ensureSecondAccount(primaryPage, `Hosted ${browserName} second`);
  const firstAccountId = await publicId(primaryPage, 'Active account');
  const secondPage = await primaryContext.newPage();
  await secondPage.goto(HOSTED_EXAMPLE_URL);
  await waitForProtectedEvidence(secondPage);
  const accountOptions = await secondPage
    .getByLabel('Account')
    .locator('option')
    .evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    );
  const secondAccountId = accountOptions.find(
    (accountId) => accountId !== firstAccountId,
  );
  if (!secondAccountId) throw new Error('Second fixture account is missing');
  await secondPage.getByLabel('Account').selectOption(secondAccountId);
  await expect(
    secondPage
      .getByRole('article')
      .filter({ has: secondPage.getByText('Active account', { exact: true }) })
      .locator('.identifier'),
  ).toHaveText(secondAccountId);
  await expect(
    primaryPage
      .getByRole('article')
      .filter({ has: primaryPage.getByText('Active account', { exact: true }) })
      .locator('.identifier'),
  ).toHaveText(firstAccountId);

  await primaryPage.reload();
  await waitForProtectedEvidence(primaryPage);
  await primaryPage.waitForTimeout(contextTokenLifetimeMilliseconds + 5_000);
  await primaryPage.reload();
  await waitForProtectedEvidence(primaryPage);

  await primaryPage.getByRole('button', { name: 'Sign out' }).click();
  await expect(
    primaryPage.getByRole('heading', {
      name: 'One session, one verified context',
    }),
  ).toBeVisible();
  await expect(
    secondPage.getByRole('heading', {
      name: 'One session, one verified context',
    }),
  ).toBeVisible();
  await secondPage.reload();
  await expect(
    secondPage.getByRole('heading', {
      name: 'One session, one verified context',
    }),
  ).toBeVisible();
  await primaryContext.close();
});
