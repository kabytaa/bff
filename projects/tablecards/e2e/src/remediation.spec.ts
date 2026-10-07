import { expect, test, type Page, type Request } from '@playwright/test';

import {
  logInFromLanding,
  uniquePersona,
  expectNoHorizontalPageOverflow,
  chooseDevelopmentOffer,
} from './support/hosted';
import { readBrowserDownload, readPdfText } from './support/pdf';

async function step(page: Page, name: 'Design' | 'Guests' | 'Review') {
  const button = page.getByRole('button', { name, exact: true });
  if (await button.isVisible()) await button.click();
}

async function importNames(page: Page, text: string) {
  await step(page, 'Guests');
  await page.getByLabel(/Paste one name per line/u).fill(text);
  const next = page.getByRole('button', { name: 'Continue to design' });
  if (await next.isVisible()) await next.click();
  else await page.getByRole('button', { name: 'Preview names' }).click();
}

test('review regression: Create shares application navigation, preserves drafts and stays contained', async ({
  page,
}, info) => {
  await logInFromLanding(
    page,
    uniquePersona('creator-navigation', info.project.name),
  );
  await page.goto('/projects');
  const navigation = page.locator(
    info.project.use.isMobile
      ? '.mobile-navigation'
      : '.application-sidebar nav',
  );
  await navigation.getByRole('link', { name: 'Create', exact: true }).click();
  await expect(page).toHaveURL(/\/create$/u);
  await expect(page.locator('.application-shell')).toBeVisible();
  await expect(page.locator('.creator-route-header')).toHaveCount(0);
  await expect(page.locator('.application-topbar strong')).toHaveText('Create');
  await expect(
    navigation.getByRole('link', { name: 'Create', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(
    page.getByRole('link', { name: 'Log in', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.application-sidebar')).toBeVisible({
    visible: !info.project.use.isMobile,
  });
  await expect(page.locator('.mobile-navigation')).toBeVisible({
    visible: Boolean(info.project.use.isMobile),
  });
  await importNames(page, 'Ada Lovelace\nAlexandra Catherine Montgomery');
  await page.getByLabel('Event name').fill('Navigation review');
  await page.reload();
  await step(page, 'Guests');
  await expect(page.getByLabel(/Paste one name per line/u)).toHaveValue(
    'Ada Lovelace\nAlexandra Catherine Montgomery',
  );
  const widths = info.project.use.isMobile
    ? [320, 390]
    : [800, 1024, 1280, 1440];
  for (const width of widths) {
    await page.setViewportSize({
      width,
      height: info.project.use.isMobile ? 844 : 900,
    });
    await expectNoHorizontalPageOverflow(page);
  }
  await page.screenshot({
    path: info.outputPath('authenticated-create.png'),
    fullPage: true,
  });
  await step(page, 'Design');
  await expect(page.getByLabel('Event name')).toHaveValue('Navigation review');
  await step(page, 'Review');
  if (info.project.use.isMobile) {
    const actions = await page
      .locator('.action-card > .inline-actions')
      .boundingBox();
    const bottomNavigation = await navigation.boundingBox();
    expect(actions).not.toBeNull();
    expect(bottomNavigation).not.toBeNull();
    expect(actions!.y + actions!.height).toBeLessThanOrEqual(
      bottomNavigation!.y,
    );
  }
  page.once('dialog', (dialog) => void dialog.accept());
  await navigation.getByRole('link', { name: 'Designs', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Designs', exact: true }),
  ).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: 'Designs', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expectNoHorizontalPageOverflow(page);
});

test('review regression: edited saved project exports the actual current names, title and duplicate multiplicity', async ({
  page,
}, info) => {
  let privateDownload: Request | undefined;
  page.on('request', (request) => {
    if (request.url().includes('/v1/files/exports/')) privateDownload = request;
  });
  await logInFromLanding(
    page,
    uniquePersona('pdf-regression', info.project.name),
  );
  await page.goto('/create');
  await importNames(page, 'Old Guest\nOriginal Guest\nRemoved Guest');
  await page.getByLabel('Event name').fill('Original event');
  await step(page, 'Review');
  await page.getByRole('button', { name: 'Save project' }).click();
  await page.waitForURL(/\/projects\/project_/u);
  await step(page, 'Guests');
  await expect(page.getByLabel(/Paste one name per line/u)).toHaveValue(
    'Old Guest\nOriginal Guest\nRemoved Guest',
  );
  await importNames(page, 'Łukasz Dvořák\nŁukasz Dvořák');
  await page.getByLabel('Event name').fill('Reviewed current event');
  await step(page, 'Review');
  await page.getByRole('button', { name: 'Create print-ready PDF' }).click();
  const download = page.getByRole('link', { name: 'Download PDF' });
  await expect(download).toBeVisible({ timeout: 90_000 });
  const parsed = await readPdfText(
    await readBrowserDownload(page, (await download.getAttribute('href'))!),
  );
  expect(parsed.title).toBe('Reviewed current event');
  expect(parsed.pageCount).toBe(1);
  expect(parsed.text).not.toMatch(
    /TableCards print check|Actual Size|calibration/iu,
  );
  expect(parsed.text.match(/Łukasz Dvořák/gu)).toHaveLength(4);
  expect(parsed.text).not.toMatch(/Old Guest|Original Guest|Removed Guest/u);
  await step(page, 'Design');
  await page.getByLabel('Event name').fill('Not yet exported');
  await step(page, 'Review');
  await expect(download).toHaveCount(0);
  await expectNoHorizontalPageOverflow(page);
  if (!privateDownload)
    throw new Error('No authenticated byte request was observed');
  const address = privateDownload.url();
  const authorization = privateDownload.headers()['authorization'];
  if (!authorization) throw new Error('The byte request lacked authentication');
  const anonymous = await page.context().request.get(address, {
    headers: { origin: 'https://tablecards-dev.tofler.app' },
  });
  expect(anonymous.status()).toBe(401);
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Sign out' }).last().click();
  await expect(page.getByRole('link', { name: 'Log in' }).last()).toBeVisible();
  const revoked = await page.context().request.get(address, {
    headers: { origin: 'https://tablecards-dev.tofler.app', authorization },
  });
  expect(revoked.status()).toBe(401);
});

test('review regression: policies, usable designs, workspace naming, pricing and signout on phone and desktop', async ({
  page,
}, info) => {
  for (const route of ['privacy', 'terms', 'contact']) {
    await page.goto(`/${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByText(/no-charge preview, not a commercial launch/u),
    ).toBeVisible();
    await expectNoHorizontalPageOverflow(page);
  }
  await logInFromLanding(
    page,
    uniquePersona('ui-regression', info.project.name),
  );
  await page.goto('/designs');
  await expect(
    page.getByRole('heading', { name: 'Designs', exact: true }),
  ).toBeVisible();
  const artwork = page.locator(
    '.design-library-card svg image[href*="/designs/predefined/v2/"]',
  );
  await expect(artwork).toHaveCount(6);
  await expect
    .poll(
      async () =>
        await artwork.evaluateAll(async (images) => {
          const results = await Promise.all(
            images.map(async (image) => {
              const url = image.getAttribute('href');
              if (!url) return false;
              const response = await fetch(url);
              return response.ok && (await response.blob()).size > 0;
            }),
          );
          return results.every(Boolean);
        }),
    )
    .toBe(true);
  await page.goto('/settings');
  await page.getByLabel('Workspace name').fill('My event workspace');
  await page.getByRole('button', { name: 'Save workspace name' }).click();
  await expect(page.getByText('Workspace name saved.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Workspace name')).toHaveValue(
    'My event workspace',
  );
  await page.getByRole('link', { name: 'View plans' }).click();
  await expect(page).toHaveURL(/\/#pricing$/u);
  await page.goto('/projects');
  await page.getByRole('button', { name: 'Sign out' }).last().click();
  await expect(page.getByRole('link', { name: 'Log in' }).last()).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
});

test('review regression: a name that cannot fit gets explicit feedback rather than an empty preview', async ({
  page,
}) => {
  await page.goto('/create');
  await importNames(page, 'W'.repeat(120));
  await step(page, 'Review');
  await expect(
    page.getByText(/cannot fit|does not fit|too long|shorten/iu).first(),
  ).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
});

test('review regression: the paid 500-card ceiling renders and downloads with embedded fonts', async ({
  page,
}, info) => {
  await logInFromLanding(
    page,
    uniquePersona('large-pdf-regression', info.project.name),
  );
  await chooseDevelopmentOffer(page, 'Planner Pro');
  await page.goto('/create');
  await importNames(
    page,
    Array.from({ length: 500 }, () => 'Łukasz Dvořák').join('\n'),
  );
  await page.getByLabel('Event name').fill('Maximum supported event');
  await step(page, 'Review');
  await page.getByRole('button', { name: 'Create print-ready PDF' }).click();
  const download = page.getByRole('link', { name: 'Download PDF' });
  await expect(download).toBeVisible({ timeout: 90_000 });
  const bytes = await readBrowserDownload(
    page,
    (await download.getAttribute('href'))!,
  );
  expect(bytes.byteLength).toBeLessThan(19 * 1024 * 1024);
  const parsed = await readPdfText(bytes);
  expect(parsed.title).toBe('Maximum supported event');
  expect(parsed.pageCount).toBe(125);
  expect(parsed.text.match(/Łukasz Dvořák/gu)).toHaveLength(1000);
  await expectNoHorizontalPageOverflow(page);
});
