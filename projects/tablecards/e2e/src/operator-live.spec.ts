import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { expect, test, type Locator } from '@playwright/test';
import { TABLECARDS_WEB_URL } from '../playwright.config';
import { expectNoHorizontalPageOverflow } from './support/hosted';

const execFileAsync = promisify(execFile);
const deployment = 'compassionate-buffalo-689';

test.beforeAll(async () => {
  for (const [name, required] of [
    ['BFF_OPERATIONS_AI_MODE', 'live'],
    ['BFF_OPERATIONS_CAPS_VERIFIED', 'verified'],
  ] as const) {
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        'node_modules/convex/bin/main.js',
        'env',
        'get',
        name,
        '--deployment-name',
        deployment,
      ],
      { cwd: process.cwd(), timeout: 30_000, maxBuffer: 16_384 },
    );
    if (stdout.trim() !== required)
      throw new Error(
        `Live helper preflight failed: ${name} is not enabled on the development backend.`,
      );
  }
});

async function ask(dialog: Locator, question: string) {
  await dialog.getByLabel('Your question').fill(question);
  await dialog
    .getByRole('button', { name: 'Send question', exact: true })
    .click();
  await expect(dialog.getByText('Preparing an answer…')).toHaveCount(0, {
    timeout: 60_000,
  });
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  await expect(
    dialog.locator('li.answer').last().locator('p').first(),
  ).toContainText(/\S/u);
}

test('a lost real printing response recovers the same saved answer without another AI attempt', async ({
  page,
}, testInfo) => {
  let posts = 0;
  let originalStream = '';
  let conversationId = '';
  let firstQuestionId = '';
  let firstCapability = '';
  let replayMatched = false;
  await page.route('**/v1/operations/helper*', async (route) => {
    if (route.request().method() !== 'POST') return await route.continue();
    posts += 1;
    if (posts > 2) return await route.abort();
    const body = route.request().postDataJSON();
    const response = await route.fetch({ timeout: 65_000 });
    if (posts === 1) {
      expect(response.status()).toBe(200);
      originalStream = await response.text();
      const chunks = originalStream
        .split('\n')
        .filter((line) => line.startsWith('data: {'))
        .map((line) => JSON.parse(line.slice(6)));
      const session = chunks.find(
        (chunk) => chunk.type === 'data-session',
      )?.data;
      expect(session?.mocked).toBe(false);
      expect(
        chunks.some(
          (chunk) =>
            chunk.type === 'text-delta' &&
            /100\s*%|actual size/iu.test(chunk.delta),
        ),
      ).toBe(true);
      conversationId = session.conversationId;
      firstQuestionId = body.message.id;
      firstCapability = body.capability;
      // Lose the delivered response only AFTER real inference saved an answer.
      // Never retain stream/capability values in reports, traces or screenshots.
      return await route.fulfill({
        response,
        status: 503,
        contentType: 'application/json',
        body: '{"error":{"code":"SYNTHETIC_LOST_RESPONSE"}}',
      });
    }
    expect(body.message.id === firstQuestionId).toBe(true);
    expect(body.capability === firstCapability).toBe(true);
    expect(response.status()).toBe(200);
    replayMatched = (await response.text()) === originalStream;
    await route.fulfill({ response });
  });
  await page.goto('/');
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Log in', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'TableCards Help' });
  await dialog
    .getByRole('button', {
      name: 'How do I print at the right size?',
      exact: true,
    })
    .click();
  await expect(dialog.getByRole('alert')).toContainText(
    'Your message is still here',
    { timeout: 65_000 },
  );
  await dialog
    .getByRole('button', { name: 'Retry answer', exact: true })
    .click();
  await expect(dialog.locator('li.answer .bff-helper-message')).toContainText(
    /100\s*%|actual size/iu,
    { timeout: 35_000 },
  );
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  await expect(dialog.locator('li.customer')).toHaveCount(1);
  await expect(dialog.locator('li.answer')).toHaveCount(1);
  expect(posts).toBe(2);
  expect(replayMatched).toBe(true);
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      'node_modules/convex/bin/main.js',
      'run',
      '--deployment',
      deployment,
      '--inline-query',
      `
      const e=await ctx.db.query("businessEnvironments").withIndex("by_key",q=>q.eq("key","tablecards-development")).unique();
      const c=await ctx.db.query("conversations").withIndex("by_environment_public_id",q=>q.eq("environmentId",e._id).eq("publicId",${JSON.stringify(conversationId)})).unique();
      const runs=await ctx.db.query("botRuns").withIndex("by_conversation_started_at",q=>q.eq("conversationId",c._id)).take(10);
      const entries=await ctx.db.query("conversationEntries").withIndex("by_conversation_created_at",q=>q.eq("conversationId",c._id)).take(10);
      return {runs:runs.length,attempts:runs.reduce((n,r)=>n+r.attempts.length,0),completed:runs.every(r=>r.state==="completed"),questions:entries.filter(e=>e.kind==="customer_message").length,answers:entries.filter(e=>e.kind==="bot_answer").length};
    `,
    ],
    { cwd: process.cwd(), timeout: 30_000, maxBuffer: 8_192 },
  );
  expect(JSON.parse(stdout)).toEqual({
    runs: 1,
    attempts: 1,
    completed: true,
    questions: 1,
    answers: 1,
  });
  await expectNoHorizontalPageOverflow(page);
  await page.screenshot({
    path: `.playwright-cli/printing-recovered-${testInfo.project.name}.png`,
  });
});

