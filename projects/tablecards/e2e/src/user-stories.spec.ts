import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { encode } from 'fast-png';
import { readBrowserDownload } from './support/pdf';

import { TABLECARDS_AUTH_URL } from '../playwright.config';
import {
  USER_STORY_IDS,
  USER_STORY_SCENARIOS,
  uncoveredUserStories,
} from './support/coverage';
import {
  chooseDevelopmentOffer,
  completeDevelopmentLogin,
  completeDevelopmentTransfer,
  expectNoHorizontalPageOverflow,
  findUserId,
  logInFromLanding,
  uniquePersona,
} from './support/hosted';

const validArtwork = resolve(
  process.cwd(),
  'projects/tablecards/workloads/web/public/designs/predefined/v2/garden-sage.jpg',
);

async function openCreatorStep(
  page: Page,
  name: 'Design' | 'Guests' | 'Review',
) {
  await expect(
    page.getByRole('heading', { name: 'Build your first sheet' }),
  ).toBeVisible();
  const control = page.getByRole('button', { name, exact: true });
  if (await control.isVisible()) await control.click();
}

async function openCreatorReview(page: Page) {
  await openCreatorStep(page, 'Review');
}

async function createSavedProject(
  page: Page,
  title: string,
  names = ['Ada Lovelace', 'Grace Hopper'],
) {
  await page.goto('/create');
  await page.getByLabel(/Paste one name per line/u).fill(names.join('\n'));
  const guestsStep = page.getByRole('button', { name: 'Guests' });
  if (await guestsStep.isVisible()) await guestsStep.click();
  const continueAction = page.getByRole('button', {
    name: 'Continue to design',
  });
  if (await continueAction.isVisible()) {
    await continueAction.click();
  } else {
    await page.getByRole('button', { name: 'Preview names' }).click();
  }
  await page.getByLabel('Event name').fill(title);
  await openCreatorReview(page);
  await page.getByRole('button', { name: 'Save project' }).click();
  await page.waitForURL(/\/projects\/project_/u);
}

async function activateOffer(
  page: Page,
  offerName: 'Event Pass' | 'Free' | 'Planner Pro' | 'Studio',
) {
  await chooseDevelopmentOffer(page, offerName);
  await expect(page.getByText('Development mock')).toBeVisible();
}

test('the acceptance registry covers every accepted user story', () => {
  expect(uncoveredUserStories()).toEqual([]);
  expect(Object.values(USER_STORY_SCENARIOS).flat().sort()).toEqual(
    [...USER_STORY_IDS].sort(),
  );
});

