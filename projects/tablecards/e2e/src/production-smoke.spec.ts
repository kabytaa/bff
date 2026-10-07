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

test('site icons load as real images from landing and creator deep links', async ({
  page,
}) => {
  for (const route of ['/', '/create']) {
    await page.goto(route);
    await expect(
      page.locator('link[rel="icon"][type="image/svg+xml"]'),
    ).toHaveAttribute('href', '/favicon.svg');
    for (const [path, type] of [
      ['/favicon.svg', 'image/svg+xml'],
      ['/favicon-32.png', 'image/png'],
      ['/apple-touch-icon.png', 'image/png'],
    ] as const) {
      const response = await page.request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain(type);
      expect((await response.body()).byteLength).toBeGreaterThan(100);
    }
    expect(
      await page.locator('link[rel="apple-touch-icon"]').getAttribute('sizes'),
    ).toBe('180x180');
  }
});

test('public pricing, creator, long names and cards-only preview work without dev controls', async ({
  page,
}, info) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Place cards that print/u }),
  ).toBeVisible();
  for (const price of ['$0', '$5', '$9', '$19'])
    await expect(page.getByText(price, { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Preview checkout is a no-charge simulation/u),
  ).toBeVisible();
  await expectContained(page);
  expect(
    await page.evaluate(async () => {
      const url = URL.createObjectURL(new Blob(['local-download-probe']));
      try {
        return await (await fetch(url)).text();
      } finally {
        URL.revokeObjectURL(url);
      }
    }),
  ).toBe('local-download-probe');
  await prepareCards(page);
  const heading = page.getByRole('heading', { name: 'Build your first sheet' });
  await heading.focus();
  await expect(heading).toBeFocused();
  await expect(heading).toHaveCSS('outline-style', 'none');
  await expect(page.getByText(/4 cards · 1 PDF pages/u)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Save project' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create print-ready PDF' }),
  ).toBeVisible();
  await expect(page.getByText(/including scale check/u)).toHaveCount(0);
  await expect(page.getByText(/square on page one/u)).toHaveCount(0);
  await expect(page.getByLabel('AI engine (development)')).toHaveCount(0);
  await openStep(page, 'Design');
  await expect(
    page.getByRole('group', { name: 'Print layout to test' }),
  ).toHaveCount(0);
  await expectContained(page);
  if (info.project.use.isMobile) {
    const next = page.getByRole('button', { name: 'Review and export' });
    await next.scrollIntoViewIfNeeded();
    await expect(next).toHaveCSS('position', 'static');
    const button = await next.boundingBox();
    const card = await page.locator('[data-creator-step="2"]').boundingBox();
    expect(button).not.toBeNull();
    expect(card).not.toBeNull();
    expect(button!.y + button!.height).toBeLessThanOrEqual(
      card!.y + card!.height,
    );
  }
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
  const popupPromise = page.waitForEvent('popup');
  await page
    .getByLabel('Continue with Google')
    .getByRole('button')
    .first()
    .click();
  const google = await popupPromise;
  await google.waitForURL((url) => url.hostname === 'accounts.google.com');
  await expect(google.getByRole('textbox').first()).toBeVisible();
  await expect(
    google.getByText(/redirect_uri_mismatch|invalid_client|Access blocked/iu),
  ).toHaveCount(0);
  // Stops at Google before personal credentials; no mock or fabricated token.
});

test('policies and deep links describe the no-charge boundary on phone and desktop', async ({
  page,
}, info) => {
  for (const route of ['privacy', 'terms', 'contact']) {
    await page.goto(`/${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByText(/no-charge preview, not a commercial launch/u),
    ).toBeVisible();
    await expectContained(page);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const back = page.getByRole('link', { name: 'Back to TableCards' });
    if (info.project.use.isMobile) await back.tap();
    else await back.click();
    await expect(page).toHaveURL('https://tablecards.tofler.app/');
  }
});