test('real helper answers and a correlated browser tool preserve customer-chosen navigation', async ({
  page,
}) => {
  let posts = 0;
  let browserResults = 0;
  // Read a clone in the browser: Chromium can discard streamed response bodies
  // before Playwright's out-of-process response.text() retrieves them.
  await page.addInitScript(() => {
    const observations: Array<{ ok: boolean; live: boolean }> = [];
    Object.defineProperty(window, '__liveHelperEvidence', {
      value: observations,
    });
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (
        args[1]?.method === 'POST' &&
        new URL(response.url).pathname === '/v1/operations/helper'
      ) {
        void response
          .clone()
          .text()
          .then((text) => {
            const data = text
              .split('\n')
              .filter((line) => line.startsWith('data: {'))
              .map(
                (line) => JSON.parse(line.slice(6)) as Record<string, unknown>,
              )
              .find((part) => part.type === 'data-session')?.data;
            // Retain booleans only, not streams or anonymous capabilities.
            observations.push({
              ok: response.ok,
              live:
                typeof data === 'object' &&
                data !== null &&
                'mocked' in data &&
                data.mocked === false,
            });
          })
          .catch(() => observations.push({ ok: false, live: false }));
      }
      return response;
    };
  });
  // This is a safety fence, not a mocked response. All allowed requests use the
  // deployed backend; excess continuations are aborted before further spending.
  await page.route('**/v1/operations/helper*', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') return await route.continue();
    posts += 1;
    const body = request.postDataJSON() as Record<string, unknown>;
    if (Array.isArray(body.toolResults) && body.toolResults.length)
      browserResults += 1;
    if (posts > 6) return await route.abort();
    return await route.continue();
  });
  await page.goto('/');
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Log in', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'TableCards Help' });
  await expect(dialog.getByLabel('Your question')).toBeEnabled();
  const original = page.url();
  await ask(
    dialog,
    'My printed cards come out too small. What print setting should I use?',
  );
  await expect(dialog.locator('li.answer').last()).toContainText(
    /100\s*%|actual size/iu,
  );
  await ask(
    dialog,
    'Where are your frequently asked questions? Please show me a clickable link.',
  );
  const offered = dialog
    .locator('li.answer')
    .last()
    .locator('.bff-helper-offered-link')
    .getByRole('link', { name: 'Frequently asked questions', exact: true });
  await expect(offered).toBeVisible();
  await expect(offered).toHaveAttribute('href', '/#faq');
  await expect(
    dialog.getByText('Did this help?', { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText('Preparing an answer…')).toHaveCount(0);
  expect(page.url()).toBe(original);
  await expectNoHorizontalPageOverflow(page);
  await expect(dialog.getByText(/Development mock/u)).toHaveCount(0);
  await page.screenshot({
    path: `.playwright-cli/gemma-jev-helper-${test.info().project.name}.png`,
  });
  expect(posts).toBeLessThanOrEqual(6);
  expect(browserResults).toBeGreaterThan(0);
  const readEvidence = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            __liveHelperEvidence: Array<{ ok: boolean; live: boolean }>;
          }
        ).__liveHelperEvidence,
    );
  await expect.poll(async () => (await readEvidence()).length).toBe(posts);
  const evidence = await readEvidence();
  expect(evidence.length).toBeGreaterThanOrEqual(3);
  expect(evidence).toEqual(evidence.map(() => ({ ok: true, live: true })));
  await dialog.getByRole('button', { name: 'Yes', exact: true }).click();
  await expect(dialog.getByText('Thanks for the feedback.')).toBeVisible();
  await offered.click();
  await expect(page).toHaveURL(`${TABLECARDS_WEB_URL}/#faq`);
  await expect(dialog).not.toBeVisible();
});

