import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { api } from '@bff/service-api';
import { expect, type Page } from '@playwright/test';
import { ConvexHttpClient } from 'convex/browser';
import {
  makeFunctionReference,
  type FunctionArgs,
  type FunctionReturnType,
} from 'convex/server';

import {
  TABLECARDS_AUTH_URL,
  TABLECARDS_WEB_URL,
} from '../../playwright.config';

const execFileAsync = promisify(execFile);
const bffSiteUrl = 'https://compassionate-buffalo-689.convex.site';
const sessionAdapterOrigin = 'https://api.tablecards-dev.tofler.app';
const bffDeploymentUrl = 'https://compassionate-buffalo-689.convex.cloud';
const environmentKey = 'tablecards-development';
const bffDeployment = 'compassionate-buffalo-689';
const backofficeDevelopmentUrl = 'https://ops-dev.tofler.tech/';

const setTestUserReference = makeFunctionReference<
  'mutation',
  FunctionArgs<typeof api.customerBackoffice.setTestUser>,
  FunctionReturnType<typeof api.customerBackoffice.setTestUser>
>('customerBackoffice:setTestUser');

const markedTestUsers = new WeakMap<Page, Set<string>>();

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
  await expect(
    page.getByRole('link', { name: 'Projects', exact: true }),
  ).toBeVisible();
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

/** Mark only the verified synthetic identity active in this development session. */
export async function markCurrentUserAsTestUser(page: Page): Promise<string> {
  if (TABLECARDS_WEB_URL !== 'https://tablecards-dev.tofler.app') {
    throw new Error(
      'Test-user checkout fixtures require the TableCards dev site.',
    );
  }
  if (new URL(page.url()).origin !== TABLECARDS_WEB_URL) {
    throw new Error(
      'Test-user checkout marking requires a signed-in TableCards dev page.',
    );
  }

  const contextResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.origin === sessionAdapterOrigin &&
      url.pathname === '/_tofler/auth/context' &&
      response.request().method() === 'POST'
    );
  });
  await page.reload();
  const response = await contextResponse;
  expect(response.ok()).toBe(true);
  const session = (await response.json()) as {
    customer?: {
      user?: {
        id?: string;
        verifiedEmail?: string;
        environmentKey?: string;
      };
    };
  };
  const user = session.customer?.user;
  expect(user?.id).toMatch(/^user_[A-Za-z0-9_-]+$/u);
  expect(user?.verifiedEmail).toMatch(/@example\.invalid$/u);
  expect(user?.environmentKey).toBe(environmentKey);

  const userId = user!.id!;
  const marked = markedTestUsers.get(page) ?? new Set<string>();
  if (marked.has(userId)) return userId;

  const { stdout } = await execFileAsync(
    process.execPath,
    [
      'node_modules/tsx/dist/cli.mjs',
      '--tsconfig',
      'tsconfig.base.json',
      'platform/bff/backoffice-e2e/src/mintDevelopmentAuthToken.ts',
      backofficeDevelopmentUrl,
    ],
    { cwd: process.cwd(), timeout: 30_000, maxBuffer: 8_192 },
  );
  const client = new ConvexHttpClient(bffDeploymentUrl);
  client.setAuth(stdout.trim());
  await client.mutation(setTestUserReference, {
    environmentKey,
    userPublicId: userId,
    isTestUser: true,
    expectedIsTestUser: false,
  });
  marked.add(userId);
  markedTestUsers.set(page, marked);
  return userId;
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
    await markCurrentUserAsTestUser(page);
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
