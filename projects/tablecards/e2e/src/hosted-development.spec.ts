import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { expect, test, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

import { TABLECARDS_AUTH_URL, TABLECARDS_WEB_URL } from '../playwright.config';
import { readBrowserDownload } from './support/pdf';

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

async function completeMockCheckout(
  page: Page,
  offerId: 'planner_pro' | 'studio',
  offerName: 'Planner Pro' | 'Studio',
) {
  await page.goto(`/settings?offer=${offerId}`);
  await page.waitForURL(`${TABLECARDS_AUTH_URL}/checkout?**`);
  await expect(page.getByRole('heading', { name: offerName })).toBeVisible();
  await page.getByRole('button', { name: 'Complete test payment' }).click();
  await page.waitForURL(`${TABLECARDS_WEB_URL}/settings**`);
  await expect(
    page.getByText('Your access was updated successfully.'),
  ).toBeVisible();
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

async function expectNoHorizontalPageOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectInsideViewport(page: Page, selector: string) {
  const bounds = await page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(-1);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth + 1);
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

test('mobile creator is step focused and has no horizontal page overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Place cards that print/u }),
  ).toBeVisible();
  const landingResources = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => name.includes('/assets/')),
  );
  expect(landingResources).not.toEqual(
    expect.arrayContaining([expect.stringMatching(/\/assets\/(?:app|src)-/u)]),
  );
  await expect(
    page.getByRole('heading', { name: 'Build your first sheet' }),
  ).toHaveCount(0);
  // Wait for the initial session probe to finish so its provider remount cannot
  // replace the landing route while WebKit is following the creator link.
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  await Promise.all([
    page.waitForURL(`${TABLECARDS_WEB_URL}/create`),
    page.getByRole('link', { name: 'Create free — up to 25 cards' }).click(),
  ]);
  await expect(page.getByRole('button', { name: 'Guests' })).toBeVisible();
  await expect(page.getByText('TableCards', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Preview names' }),
  ).not.toBeVisible();
  await page.getByRole('button', { name: 'Try an example list' }).click();
  await expect(page.getByLabel(/Paste one name per line/u)).toHaveValue(
    /Alexandria Catherine Montgomery-Sinclair/u,
  );
  await page
    .getByLabel(/Paste one name per line/u)
    .fill('Ada Lovelace\nGrace Hopper');
  await page.getByRole('button', { name: 'Continue to design' }).click();
  await expect(page.getByRole('button', { name: 'Design' })).toHaveAttribute(
    'aria-current',
    'step',
  );
  await expect(
    page.getByRole('group', { name: 'Print layout to test' }),
  ).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
  await expectInsideViewport(page, '[data-creator-step="2"]');
  await expectInsideViewport(page, '.print-layout-options');
  await page.getByLabel(/Landscape — 6 cards/u).check();
  await expect(page.getByLabel(/Landscape — 6 cards/u)).toBeChecked();
  await page.getByRole('button', { name: 'Review and export' }).click();
  await expect(page.getByText(/2 cards · 2 PDF pages/u)).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
});

test('desktop creator keeps the design and print controls aligned', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/create');
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  const exampleAction = page.getByRole('button', {
    name: 'Try an example list',
  });
  const guestList = page.getByLabel(/Paste one name per line/u);
  await expect(exampleAction).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Preview names' }),
  ).toBeVisible();
  const positions = await Promise.all([
    exampleAction.evaluate((element) => element.getBoundingClientRect().bottom),
    guestList.evaluate((element) => element.getBoundingClientRect().top),
  ]);
  expect(positions[0]).toBeLessThanOrEqual(positions[1]);
  await guestList.fill('Ada Lovelace\nGrace Hopper');
  await page.getByRole('button', { name: 'Preview names' }).click();
  await expect(
    page.getByRole('group', { name: 'Print layout to test' }),
  ).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
  await expectInsideViewport(page, '[data-creator-step="2"]');
  await expectInsideViewport(page, '.print-layout-options');
  await page.getByLabel(/Landscape — 6 cards/u).check();
  await expect(page.getByLabel(/Landscape — 6 cards/u)).toBeChecked();
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
    authenticated.getByRole('link', { name: 'Projects' }),
  ).toBeVisible();
  await expect(authenticated.getByText('4 cards · 2 PDF pages')).toBeVisible();
  await expect(
    authenticated.getByText(/Your guest list was restored/u),
  ).toBeVisible();
  await authenticated.getByRole('button', { name: /Rosewater Frame/u }).click();
  await expect(
    authenticated
      .getByText('Rosewater Frame is a Premium design.', { exact: true })
      .first(),
  ).toBeVisible();
  await expect(
    authenticated.getByRole('button', { name: 'Save project' }),
  ).toBeDisabled();
  await expect(
    authenticated.getByRole('button', { name: 'Create print-ready PDF' }),
  ).toBeDisabled();
  await authenticated.getByRole('button', { name: /Minimal Ivory/u }).click();
  await authenticated
    .getByRole('button', { name: 'Create print-ready PDF' })
    .click();
  const download = authenticated.getByRole('link', { name: 'Download PDF' });
  await expect(download).toBeVisible({ timeout: 60_000 });
  const href = await download.getAttribute('href');
  expect(href).toMatch(/^blob:/u);
  const bytes = await readBrowserDownload(authenticated, href as string);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(2);
  await authenticated.goto('/create');
  await expect(
    authenticated.getByText(/allows 1 active project/u),
  ).toBeVisible();
  await context.close();
});

