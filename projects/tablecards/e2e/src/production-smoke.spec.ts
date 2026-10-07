import { expect, test, type Page } from '@playwright/test';

async function expectContained(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

async function openStep(page: Page, name: 'Design' | 'Review') {
  const button = page.getByRole('button', { name, exact: true });
  if (await button.isVisible()) await button.click();
}

async function prepareCards(page: Page) {
  await page.goto('/create');
  await page
    .getByLabel(/Paste one name per line/u)
    .fill(
      'Ada Lovelace\nŁukasz Dvořák\nAlexandra Catherine Montgomery\nAda Lovelace',
    );
  const next = page.getByRole('button', { name: 'Continue to design' });
  if (await next.isVisible()) await next.click();
  else await page.getByRole('button', { name: 'Preview names' }).click();
  await openStep(page, 'Design');
  await page
    .getByLabel('Event name')
    .fill('Production smoke — synthetic names');
  await openStep(page, 'Review');
}

test('public pricing, creator, long names and cards-only preview work without dev controls', async ({
  page,
}, info) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Place cards that print/u }),
  ).toBeVisible();
  for (const price of ['$0', '$5', '$9', '$19'])
    await expect(page.getByText(price, { exact: true })).toBeVisible();
  await expectContained(page);
  await prepareCards(page);
  await expect(page.getByText(/4 cards · 1 PDF pages/u)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Save project' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create print-ready PDF' }),
  ).toBeVisible();
  await expect(page.getByText(/including scale check/u)).toHaveCount(0);
  await expect(page.getByLabel('AI engine (development)')).toHaveCount(0);
  await openStep(page, 'Design');
  await expect(
    page.getByRole('group', { name: 'Print layout to test' }),
  ).toHaveCount(0);
  await expectContained(page);
  await page.screenshot({
    path: info.outputPath('production-design.png'),
    fullPage: true,
  });
});

test('protected save hands off to real, business-branded Google authentication only', async ({
  page,
}) => {
  await prepareCards(page);
  await page.getByRole('button', { name: 'Save project' }).click();
  await page.waitForURL('https://auth.tofler.app/**');
  await expect(
    page.getByRole('heading', {
      name: /(?:Log in to|Continue to|Create your) TableCards/u,
    }),
  ).toBeVisible();
  await expect(page.getByText('TableCards · Production')).toBeVisible();
  await expect(page.getByLabel('Continue with Google')).toBeVisible();
  await expect(page.getByText(/development dummy|test identity/iu)).toHaveCount(
    0,
  );
  await expectContained(page);
  // Stops before personal Google credentials; no mock or fabricated token.
});

test('policies and deep links describe the no-charge boundary on phone and desktop', async ({
  page,
}) => {
  for (const route of ['privacy', 'terms', 'contact']) {
    await page.goto(`/${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByText(/no-charge preview, not a commercial launch/u),
    ).toBeVisible();
    await expectContained(page);
    await page.getByRole('link', { name: 'Back to TableCards' }).click();
    await expect(page).toHaveURL('https://tablecards.tofler.app/');
  }
});
