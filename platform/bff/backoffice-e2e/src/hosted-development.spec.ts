import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator } from '@playwright/test';
import { ConvexHttpClient } from 'convex/browser';
import type { api } from '@bff/service-api';
import {
  makeFunctionReference,
  type FunctionArgs,
  type FunctionReturnType,
} from 'convex/server';

import { HOSTED_DEVELOPMENT_BACKOFFICE_URL } from '../playwright.hosted-development.config';
import { mintDevelopmentAuthToken } from './developmentAuth';

// The published API alias is type-only; Node's test runner needs concrete
// function references, not the browser bundler's generated-module alias.
const customerDetailQuery = makeFunctionReference<
  'query',
  FunctionArgs<typeof api.operations.customerDetail>,
  FunctionReturnType<typeof api.operations.customerDetail>
>('operations:customerDetail');
const customersQuery = makeFunctionReference<
  'query',
  FunctionArgs<typeof api.customerBackoffice.users>,
  FunctionReturnType<typeof api.customerBackoffice.users>
>('customerBackoffice:users');
const overviewQuery = makeFunctionReference<
  'query',
  FunctionArgs<typeof api.operations.overview>,
  FunctionReturnType<typeof api.operations.overview>
>('operations:overview');

async function captureEventView(target: Locator, name: string) {
  if (process.env.BFF_EVENT_VISUAL_REVIEW !== 'true') return;
  // Screens contain only generic counters or the explicitly synthetic customer
  // asserted below. Never save a token, storage state or authentication trace.
  await mkdir('.playwright-cli', { recursive: true });
  await target.screenshot({
    path: `.playwright-cli/operator-events-${name}-${test.info().project.name}.png`,
  });
}

test.beforeEach(async ({ page }) => {
  const token = await mintDevelopmentAuthToken({
    audience: HOSTED_DEVELOPMENT_BACKOFFICE_URL,
  });
  await page.addInitScript((temporaryToken) => {
    (
      window as Window & {
        __BFF_DEVELOPMENT_AUTOMATION_TOKEN__?: string;
      }
    ).__BFF_DEVELOPMENT_AUTOMATION_TOKEN__ = temporaryToken;
  }, token);
});

