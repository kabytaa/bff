import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { expect, type Page } from '@playwright/test';

import {
  TABLECARDS_AUTH_URL,
  TABLECARDS_WEB_URL,
} from '../../playwright.config';

const execFileAsync = promisify(execFile);
const bffSiteUrl = 'https://compassionate-buffalo-689.convex.site';
const environmentKey = 'tablecards-development';
const bffDeployment = 'compassionate-buffalo-689';

export interface Persona {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
}

export function uniquePersona(prefix: string, projectName: string): Persona {
  const safeProject = projectName.toLowerCase().replace(/[^a-z0-9]+/gu, '-');
  const id = `${prefix}-${safeProject}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    email: `${id}@example.invalid`,
    displayName: `TableCards ${id}`,
  };
}

export async function runOperator<T>(args: readonly string[]): Promise<T> {
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      'node_modules/tsx/dist/cli.mjs',
      '--tsconfig',
      'tsconfig.base.json',
      'tools/bff-operator/src/main.ts',
      ...args,
    ],
    { cwd: process.cwd(), maxBuffer: 1024 * 1024 },
  );
  const jsonStart = stdout.indexOf('{');
  if (jsonStart < 0) throw new Error('The operator response was not JSON.');
  return JSON.parse(stdout.slice(jsonStart)) as T;
}

async function mintDevelopmentGrant(
  transactionReference: string,
  target:
    | {
        readonly capability: 'signup';
        readonly personaId: string;
        readonly profile: {
          readonly verifiedEmail: string;
          readonly displayName: string;
        };
      }
    | {
        readonly capability: 'ownership_transfer';
        readonly userId: string;
      },
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
        target,
      }),
    ],
    { cwd: process.cwd(), maxBuffer: 32 * 1024 },
  );
  return stdout.trim();
}

export async function completeDevelopmentLogin(
  page: Page,
  persona: Persona,
): Promise<void> {
  const authUrl = new URL(page.url());
  const transaction = authUrl.searchParams.get('transaction');
  expect(transaction).toMatch(/^[A-Za-z0-9_-]{16,128}$/u);
  const grant = await mintDevelopmentGrant(transaction as string, {
    capability: 'signup',
    personaId: persona.id,
    profile: {
      verifiedEmail: persona.email,
      displayName: persona.displayName,
    },
  });
  await completeDevelopmentAuthorization(page, authUrl, grant);
}

export async function completeDevelopmentTransfer(
  page: Page,
  userId: string,
): Promise<void> {
  const authUrl = new URL(page.url());
  const transaction = authUrl.searchParams.get('transaction');
  expect(transaction).toMatch(/^[A-Za-z0-9_-]{16,128}$/u);
  const grant = await mintDevelopmentGrant(transaction as string, {
    capability: 'ownership_transfer',
    userId,
  });
  await completeDevelopmentAuthorization(page, authUrl, grant);
}

async function completeDevelopmentAuthorization(
  page: Page,
  authUrl: URL,
  grant: string,
): Promise<void> {
  await page.addInitScript((developmentGrant) => {
    (
      window as Window & { __BFF_CUSTOMER_DEVELOPMENT_GRANT__?: string }
    ).__BFF_CUSTOMER_DEVELOPMENT_GRANT__ = developmentGrant;
  }, grant);
  const entry = new URL('/index.development-auth.html', TABLECARDS_AUTH_URL);
  entry.search = authUrl.search;
  await page.goto(entry.href);
  await page.waitForURL(`${TABLECARDS_WEB_URL}/**`);
}

export async function logInFromLanding(
  page: Page,
  persona: Persona,
): Promise<void> {
  await page.goto('/');
  const login = page.getByRole('link', { name: 'Log in' }).last();
  await expect(login).toBeVisible();
  await login.click();
  await page.waitForURL(`${TABLECARDS_AUTH_URL}/**`);
  await completeDevelopmentLogin(page, persona);
  await expect(page.getByRole('link', { name: 'Projects' })).toBeVisible();
}

async function paginatedOperatorFind<T>(
  command: 'list-customer-memberships' | 'list-customer-users',
  predicate: (item: T) => boolean,
): Promise<T> {
  let cursor: string | undefined;
  for (let pageNumber = 0; pageNumber < 30; pageNumber += 1) {
    const response = await runOperator<{
      isDone: boolean;
      continueCursor: string;
      page: T[];
    }>([
      command,
      '--deployment',
      bffDeployment,
      '--key',
      environmentKey,
      '--limit',
      '50',
      ...(cursor === undefined ? [] : ['--cursor', cursor]),
      '--confirm-cloud',
    ]);
    const result = response.page.find(predicate);
    if (result) return result;
    if (response.isDone) break;
    cursor = response.continueCursor;
  }
  throw new Error(`${command} did not return the expected record.`);
}

export async function findOwnerAccountId(email: string): Promise<string> {
  const membership = await paginatedOperatorFind<{
    accountId: string;
    role: string;
    userVerifiedEmail: string;
  }>(
    'list-customer-memberships',
    (candidate) =>
      candidate.role === 'owner' && candidate.userVerifiedEmail === email,
  );
  return membership.accountId;
}

export async function findUserId(email: string): Promise<string> {
  const user = await paginatedOperatorFind<{
    id: string;
    verifiedEmail: string;
  }>('list-customer-users', (candidate) => candidate.verifiedEmail === email);
  return user.id;
}

export async function expectNoHorizontalPageOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

export async function chooseDevelopmentOffer(
  page: Page,
  offerName: 'Event Pass' | 'Free' | 'Planner Pro' | 'Studio',
): Promise<void> {
  const offerIds = {
    'Event Pass': 'event_pass',
    Free: 'free',
    'Planner Pro': 'planner_pro',
    Studio: 'studio',
  } as const;
  if (offerName === 'Free') {
    await page.goto('/settings');
  } else {
    await page.goto(`/settings?offer=${offerIds[offerName]}`);
    await page.waitForURL(/auth-dev\.tofler\.app\/checkout/u);
    await expect(page.getByRole('heading', { name: offerName })).toBeVisible();
    await page.getByRole('button', { name: 'Complete test payment' }).click();
    await page.waitForURL(/\/settings\?checkout=success/u);
    await expect(
      page.getByText('Your access was updated successfully.'),
    ).toBeVisible();
  }
  await expect(
    page.getByText(offerName, { exact: true }).first(),
  ).toBeVisible();
}
