import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { expect, test, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

import { TABLECARDS_AUTH_URL, TABLECARDS_WEB_URL } from '../playwright.config';

const execFileAsync = promisify(execFile);
const bffSiteUrl = 'https://compassionate-buffalo-689.convex.site';
const environmentKey = 'tablecards-development';

async function mintSignupGrant(
  transactionReference: string,
  personaId: string,
): Promise<string> {
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
        transactionReference,
        target: {
          capability: 'signup',
          personaId,
          profile: {
            verifiedEmail: `${personaId}@example.invalid`,
            displayName: `TableCards ${personaId}`,
          },
        },
      }),
    ],
    { cwd: process.cwd(), maxBuffer: 32 * 1024 },
  );
  return stdout.trim();
}

async function completeDevelopmentLogin(
  loginPage: Page,
  authUrl: URL,
  personaId: string,
): Promise<Page> {
  const transaction = authUrl.searchParams.get('transaction');
  expect(transaction).toMatch(/^[A-Za-z0-9_-]{16,128}$/u);
  const grant = await mintSignupGrant(transaction as string, personaId);
  await loginPage.addInitScript((developmentGrant) => {
    (
      window as Window & { __BFF_CUSTOMER_DEVELOPMENT_GRANT__?: string }
    ).__BFF_CUSTOMER_DEVELOPMENT_GRANT__ = developmentGrant;
  }, grant);
  const developmentEntry = new URL(
    '/index.development-auth.html',
    TABLECARDS_AUTH_URL,
  );
  developmentEntry.search = authUrl.search;
  await loginPage.goto(developmentEntry.href);
  await loginPage.waitForURL(`${TABLECARDS_WEB_URL}/**`);
  return loginPage;
}

async function preparePublicDraft(page: Page) {
  await page.goto('/create');
  await expect(
    page.getByRole('heading', { name: 'Build your first sheet' }),
  ).toBeVisible();
  // The auth provider can remount its children once the initial cookie probe
  // resolves. Start public interaction only after that one-time transition.
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  await page
    .getByLabel(/Paste one name per line/u)
    .fill(
      ['Ada Lovelace', 'Grace Hopper', 'James Baldwin', 'Octavia Butler'].join(
        '\n',
      ),
    );
  await page.getByRole('button', { name: 'Preview names' }).click();
  await expect(page.getByText('4 guests ready to preview.')).toBeVisible();
  await expect(page.getByText(/4 cards · 2 PDF pages/u)).toBeVisible();
}

test('published landscape print-test PDF has six-card page geometry', async ({
  request,
}) => {
  const response = await request.get(
    `${TABLECARDS_WEB_URL}/six-card-landscape-print-test.pdf`,
  );
  expect(response.ok()).toBe(true);
  const pdf = await PDFDocument.load(await response.body());
  expect(pdf.getPageCount()).toBe(2);
  expect(pdf.getPages().map((page) => page.getSize())).toEqual([
    { width: 792, height: 612 },
    { width: 792, height: 612 },
  ]);
});

test('public preview survives sign-in and produces a real PDF', async ({
  browser,
  browserName,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await preparePublicDraft(page);
  await page.getByRole('button', { name: 'Create print-ready PDF' }).click();
  await page.waitForURL(`${TABLECARDS_AUTH_URL}/**`);
  const authUrl = new URL(page.url());
  const authenticated = await completeDevelopmentLogin(
    page,
    authUrl,
    `tablecards-${browserName}-${Date.now()}`,
  );
  await expect(
    authenticated.getByRole('button', { name: 'Sign out' }),
  ).toBeVisible();
  await expect(authenticated.getByText('4 cards · 2 PDF pages')).toBeVisible();
  await expect(
    authenticated.getByText(/Your guest list was restored/u),
  ).toBeVisible();
  await authenticated
    .getByRole('button', { name: 'Create print-ready PDF' })
    .click();
  const download = authenticated.getByRole('link', { name: 'Download PDF' });
  await expect(download).toBeVisible({ timeout: 60_000 });
  const href = await download.getAttribute('href');
  expect(href).toMatch(/^https:\/\//u);
  const response = await context.request.get(href as string);
  expect(response.ok()).toBe(true);
  const bytes = await response.body();
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(2);
  await context.close();
});

test('development offer and four-choice AI flow use authenticated access', async ({
  browser,
  browserName,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await preparePublicDraft(page);
  await page.getByRole('button', { name: 'Save project' }).click();
  await page.waitForURL(`${TABLECARDS_AUTH_URL}/**`);
  const authUrl = new URL(page.url());
  const authenticated = await completeDevelopmentLogin(
    page,
    authUrl,
    `tablecards-ai-${browserName}-${Date.now()}`,
  );
  await expect(
    authenticated.getByRole('button', { name: 'Sign out' }),
  ).toBeVisible();
  await authenticated.getByRole('button', { name: 'Save project' }).click();
  await expect(
    authenticated.getByText('Project saved securely to your account.'),
  ).toBeVisible();
  await authenticated.getByText('Saved projects and creative tools').click();
  await authenticated.getByRole('button', { name: 'Event Pass' }).click();
  await expect(authenticated.getByText(/Event Pass is active/u)).toBeVisible();
  await authenticated
    .getByRole('button', { name: 'Generate four choices' })
    .click();
  await expect(
    authenticated.getByRole('img', { name: 'Generated background option' }),
  ).toHaveCount(4, { timeout: 90_000 });
  await context.close();
});