test('loads the real protected development overview and scoped evidence', async ({
  page,
}) => {
  await page.goto('/index.development-auth.html');

  await expect(
    page.getByRole('heading', { name: 'Business overview' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Current support' }),
  ).toBeVisible();
  await page
    .getByLabel('Business / environment')
    .selectOption('tablecards-development');
  await expect(
    page.getByRole('heading', { name: 'TableCards', exact: true }),
  ).toBeVisible();
  const kpis = page.locator('.operator-panel').filter({
    has: page.getByRole('heading', { name: 'Business KPIs', exact: true }),
  });
  await expect(kpis.getByText('Last 7 days')).toBeVisible();
  for (const label of [
    'Active customers',
    'Project saves',
    'PDFs ready',
    'Export failures',
  ])
    await expect(
      kpis.getByRole('rowheader', { name: label, exact: true }),
    ).toBeVisible();
  await expect(kpis.getByRole('img')).toHaveCount(4);
  await expect(kpis.getByRole('img').first()).toHaveAccessibleName(
    /seven consecutive 24-hour counts/,
  );
  await captureEventView(kpis, 'overview');
  await expect(
    kpis.getByRole('link', { name: 'View recorded activity' }),
  ).toHaveAttribute('href', '/activity?environment=tablecards-development');
  await expect(
    page.getByRole('heading', { name: 'Waiting for us' }),
  ).toBeVisible();
  await expect(page.getByText('Access not enabled')).toHaveCount(0);
  await expect(page.getByText('Operator sign-in')).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
});

test('keeps the KPI overview usable with enlarged text and opens scoped investigation views', async ({
  page,
}) => {
  await page.goto('/index.development-auth.html');
  await page
    .getByLabel('Business / environment')
    .selectOption('tablecards-development');
  await expect(
    page.getByRole('heading', { name: 'Business KPIs' }),
  ).toBeVisible();
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page.evaluate(() =>
    document.documentElement.style.removeProperty('font-size'),
  );
  const navigation = page
    .getByRole('navigation', { name: /^(?:Mobile )?operator navigation$/i })
    .filter({ visible: true });
  for (const name of ['Customers', 'Activity', 'Bots']) {
    const link = navigation.getByRole('link', { name, exact: true });
    // Phone navigation puts Activity/Bots under More, while preserving scoped destinations.
    if ((await link.count()) === 0) {
      await navigation.getByRole('link', { name: 'More', exact: true }).click();
      await page
        .getByRole('link', {
          name: name === 'Bots' ? 'Bots and assigned knowledge' : name,
          exact: true,
        })
        .click();
    } else await link.click();
    await expect(
      page.getByRole('heading', {
        name: name === 'Bots' ? 'Bots and knowledge' : name,
        exact: true,
      }),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.get('environment')).toBe(
      'tablecards-development',
    );
  }
});

test('shows stored customer business events, properties and scoped history on desktop and phone', async ({
  page,
}) => {
  const customerId = process.env.BFF_EVENT_SMOKE_CUSTOMER_ID?.trim();
  expect(
    customerId,
    'Select an existing synthetic customer with reported product events via BFF_EVENT_SMOKE_CUSTOMER_ID.',
  ).toMatch(/^user_[A-Za-z0-9_-]+$/);
  const client = new ConvexHttpClient(
    'https://compassionate-buffalo-689.convex.cloud',
  );
  client.setAuth(
    await mintDevelopmentAuthToken({
      audience: HOSTED_DEVELOPMENT_BACKOFFICE_URL,
    }),
  );
  const detail = await client.query(customerDetailQuery, {
    environmentKey: 'tablecards-development',
    userPublicId: customerId!,
  });
  expect(detail.user.verifiedEmail).toMatch(/@example\.invalid$/);
  expect(detail.events.length).toBeGreaterThan(0);
  const event = detail.events.find(
    (item) => item.productReference && Object.keys(item.properties).length,
  )!;
  expect(
    event,
    'Use a real reported synthetic product outcome with properties and a reference.',
  ).toBeTruthy();

  await page.goto('/index.development-auth.html');
  await page
    .getByLabel('Business / environment')
    .selectOption('tablecards-development');
  const navigation = page
    .getByRole('navigation', { name: /^(?:Mobile )?operator navigation$/i })
    .filter({ visible: true });
  await navigation
    .getByRole('link', { name: 'Customers', exact: true })
    .click();
  await page.getByLabel('Exact email or public customer ID').fill(customerId!);
  await page
    .getByRole('button', { name: 'Find customer', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Business events', exact: true }),
  ).toBeVisible();
  const events = page.getByRole('list', {
    name: 'Business events',
    exact: true,
  });
  await expect(events.getByRole('listitem')).toHaveCount(detail.events.length);
  await expect(
    events.getByText(event.productReference!, { exact: true }).first(),
  ).toBeVisible();
  await expect(
    events.getByText(event.label, { exact: true }).first(),
  ).toBeVisible();
  const entry = events
    .getByRole('listitem')
    .filter({ has: page.getByText(event.productReference!, { exact: true }) })
    .first();
  for (const value of Object.values(event.properties))
    await expect(
      entry.getByText(String(value), { exact: true }).first(),
    ).toBeVisible();
  await captureEventView(
    page.locator('.operator-panel').filter({
      has: page.getByRole('heading', {
        name: 'Business events',
        exact: true,
      }),
    }),
    'customer',
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page
    .getByRole('link', { name: 'View all customer events', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Customer events', exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get('customer')).toBe(customerId);
  expect(new URL(page.url()).searchParams.get('environment')).toBe(
    'tablecards-development',
  );
  await expect(
    page.getByRole('list', { name: 'Business events' }),
  ).toContainText(event.productReference!);
  await page
    .getByRole('link', { name: 'Back to customer', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Business events', exact: true }),
  ).toBeVisible();

  // An old fixture with no linked events must show an empty state, not a
  // fabricated history assembled from other members or the environment seed.
  const customers = await client.query(customersQuery, {
    environmentKey: 'tablecards-development',
    paginationOpts: { cursor: null, numItems: 25 },
  });
  let emptyCustomer: string | undefined;
  for (const user of customers.page
    .filter((user) => user.verifiedEmail.endsWith('@example.invalid'))
    .slice(0, 5)) {
    const candidate = await client.query(customerDetailQuery, {
      environmentKey: 'tablecards-development',
      userPublicId: user.id,
    });
    if (candidate.events.length === 0) {
      emptyCustomer = user.id;
      break;
    }
  }
  expect(
    emptyCustomer,
    'The synthetic development baseline includes customers without reported events.',
  ).toBeTruthy();
  await page
    .getByLabel('Exact email or public customer ID')
    .fill(emptyCustomer!);
  await page
    .getByRole('button', { name: 'Find customer', exact: true })
    .click();
  await expect(
    page.getByText(/No business events linked to this view yet/),
  ).toBeVisible();
  await expect(page.getByRole('list', { name: 'Business events' })).toHaveCount(
    0,
  );
  const anotherScope = (
    await client.query(overviewQuery, {})
  ).environments.find((scope) => scope.key !== 'tablecards-development');
  expect(
    anotherScope,
    'The registered development baseline includes another Business environment.',
  ).toBeTruthy();
  await page
    .getByLabel('Business / environment')
    .selectOption(anotherScope!.key);
  expect(new URL(page.url()).searchParams.has('customer')).toBe(false);
  await expect(
    page.getByRole('heading', { name: 'Business events', exact: true }),
  ).toHaveCount(0);
});

test('reviews an exact synthetic reply, sends only by operator decision and records a private note', async ({
  page,
}) => {
  await page.goto('/index.development-auth.html');
  await expect(
    page.getByRole('heading', { name: 'Business overview' }),
  ).toBeVisible();
  await page
    .getByLabel('Business / environment')
    .selectOption('tablecards-development');
  const navigation = page
    .getByRole('navigation', { name: /^(?:Mobile )?operator navigation$/i })
    .filter({ visible: true });
  await navigation.getByRole('link', { name: 'Support', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Support', exact: true }),
  ).toBeVisible();
  // A wrapping label's text includes its native select options in getByLabel.
  await page.getByLabel('Show').selectOption('all');
  await page
    .getByRole('link', {
      name: 'Cards come out smaller than the preview',
      exact: true,
    })
    .click();
  const text = `Synthetic hosted reply check ${Date.now()}. Please print at actual size.`;
  await page
    .getByRole('textbox', {
      name: 'Message to mara@tablecards.example.invalid',
      exact: true,
    })
    .fill(text);
  await page.getByRole('button', { name: 'Review reply', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Review exact reply' }),
  ).toBeVisible();
  await expect(page.locator('.operator-email-preview')).toContainText(text);
  await expect(
    page.getByRole('button', { name: 'Send reply', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Send reply', exact: true }).click();
  await expect(page.getByText(/Reply approved and queued/)).toBeVisible();
  await page.getByText('Email delivery history', { exact: true }).click();
  await expect(
    page.getByText(/Development mock: this email was not sent/).first(),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Add internal note', exact: true })
    .click();
  const note = `Synthetic operator-only note ${Date.now()}`;
  await page
    .getByLabel('Internal note · only operators can see this')
    .fill(note);
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Case history' })).toContainText(
    note,
  );
});