test('real support generation stays a suggested draft until an operator chooses Send', async ({
  context,
}, testInfo) => {
  const subject = process.env.BFF_LIVE_SUPPORT_CASE_SUBJECT;
  if (!subject || !subject.startsWith('Synthetic Gemma-Jev checkpoint '))
    throw new Error(
      'Provide the exact subject of the authorized synthetic incoming-email case.',
    );

  const inspect = async () => {
    const query = `
      const e=await ctx.db.query("businessEnvironments")
        .withIndex("by_key",q=>q.eq("key","tablecards-development")).unique();
      const cs=await ctx.db.query("conversations")
        .withIndex("by_environment_kind_updated_at",q=>q.eq("environmentId",e._id).eq("kind","support"))
        .order("desc").take(30);
      const c=cs.find(c=>c.subject===${JSON.stringify(subject)});
      if(!c)return null;
      const runs=await ctx.db.query("botRuns")
        .withIndex("by_conversation_started_at",q=>q.eq("conversationId",c._id)).order("desc").take(1);
      const deliveries=await ctx.db.query("emailDeliveries")
        .withIndex("by_conversation_created_at",q=>q.eq("conversationId",c._id)).take(10);
      return {draft:c.currentDraft?.text,contactEmail:c.contactEmail,runState:runs[0]?.state,
        model:runs[0]?.model,botVersion:runs[0]?.botVersion,evidence:runs[0]?.toolUsage,
        replyDeliveries:deliveries.filter(d=>d.purpose==="reply").length,
        receiptLive:deliveries.some(d=>d.purpose==="receipt"&&d.mocked===false&&["accepted","delivered"].includes(d.state))};
    `;
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        'node_modules/convex/bin/main.js',
        'run',
        '--deployment',
        deployment,
        '--inline-query',
        query,
      ],
      { cwd: process.cwd(), timeout: 30_000, maxBuffer: 16_384 },
    );
    return JSON.parse(stdout) as null | {
      draft?: string;
      contactEmail: string;
      runState?: string;
      model?: string;
      botVersion?: number;
      evidence?: string[];
      replyDeliveries: number;
      receiptLive: boolean;
    };
  };
  await expect
    .poll(async () => (await inspect())?.runState, { timeout: 90_000 })
    .toBe('completed');
  const saved = (await inspect())!;
  const email = saved.contactEmail;
  expect(saved.model).toBe('gemma4-26b');
  expect(saved.botVersion).toBe(6);
  expect(saved.draft).toMatch(/100\s*%|actual size/iu);
  expect(
    saved.evidence?.some((label) => label.startsWith('selection_model:')),
  ).toBe(true);
  expect(
    saved.evidence?.filter((label) => /^selection_calls:[^:]+:1$/u.test(label)),
  ).toHaveLength(1);
  expect(saved.replyDeliveries).toBe(0);
  await expect
    .poll(async () => (await inspect())?.receiptLive, { timeout: 45_000 })
    .toBe(true);

  const operator = await context.newPage();
  const { stdout: tokenOutput } = await execFileAsync(
    process.execPath,
    [
      'node_modules/tsx/dist/cli.mjs',
      '--tsconfig',
      'tsconfig.base.json',
      'platform/bff/backoffice-e2e/src/mintDevelopmentAuthToken.ts',
      'https://ops-dev.tofler.tech/',
    ],
    { cwd: process.cwd(), timeout: 30_000, maxBuffer: 8_192 },
  );
  const token = tokenOutput.trim();
  await operator.addInitScript((temporaryToken) => {
    (
      window as Window & { __BFF_DEVELOPMENT_AUTOMATION_TOKEN__?: string }
    ).__BFF_DEVELOPMENT_AUTOMATION_TOKEN__ = temporaryToken;
  }, token);
  await operator.goto(
    'https://ops-dev.tofler.tech/index.development-auth.html',
  );
  await operator
    .getByLabel('Business / environment')
    .selectOption('tablecards-development');
  const navigation = operator
    .getByRole('navigation', { name: /^(?:Mobile )?operator navigation$/iu })
    .filter({ visible: true });
  await navigation.getByRole('link', { name: 'Support', exact: true }).click();
  await operator.getByLabel('Show').selectOption('all');
  await operator.getByRole('link', { name: subject, exact: true }).click();
  const editor = operator.getByRole('textbox', {
    name: `Message to ${email}`,
    exact: true,
  });
  await expect(editor).toHaveValue(saved.draft!);
  // Capture the synthetic draft before review creates opaque reply/feedback
  // routing values. Never put those capabilities into a screenshot.
  await editor.screenshot({
    path: `.playwright-cli/gemma-jev-support-${testInfo.project.name}.png`,
  });
  await operator
    .getByRole('button', { name: 'Review reply', exact: true })
    .click();
  await expect(
    operator.getByRole('heading', { name: 'Review exact reply' }),
  ).toBeVisible();
  await expect(
    operator.getByRole('button', { name: 'Send reply', exact: true }),
  ).toBeEnabled();
  // Deliberately do not click Send: reviewing a real suggestion is not approval.
  expect((await inspect())?.replyDeliveries).toBe(0);
  await expectNoHorizontalPageOverflow(operator);
  await operator.close();
});