test.describe('public creation, import, authentication and navigation', () => {
  test('US-01–04 and US-19–20 work as one desktop and phone journey', async ({
    page,
  }, testInfo) => {
    const persona = uniquePersona('public-story', testInfo.project.name);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Place cards that print/u }),
    ).toBeVisible();
    await expect(page.getByText('$0')).toBeVisible();
    await expect(page.getByText('$5')).toBeVisible();
    await expect(page.getByText('$9')).toBeVisible();
    await expect(page.getByText('$19')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Create free PDF' }),
    ).toHaveAttribute('href', '/create');
    await expect(
      page.getByRole('link', { name: 'Finish one event' }),
    ).toBeVisible();

    const howItWorks = page.getByRole('link', { name: 'How it works' });
    if (await howItWorks.isVisible()) {
      await howItWorks.click();
      await expect(page).toHaveURL(/#how-it-works$/u);
    }
    await expect(
      page.getByRole('heading', {
        name: 'From spreadsheet to scissors in three steps',
      }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Create free PDF' }).click();
    await expect(page).toHaveURL(/\/create$/u);
    await expectNoHorizontalPageOverflow(page);

    await page.getByRole('button', { name: 'Try an example list' }).click();
    await expect(page.getByLabel(/Paste one name per line/u)).toHaveValue(
      /Alexandria Catherine Montgomery-Sinclair/u,
    );
    await page
      .getByLabel(/Paste one name per line/u)
      .fill('Name\tTable\tMeal\nAda Lovelace\t2\tVegan\nAda Lovelace\t4\tFish');
    const mapAction = page.getByRole('button', {
      name: 'Review spreadsheet columns',
    });
    await mapAction.last().click();
    await expect(
      page.getByRole('region', { name: 'Column mapping' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Use these columns' }).click();
    await expect(page.getByLabel('Event name')).toBeVisible();
    await openCreatorStep(page, 'Review');
    await expect(page.getByText(/2 cards · 2 PDF pages/u)).toBeVisible();
    await page.getByRole('button', { name: 'Create print-ready PDF' }).click();
    await page.waitForURL(`${TABLECARDS_AUTH_URL}/**`);
    await completeDevelopmentLogin(page, persona);
    await expect(page.getByText(/guest list was restored/u)).toBeVisible();
    await expect(page.getByText(/2 cards · 2 PDF pages/u)).toBeVisible();
    await page.getByRole('button', { name: 'Create print-ready PDF' }).click();
    await expect(page.getByRole('link', { name: 'Download PDF' })).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    for (const [label, heading] of [
      ['Create', 'Build your first sheet'],
      ['Designs', 'Designs'],
      ['Account', 'Account and usage'],
      ['Projects', 'Projects'],
    ] as const) {
      await page.getByRole('link', { name: label, exact: true }).last().click();
      await expect(
        page.getByRole('heading', { name: heading, exact: true }),
      ).toBeVisible();
      await expectNoHorizontalPageOverflow(page);
    }

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });
});

test.describe('Free and Event Pass project promises', () => {
  test('US-05–10 enforce project, design, export and event artwork promises', async ({
    page,
  }, testInfo) => {
    const persona = uniquePersona('event-story', testInfo.project.name);
    await logInFromLanding(page, persona);
    await activateOffer(page, 'Free');
    await expect(page.getByText('0 / 1')).toBeVisible();
    await expect(page.getByText('1 remaining')).toBeVisible();

    await page.goto('/create');
    const tooMany = Array.from(
      { length: 26 },
      (_, index) => `Guest ${index + 1}`,
    );
    await page.getByLabel(/Paste one name per line/u).fill(tooMany.join('\n'));
    const preview = page.getByRole('button', { name: 'Preview names' });
    if (await preview.isVisible()) await preview.click();
    else await page.getByRole('button', { name: 'Continue to design' }).click();
    await openCreatorReview(page);
    await page.getByRole('button', { name: 'Save project' }).click();
    await expect(
      page.getByText(/does not support that many cards/u),
    ).toBeVisible();

    const guestsStep = page.getByRole('button', { name: 'Guests' });
    if (await guestsStep.isVisible()) await guestsStep.click();
    await page.getByLabel(/Paste one name per line/u).fill('Ada\nGrace');
    const continueAction = page.getByRole('button', {
      name: 'Continue to design',
    });
    if (await continueAction.isVisible()) await continueAction.click();
    else {
      await page.getByRole('button', { name: 'Preview names' }).click();
    }
    await page.getByRole('button', { name: /Rosewater Frame/u }).click();
    await openCreatorReview(page);
    await expect(page.getByText(/requires a paid plan/u)).toBeVisible();
    await openCreatorStep(page, 'Design');
    await page.getByRole('button', { name: /Minimal Ivory/u }).click();
    await openCreatorReview(page);
    await page.getByRole('button', { name: 'Create print-ready PDF' }).click();
    const download = page.getByRole('link', { name: 'Download PDF' });
    await expect(download).toBeVisible({ timeout: 60_000 });
    const pdfBytes = await readBrowserDownload(
      page,
      (await download.getAttribute('href')) as string,
    );
    expect((await PDFDocument.load(pdfBytes)).getPageCount()).toBe(2);
    const projectUrl = page.url();

    await openCreatorStep(page, 'Guests');
    await page
      .getByLabel(/Paste one name per line/u)
      .fill('Ada changed\nGrace');
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toMatch(/Discard the unsaved changes/u);
      await dialog.dismiss();
    });
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL(projectUrl);
    await openCreatorReview(page);
    await page.getByRole('button', { name: 'Save project' }).click();
    await page.waitForURL(/\/projects\/project_/u);
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL(/\/projects$/u);

    await page.getByRole('button', { name: 'Duplicate' }).click();
    await expect(page.getByRole('alert')).toContainText(/project limit/u);
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await page.getByRole('button', { name: 'Archived', exact: true }).click();
    await expect(page.getByText('My event')).toBeVisible();
    await page.getByRole('button', { name: 'Restore' }).click();
    await page.waitForURL(/\/projects\/project_/u);
    const restoredProjectUrl = page.url();

    await activateOffer(page, 'Event Pass');
    await expect(
      page
        .getByRole('article')
        .filter({ hasText: 'Active projects' })
        .getByText('1 / 1'),
    ).toBeVisible();
    await expect(page.getByText('2 remaining')).toBeVisible();
    await page.goto(restoredProjectUrl);
    await openCreatorStep(page, 'Design');
    await page
      .getByLabel('Upload artwork for this event')
      .setInputFiles(validArtwork);
    await openCreatorReview(page);
    await expect(
      page.getByText('Artwork validated and applied to this event.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Save project' }).click();
    await expect(
      page.getByText('Project saved securely to your account.'),
    ).toBeVisible();
    await page.goto('/designs');
    await expect(
      page.getByText(/Event Pass artwork belongs to its saved event/u),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Save reusable preset' }),
    ).toHaveCount(0);
    await expectNoHorizontalPageOverflow(page);
  });
});

test.describe('professional design and AI promises', () => {
  test('US-11–12 cover mock subscriptions, four choices and preset CRUD', async ({
    page,
  }, testInfo) => {
    const persona = uniquePersona('professional-story', testInfo.project.name);
    await logInFromLanding(page, persona);
    await activateOffer(page, 'Planner Pro');
    await expect(page.getByText('0 / 25')).toBeVisible();
    await expect(page.getByText('10 remaining')).toBeVisible();
    await createSavedProject(page, 'Professional event');

    await page.goto('/designs');
    await page.getByLabel('Upload a 7:4 PNG or JPEG').setInputFiles({
      name: 'bounded-print-background.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        encode({
          width: 1820,
          height: 1040,
          channels: 4,
          data: new Uint8Array(1820 * 1040 * 4).fill(255),
        }),
      ),
    });
    await expect(page.getByText(/Artwork validated/u)).toBeVisible();
    await page.getByLabel('AI background description').fill('[fail] test');
    await page
      .getByRole('button', { name: /Generate four choices · 10 remaining/u })
      .click();
    await expect(page.getByText(/PROVIDER_UNAVAILABLE|failed/u)).toBeVisible({
      timeout: 60_000,
    });
    await expect(
      page.getByRole('button', {
        name: /Generate four choices · 10 remaining/u,
      }),
    ).toBeVisible();

    await page
      .getByLabel('AI background description')
      .fill('Simple watercolor foliage');
    await page
      .getByRole('button', { name: /Generate four choices · 10 remaining/u })
      .click();
    await expect(page.getByText('4 background choices are ready.')).toBeVisible(
      { timeout: 90_000 },
    );
    const aiChoices = page
      .locator('.asset-grid article')
      .filter({ hasText: 'AI background' });
    await expect(aiChoices).toHaveCount(4);
    await aiChoices
      .first()
      .getByRole('button', { name: 'Use for preset' })
      .click();
    await page.getByLabel('Name').fill('Botanical client style');
    await page.getByRole('button', { name: 'Save reusable preset' }).click();
    await expect(page.getByText('Reusable preset saved.')).toBeVisible();
    await page.getByText('Botanical client style').click();
    await page.getByLabel('Name').last().fill('Updated client style');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Preset changes saved.')).toBeVisible();

    await page.goto('/create');
    await openCreatorStep(page, 'Design');
    await expect(
      page.getByRole('button', { name: 'Updated client style' }),
    ).toBeVisible();
    await page.goto('/designs');
    await page.getByText('Updated client style').click();
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Preset deleted.')).toBeVisible();

    await activateOffer(page, 'Studio');
    await expect(page.getByText('1 / 100')).toBeVisible();
    await expect(page.getByText('30 remaining')).toBeVisible();
    await expect(page.getByText(/\/ 5/u)).toBeVisible();
    await expectNoHorizontalPageOverflow(page);
  });
});

