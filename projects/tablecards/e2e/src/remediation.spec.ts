import {
  expect,
  test,
  type Locator,
  type Page,
  type Request,
} from '@playwright/test';

import {
  logInFromLanding,
  uniquePersona,
  expectNoHorizontalPageOverflow,
  chooseDevelopmentOffer,
} from './support/hosted';
import { readBrowserDownload, readPdfText } from './support/pdf';
import {
  MIXED_EXAMPLE_NAMES,
  expectExampleNameLayout,
} from './support/name-layout';

test('review regression: fresh Free access grants one lifetime AI batch without choosing a mock offer', async ({
  page,
}, info) => {
  await logInFromLanding(
    page,
    uniquePersona('free-welcome', info.project.name),
  );
  await page.goto('/settings');
  await expect(
    page.getByRole('heading', { name: 'Account and usage' }),
  ).toBeVisible();
  const summary = page.locator('.usage-summary-grid');
  await expect(summary.getByText('Free', { exact: true })).toBeVisible();
  await expect(
    summary.getByText('Default access', { exact: true }),
  ).toBeVisible();
  await expect(summary.getByText('1 remaining', { exact: true })).toBeVisible();
  await expect(summary.getByText('lifetime', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.reload();
  await expect(summary.getByText('1 remaining', { exact: true })).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
  await page.screenshot({
    path: info.outputPath('free-welcome-account.png'),
    fullPage: true,
  });
  await page.goto('/create');
  await page.getByRole('button', { name: 'Try an example list' }).click();
  const designStep = page.getByRole('button', { name: 'Design', exact: true });
  if (await designStep.isVisible()) await designStep.click();
  const reviewStep = page.getByRole('button', { name: 'Review', exact: true });
  if (await reviewStep.isVisible()) await reviewStep.click();
  await page.getByRole('button', { name: 'Save project' }).click();
  await page.waitForURL(/\/projects\/project_/u);
  const savedProjectUrl = page.url();
  await page.goto('/settings');
  await expect(
    summary.getByText('1 / 1', { exact: true }).first(),
  ).toBeVisible();
  await expect(summary.getByText('1 remaining', { exact: true })).toBeVisible();
  await expect(
    summary.getByText('Default access', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  // Exercise the real BFF reservation/commit path without spending provider
  // credits. The explicitly selected image fixture is development-only.
  await page.goto(savedProjectUrl);
  await expect(
    page.getByRole('heading', { name: 'Edit your sheet' }),
  ).toBeVisible();
  if (info.project.use.isMobile) {
    await page.getByRole('button', { name: 'Design', exact: true }).click();
  }
  await page.getByLabel('AI engine (development)').selectOption('mock');
  await page
    .getByLabel('AI background description')
    .fill('Simple watercolor foliage');
  await page
    .getByRole('button', { name: 'Generate four choices', exact: true })
    .click();
  await expect(
    page.getByText(
      'Four background choices are ready. Choose one for this event.',
    ),
  ).toBeVisible({ timeout: 90_000 });
  await expect(
    page
      .locator('[aria-label="AI background choices"]')
      .getByRole('button', { name: /Use AI choice/u }),
  ).toHaveCount(4);
  await page.goto('/settings');
  await expect(summary.getByText('0 remaining', { exact: true })).toBeVisible();
  await page.reload();
  await expect(summary.getByText('0 remaining', { exact: true })).toBeVisible();
  await expect(
    summary.getByText('Default access', { exact: true }),
  ).toBeVisible();
});

async function step(page: Page, name: 'Design' | 'Guests' | 'Review') {
  const button = page.getByRole('button', { name, exact: true });
  if (await button.isVisible()) await button.click();
}

test('review regression: Make a copy creates a separate editable project without archiving the original', async ({
  page,
}, info) => {
  await logInFromLanding(page, uniquePersona('make-copy', info.project.name));
  await chooseDevelopmentOffer(page, 'Planner Pro');
  await page.goto('/create');
  await page.getByLabel('Project name').fill('Reusable event');
  await page.getByRole('button', { name: 'Try an example list' }).click();
  const guests = await page.getByLabel(/Paste one name per line/u).inputValue();
  if (info.project.use.isMobile) {
    await page.getByRole('button', { name: 'Review', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Save project' }).click();
  await page.waitForURL(/\/projects\/project_/u);
  const originalUrl = page.url();
  await expect(page.locator('.save-state')).toHaveText(
    'Saved to this workspace',
  );
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Duplicate', exact: true }),
  ).toHaveCount(0);
  const copyButton = page.getByRole('button', {
    name: 'Make a copy',
    exact: true,
  });
  await expect(copyButton).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Archive', exact: true }),
  ).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
  await page.screenshot({
    path: info.outputPath('make-a-copy-project-actions.png'),
    fullPage: true,
  });
  await copyButton.click();
  await page.waitForURL(/\/projects\/project_/u);
  expect(page.url()).not.toBe(originalUrl);
  await expect(page.getByLabel('Project name')).toHaveValue(
    'Reusable event copy',
  );
  if (info.project.use.isMobile) {
    await page.getByRole('button', { name: 'Guests', exact: true }).click();
  }
  await expect(page.getByLabel(/Paste one name per line/u)).toHaveValue(guests);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Reusable event', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Reusable event copy', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('2 of 25 active projects', { exact: true }),
  ).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
});

test('review regression: project names persist before and after saving while lifecycle actions stay in Projects', async ({
  page,
}, info) => {
  await logInFromLanding(
    page,
    uniquePersona('project-naming', info.project.name),
  );
  await page.goto('/create');
  const name = page.getByLabel('Project name');
  await expect(name).toBeVisible();
  await name.fill('First named project');
  await page.getByRole('button', { name: 'Try an example list' }).click();
  for (const currentStep of ['Guests', 'Design', 'Review'] as const) {
    await step(page, currentStep);
    await expect(name).toBeVisible();
    await expect(name).toHaveValue('First named project');
  }
  await page.getByRole('button', { name: 'Save project' }).click();
  await page.waitForURL(/\/projects\/project_/u);
  const savedUrl = page.url();
  await expect(name).toHaveValue('First named project');
  await expect(
    page.getByRole('region', { name: 'Project actions' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Make a copy', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Archive', exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(name).toHaveValue('First named project');
  await name.fill('Renamed saved project');
  await expect(page.locator('.save-state')).toContainText('Unsaved changes');
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toMatch(/Discard the unsaved changes/u);
    await dialog.dismiss();
  });
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page).toHaveURL(savedUrl);
  await expect(name).toHaveValue('Renamed saved project');
  await step(page, 'Review');
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.locator('.save-state')).toHaveText(
    'Saved to this workspace',
  );
  await expect(page).toHaveURL(savedUrl);
  await name.fill('Second unsaved rename');
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toMatch(/Discard the unsaved changes/u);
    await dialog.dismiss();
  });
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page).toHaveURL(savedUrl);
  await expect(name).toHaveValue('Second unsaved rename');
  await name.fill('Renamed saved project');
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.locator('.save-state')).toHaveText(
    'Saved to this workspace',
  );
  await page.reload();
  await expect(name).toHaveValue('Renamed saved project');
  await expectNoHorizontalPageOverflow(page);
  await page.screenshot({
    path: info.outputPath('named-project-editor.png'),
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Renamed saved project', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Make a copy', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/project limit/u);
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Renamed saved project');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(
    page.getByText('Create your first project', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Archived', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Renamed saved project', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await page.waitForURL(savedUrl);
  await expect(name).toHaveValue('Renamed saved project');
});

async function importNames(page: Page, text: string) {
  await step(page, 'Guests');
  await page.getByLabel(/Paste one name per line/u).fill(text);
  const next = page.getByRole('button', { name: 'Continue to design' });
  if (await next.isVisible()) await next.click();
  else await page.getByRole('button', { name: 'Preview names' }).click();
}

async function expectInlineAction(page: Page, action: Locator, card: Locator) {
  // Scroll as a user would: Playwright's "if needed" considers the full
  // viewport, including the area covered by the fixed application navigation.
  await action.evaluate((element) =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  await expect(action).toBeVisible();
  await expect(action).toHaveCSS('position', 'static');
  const button = await action.boundingBox();
  const panel = await card.boundingBox();
  expect(button).not.toBeNull();
  expect(panel).not.toBeNull();
  expect(button!.x).toBeGreaterThanOrEqual(panel!.x);
  expect(button!.x + button!.width).toBeLessThanOrEqual(
    panel!.x + panel!.width,
  );
  expect(button!.y).toBeGreaterThanOrEqual(panel!.y);
  expect(button!.y + button!.height).toBeLessThanOrEqual(
    panel!.y + panel!.height,
  );
  const navigation = await page.locator('.mobile-navigation').boundingBox();
  expect(navigation).not.toBeNull();
  expect(button!.y + button!.height).toBeLessThanOrEqual(navigation!.y);
}

test('review regression: mixed examples wrap long names consistently in preview and downloaded PDF', async ({
  page,
}, info) => {
  await logInFromLanding(
    page,
    uniquePersona('balanced-name-lines', info.project.name),
  );
  await page.goto('/create');
  await page.getByRole('button', { name: 'Try an example list' }).click();
  await expect(page.getByLabel(/Paste one name per line/u)).toHaveValue(
    MIXED_EXAMPLE_NAMES.join('\n'),
  );
  await step(page, 'Design');
  await page.getByRole('button', { name: /Garden Sage/u }).click();
  await page.getByLabel('Project name').fill('Mixed name review');
  await page.getByRole('button', { name: 'Open complete preview' }).click();
  const preview = page.getByRole('dialog', { name: 'Complete print preview' });
  await expect(preview).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const lines = await expectExampleNameLayout(
    preview,
    MIXED_EXAMPLE_NAMES.slice(0, 4),
  );
  await page.screenshot({
    path: info.outputPath('mixed-name-first-sheet.png'),
    fullPage: true,
  });
  await preview.getByRole('button', { name: 'Next sheet' }).click();
  lines.push(
    ...(await expectExampleNameLayout(preview, MIXED_EXAMPLE_NAMES.slice(4))),
  );
  await page.screenshot({
    path: info.outputPath('mixed-name-second-sheet.png'),
    fullPage: true,
  });
  await preview.getByRole('button', { name: 'Return to editor' }).click();
  await step(page, 'Review');
  await page.getByRole('button', { name: 'Save project' }).click();
  await page.waitForURL(/\/projects\/project_/u);
  await page.getByRole('button', { name: 'Create print-ready PDF' }).click();
  const download = page.getByRole('link', { name: 'Download PDF' });
  await expect(download).toBeVisible({ timeout: 90_000 });
  const pdf = await readPdfText(
    await readBrowserDownload(page, (await download.getAttribute('href'))!),
  );
  expect(pdf.title).toBe('Mixed name review');
  expect(pdf.pageCount).toBe(2);
  for (const line of lines)
    expect(pdf.text.split('\n').filter((text) => text === line)).toHaveLength(
      2,
    );
  expect(pdf.text).not.toContain('Alexandria Catherine Montgomery-Sinclair');
  const downloaded = page.waitForEvent('download');
  await download.click();
  await (await downloaded).saveAs(info.outputPath('mixed-names.pdf'));
  await expectNoHorizontalPageOverflow(page);
});

test('review regression: creator actions stay in their cards and Sign out appears once', async ({
  page,
}, info) => {
  await logInFromLanding(
    page,
    uniquePersona('inline-creator-actions', info.project.name),
  );
  const signOut = page.getByRole('button', { name: 'Sign out', exact: true });
  await expect(signOut).toHaveCount(1);
  await page.goto('/create');
  await expect(signOut).toHaveCount(1);
  if (info.project.use.isMobile) {
    const next = page.getByRole('button', { name: 'Continue to design' });
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 480 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await expectInlineAction(
        page,
        next,
        page.locator('[data-creator-step="1"]'),
      );
      await expect(next).toBeDisabled();
      await expect(next).toHaveCSS('opacity', '1');
      await expectNoHorizontalPageOverflow(page);
    }
    await page.screenshot({
      path: info.outputPath('inline-empty-guests.png'),
      fullPage: true,
    });
  }
  await importNames(page, 'Ada Lovelace\nAlexandra Catherine Montgomery');
  await page.getByLabel('Project name').fill('Inline action review');
  if (info.project.use.isMobile) {
    const review = page.getByRole('button', { name: 'Review and export' });
    await expectInlineAction(
      page,
      review,
      page.locator('[data-creator-step="2"]'),
    );
    await review.click();
    await expectInlineAction(
      page,
      page.locator('.action-card > .inline-actions'),
      page.locator('.action-card'),
    );
    await page.screenshot({
      path: info.outputPath('inline-review-actions.png'),
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: 'Save project' }).click();
  await page.waitForURL(/\/projects\/project_/u);
  await expect(signOut).toHaveCount(1);
  const download = page.getByRole('link', { name: 'Download PDF' });
  await page.getByRole('button', { name: 'Create print-ready PDF' }).click();
  await expect(download).toBeVisible({ timeout: 90_000 });
  if (info.project.use.isMobile) {
    await expectInlineAction(
      page,
      page.locator('.action-card > .inline-actions'),
      page.locator('.action-card'),
    );
    await expect(page.locator('.mobile-navigation')).toHaveCSS(
      'position',
      'fixed',
    );
  }
  await expectNoHorizontalPageOverflow(page);
  const pdf = await readPdfText(
    await readBrowserDownload(page, (await download.getAttribute('href'))!),
  );
  expect(pdf.pageCount).toBe(1);
  const downloaded = page.waitForEvent('download');
  await download.click();
  // Mobile WebKit reports an empty suggested filename for Blob downloads;
  // validate the real PDF, while still exercising the link's click.
  await downloaded;
  page.once('dialog', (dialog) => void dialog.accept());
  await signOut.click();
  await expect(page.getByRole('link', { name: 'Log in' }).last()).toBeVisible();
  await expect(signOut).toHaveCount(0);
});

test('review regression: Create shares application navigation, preserves drafts and stays contained', async ({
  page,
}, info) => {
  await logInFromLanding(
    page,
    uniquePersona('creator-navigation', info.project.name),
  );
  await page.goto('/projects');
  await expect(
    page.getByRole('button', { name: 'Sign out', exact: true }),
  ).toHaveCount(1);
  const projectHeading = page.getByRole('heading', {
    name: 'Projects',
    exact: true,
  });
  await projectHeading.focus();
  await expect(projectHeading).toBeFocused();
  await expect(projectHeading).toHaveCSS('outline-style', 'none');
  const navigation = page.locator(
    info.project.use.isMobile
      ? '.mobile-navigation'
      : '.application-sidebar nav',
  );
  await navigation.getByRole('link', { name: 'Create', exact: true }).click();
  await expect(page).toHaveURL(/\/create$/u);
  await expect(page.locator('.application-shell')).toBeVisible();
  const creatorHeading = page.getByRole('heading', {
    name: 'Create your place cards',
  });
  await creatorHeading.focus();
  await expect(creatorHeading).toBeFocused();
  await expect(creatorHeading).toHaveCSS('outline-style', 'none');
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
  if (info.project.use.isMobile) {
    const stepHeading = page.getByRole('heading', { name: 'Choose the look' });
    await expect(stepHeading).toBeFocused();
    await expect(stepHeading).toHaveCSS('outline-style', 'none');
  }
  await page.getByLabel('Project name').fill('Navigation review');
  await page.reload();
  if (info.project.use.isMobile) {
    await expect(
      page.getByRole('button', { name: 'Guests', exact: true }),
    ).toBeVisible();
  }
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
  await expect(page.getByLabel('Project name')).toHaveValue(
    'Navigation review',
  );
  await step(page, 'Review');
  if (info.project.use.isMobile) {
    await page
      .locator('.action-card > .inline-actions')
      .scrollIntoViewIfNeeded();
    await expect(page.locator('.action-card > .inline-actions')).toHaveCSS(
      'position',
      'static',
    );
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
  await page.keyboard.press('Tab');
  const keyboardTarget = page.locator(':focus');
  await expect(keyboardTarget).toHaveCSS('outline-style', 'solid');
  await expect(keyboardTarget).toHaveCSS('outline-width', '3px');
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
  await page.getByLabel('Project name').fill('Original event');
  await step(page, 'Review');
  await page.getByRole('button', { name: 'Save project' }).click();
  await page.waitForURL(/\/projects\/project_/u);
  await step(page, 'Guests');
  await expect(page.getByLabel(/Paste one name per line/u)).toHaveValue(
    'Old Guest\nOriginal Guest\nRemoved Guest',
  );
  await importNames(page, 'Łukasz Dvořák\nŁukasz Dvořák');
  await page.getByLabel('Project name').fill('Reviewed current event');
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
  await page.getByLabel('Project name').fill('Not yet exported');
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
  await page.getByLabel('Project name').fill('Maximum supported event');
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