test('free mobile creator explains premium design access before save', async ({
  browser,
  browserName,
}) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 780 },
  });
  const page = await context.newPage();
  await page.goto('/create');
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  await page
    .getByLabel(/Paste one name per line/u)
    .fill('Alexandria Catherine Montgomery-Sinclair');
  await page.getByRole('button', { name: 'Continue to design' }).click();
  await page.getByRole('button', { name: /Rosewater Frame/u }).click();
  await page.getByRole('button', { name: 'Review and export' }).click();
  await page.getByRole('button', { name: 'Save project' }).click();
  await page.waitForURL(`${TABLECARDS_AUTH_URL}/**`);
  const authenticated = await completeDevelopmentLogin(
    page,
    new URL(page.url()),
    `tablecards-mobile-access-${browserName}-${Date.now()}`,
  );
  await authenticated.getByRole('button', { name: 'Review' }).click();
  await expect(
    authenticated.getByText(/Rosewater Frame requires a paid plan/u),
  ).toBeVisible();
  await expect(
    authenticated.getByRole('button', { name: 'Save project' }),
  ).toBeDisabled();
  await expect(
    authenticated.getByRole('button', { name: 'Create print-ready PDF' }),
  ).toBeDisabled();
  await expectNoHorizontalPageOverflow(authenticated);
  await context.close();
});

test('professional project, preset and AI workflows use authenticated access', async ({
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
    authenticated.getByRole('link', { name: 'Projects' }),
  ).toBeVisible();
  await authenticated.getByRole('button', { name: 'Save project' }).click();
  await authenticated.waitForURL(`${TABLECARDS_WEB_URL}/projects/**`);
  await completeMockCheckout(authenticated, 'planner_pro', 'Planner Pro');
  await authenticated.goto('/designs');
  await authenticated
    .getByRole('button', { name: /Generate four choices/u })
    .click();
  await expect(
    authenticated.getByText('4 background choices are ready.'),
  ).toBeVisible({ timeout: 90_000 });
  await authenticated
    .getByRole('button', { name: 'Use for preset' })
    .first()
    .click();
  await authenticated
    .getByRole('button', { name: 'Save reusable preset' })
    .click();
  await expect(authenticated.getByText('Reusable preset saved.')).toBeVisible();

  await authenticated.goto('/projects');
  await authenticated.getByRole('button', { name: 'Duplicate' }).click();
  await authenticated.waitForURL(`${TABLECARDS_WEB_URL}/projects/**`);
  authenticated.once('dialog', (dialog) => void dialog.accept());
  await authenticated
    .getByRole('button', { name: 'Archive', exact: true })
    .click();
  await authenticated.waitForURL(`${TABLECARDS_WEB_URL}/projects`);
  await authenticated.getByRole('button', { name: 'Archived' }).click();
  await expect(authenticated.getByText('My event copy')).toBeVisible();
  await authenticated.getByRole('button', { name: 'Restore' }).click();
  await authenticated.waitForURL(`${TABLECARDS_WEB_URL}/projects/**`);
  await context.close();
});

test('Studio owner can invite a recipient and promote the joined member', async ({
  browser,
  browserName,
}) => {
  const suffix = `${browserName}-${Date.now()}`;
  const ownerPersona = `tablecards-studio-owner-${suffix}`;
  const recipientPersona = `tablecards-studio-member-${suffix}`;
  const recipientEmail = `${recipientPersona}@example.invalid`;
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();

  await preparePublicDraft(owner);
  await owner.getByRole('button', { name: 'Save project' }).click();
  await owner.waitForURL(`${TABLECARDS_AUTH_URL}/**`);
  await completeDevelopmentLogin(owner, new URL(owner.url()), ownerPersona);
  await expect(owner.getByRole('link', { name: 'Projects' })).toBeVisible();
  await owner.getByRole('button', { name: 'Save project' }).click();
  await owner.waitForURL(`${TABLECARDS_WEB_URL}/projects/**`);

  await completeMockCheckout(owner, 'studio', 'Studio');
  await owner.goto('/settings/team');
  await expect(owner.getByRole('heading', { name: 'Team' })).toBeVisible();
  await owner.getByLabel('Verified email').fill(recipientEmail);
  await owner.getByRole('button', { name: 'Create invitation' }).click();
  const invitationLink = await owner
    .getByLabel('One-time invitation link')
    .inputValue();
  expect(invitationLink).toMatch(
    /^https:\/\/tablecards-dev\.tofler\.app\/invite\//u,
  );

  const recipientContext = await browser.newContext();
  const recipient = await recipientContext.newPage();
  await recipient.goto(invitationLink);
  await expect(
    recipient.getByRole('heading', {
      name: /^(?:Join |Review your invitation$)/u,
    }),
  ).toBeVisible();
  await recipient.getByRole('link', { name: 'Sign in to accept' }).click();
  await recipient.waitForURL(`${TABLECARDS_AUTH_URL}/**`);
  await completeDevelopmentLogin(
    recipient,
    new URL(recipient.url()),
    recipientPersona,
  );
  await recipient.getByRole('button', { name: 'Accept invitation' }).click();
  await recipient.waitForURL(`${TABLECARDS_WEB_URL}/projects`);

  await owner.reload();
  await expect(owner.getByText(recipientEmail)).toBeVisible();
  await owner.getByRole('button', { name: 'Make admin' }).click();
  await expect(owner.getByText('Member role updated.')).toBeVisible();
  await expect(
    owner.getByText(recipientEmail).locator('..').locator('..'),
  ).toContainText('admin');

  await recipientContext.close();
  await ownerContext.close();
});