test.describe('Studio accounts and teams', () => {
  test('US-13–18 cover invitations, roles, accounts and ownership transfer', async ({
    browser,
  }, testInfo) => {
    const ownerPersona = uniquePersona('studio-owner', testInfo.project.name);
    const memberPersona = uniquePersona('studio-member', testInfo.project.name);
    const ownerContext = await browser.newContext();
    const owner = await ownerContext.newPage();
    await logInFromLanding(owner, ownerPersona);
    await activateOffer(owner, 'Studio');
    await owner.goto('/settings/team');
    await expect(owner.getByRole('heading', { name: 'Team' })).toBeVisible();

    const memberContext = await browser.newContext();
    const member = await memberContext.newPage();
    await logInFromLanding(member, memberPersona);
    await createSavedProject(member, 'Private member event');

    await owner.getByLabel('Verified email').fill(memberPersona.email);
    await owner.getByRole('button', { name: 'Create invitation' }).click();
    const firstInvitationLink = await owner
      .getByLabel('One-time invitation link')
      .inputValue();
    await owner.getByRole('button', { name: 'Copy link' }).click();
    await expect(
      owner.getByText(/Invitation link copied|selected so you can copy/u),
    ).toBeVisible();
    await owner.getByRole('button', { name: 'Reissue' }).click();
    await expect(owner.getByText(/Invitation reissued/u)).toBeVisible();
    const invitationLink = await owner
      .getByLabel('One-time invitation link')
      .inputValue();
    expect(invitationLink).not.toBe(firstInvitationLink);
    const staleInvitation = await ownerContext.newPage();
    await staleInvitation.goto(firstInvitationLink);
    await expect(staleInvitation.getByText(/revoked/u)).toBeVisible();
    await staleInvitation.close();

    await member.goto(invitationLink);
    await expect(
      member.getByRole('heading', { name: 'Review your invitation' }),
    ).toBeVisible();
    await member.getByRole('button', { name: 'Accept invitation' }).click();
    await member.waitForURL(/\/projects$/u);
    await expect(member.getByText('Private member event')).toHaveCount(0);
    const accountSelector = member.getByLabel('Account').last();
    await expect(accountSelector.locator('option')).toHaveCount(3);
    const joinedAccountValue = await accountSelector.inputValue();
    const privateAccountValue = await accountSelector
      .locator('option')
      .evaluateAll(
        (options, current) =>
          options
            .map((option) => (option as HTMLOptionElement).value)
            .find((value) => value.length > 0 && value !== current) ?? '',
        joinedAccountValue,
      );
    await accountSelector.selectOption(privateAccountValue);
    await member.waitForURL(/\/projects$/u);
    await expect(member.getByText('Private member event')).toBeVisible();
    await member.getByLabel('Account').last().selectOption(joinedAccountValue);
    await member.waitForURL(/\/projects$/u);
    await expect(member.getByText('Private member event')).toHaveCount(0);

    await owner.reload();
    const memberRow = owner
      .locator('.member-row')
      .filter({ hasText: memberPersona.email });
    await expect(memberRow).toContainText('member');
    await member.goto('/settings/team');
    await expect(member.getByText(memberPersona.email)).toBeVisible();
    await expect(
      member.getByRole('button', { name: 'Create invitation' }),
    ).toHaveCount(0);
    await expect(member.getByRole('button', { name: 'Remove' })).toHaveCount(0);

    await owner.getByRole('button', { name: 'Make admin' }).click();
    await expect(owner.getByText('Member role updated.')).toBeVisible();
    await member.reload();
    await expect(
      member.getByRole('button', { name: 'Create invitation' }),
    ).toBeVisible();
    await expect(
      member.getByRole('button', { name: 'Transfer ownership' }),
    ).toHaveCount(0);

    await owner.reload();
    owner.once('dialog', (dialog) => void dialog.accept());
    await owner.getByRole('button', { name: 'Transfer ownership' }).click();
    await owner.waitForURL(`${TABLECARDS_AUTH_URL}/**`);
    await completeDevelopmentTransfer(
      owner,
      await findUserId(ownerPersona.email),
    );
    await owner.waitForURL(/\/settings\/team$/u);
    await expect(
      owner.getByText(ownerPersona.email).locator('..').locator('..'),
    ).toContainText('admin');
    await member.reload();
    await expect(
      member.getByText(memberPersona.email).locator('..').locator('..'),
    ).toContainText('owner');
    member.once('dialog', (dialog) => void dialog.accept());
    await member
      .locator('.member-row')
      .filter({ hasText: ownerPersona.email })
      .getByRole('button', { name: 'Remove' })
      .click();
    await expect(member.getByText('Member removed.')).toBeVisible();
    await expectNoHorizontalPageOverflow(member);

    await memberContext.close();
    await ownerContext.close();
  });
});

test('CSV upload remains readable by the hosted browser bundle', async ({
  page,
}) => {
  await page.goto('/create');
  await page.getByLabel('Upload CSV or XLSX').setInputFiles({
    name: 'guests.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Name,Table,Meal\nAda,1,Vegan\nGrace,2,Fish'),
  });
  await expect(
    page.getByRole('region', { name: 'Column mapping' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Use these columns' }).click();
  await expect(page.getByLabel('Event name')).toBeVisible();
  await openCreatorStep(page, 'Review');
  await expect(page.getByText(/2 cards · 2 PDF pages/u)).toBeVisible();
  await page.getByRole('button', { name: 'Next sheet' }).click();
  await expect(page.locator('.paper-preview')).toContainText(/Ada.*Grace/su);
  expect((await readFile(validArtwork)).length).toBeGreaterThan(0);
});
