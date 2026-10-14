import { expect, test, type Locator, type Page } from '@playwright/test';
import { TABLECARDS_WEB_URL } from '../playwright.config';
import {
  expectNoHorizontalPageOverflow,
  logInFromLanding,
  uniquePersona,
} from './support/hosted';

async function openHelp(page: Page): Promise<Locator> {
  // The auth provider transitions once after its initial cookie probe. Wait
  // for an actual signed-out or authenticated navigation control before opening.
  await expect(
    page
      .getByRole('link', { name: /^(Log in|Log in with Google|Projects)$/u })
      .first(),
  ).toBeVisible();
  const help = page.getByRole('button', { name: 'Help', exact: true });
  await expect(help).toBeVisible();
  await help.click();
  const dialog = page.getByRole('dialog', {
    name: 'TableCards Help',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Your question')).toBeEnabled();
  return dialog;
}
async function askMock(page: Page, question: string): Promise<Locator> {
  const dialog = await openHelp(page);
  await dialog.getByLabel('Your question').fill(question);
  await dialog
    .getByRole('button', { name: 'Send question', exact: true })
    .click();
  await expect(
    dialog.getByText(
      'Development mock · responses are synthetic, not live AI.',
    ),
  ).toBeVisible();
  await expect(
    dialog.getByText(
      '[Development mock] Your message has been recorded. A person can review it and help with the next step.',
      { exact: true },
    ),
  ).toBeVisible();
  return dialog;
}
async function expectContained(page: Page, dialog: Locator) {
  await expectNoHorizontalPageOverflow(page);
  const bounds = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: document.documentElement.clientWidth,
      height: window.innerHeight,
    };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(-1);
  expect(bounds.right).toBeLessThanOrEqual(bounds.width + 1);
  expect(bounds.top).toBeGreaterThanOrEqual(-1);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.height + 1);
}

// These transport fixtures verify UI states, not model quality, and cannot
// send emails or make paid inference calls. Keep the mock notice visible.
function chatFixture(answer: string) {
  return (
    [
      { type: 'start', messageId: `layout-answer-${crypto.randomUUID()}` },
      {
        type: 'data-session',
        data: { conversationId: 'synthetic-layout', mocked: true },
        transient: true,
      },
      { type: 'text-start', id: 'layout-text' },
      { type: 'text-delta', id: 'layout-text', delta: answer },
      { type: 'text-end', id: 'layout-text' },
      { type: 'finish', finishReason: 'stop' },
    ]
      .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
      .join('') + 'data: [DONE]\n\n'
  );
}

test.beforeEach(async ({ page }) => {
  // Ordinary hosted UI checks never depend on the deployed inference/mail
  // mode. Per-test protocol fixtures registered later override this default.
  await page.route('**/v1/operations/**', async (route) => {
    if (route.request().method() !== 'POST') return await route.continue();
    const path = new URL(route.request().url()).pathname;
    if (path === '/v1/operations/helper')
      return await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'x-vercel-ai-ui-message-stream': 'v1',
        },
        body: chatFixture(
          '[Development mock] Your message has been recorded. A person can review it and help with the next step.',
        ),
      });
    if (path === '/v1/operations/contact')
      return await route.fulfill({
        status: 200,
        json: {
          conversationId: 'synthetic-contact',
          reference: 'synthetic-contact',
          contactEmail: 'synthetic@example.invalid',
          receiptState: 'mocked',
        },
      });
    if (path === '/v1/operations/feedback')
      return await route.fulfill({ status: 200, json: {} });
    // A newly added action must be mocked explicitly, not accidentally sent.
    return await route.abort();
  });
});

test('Hebrew and mixed-language chat blocks keep their own direction', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/v1/operations/helper*', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    calls += 1;
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'x-vercel-ai-ui-message-stream': 'v1',
      },
      body: chatFixture(
        '## איך מתחילים?\n\n**TableCards** מאפשר ליצור כרטיסי הושבה ולהוריד קובץ PDF.\n\n1. הוסיפו שמות ובחרו עיצוב.\n2. הדפיסו ב־`100%` ולא Fit to Page.\n\n[פתיחת העורך](/create)\n\nEnglish product names stay unchanged.',
      ),
    });
  });
  await page.goto('/');
  const dialog = await openHelp(page);
  const question = dialog.getByLabel('Your question');
  await question.fill('איך זה עובד?');
  await expect(question).toHaveAttribute('dir', 'auto');
  expect(await question.evaluate((e) => getComputedStyle(e).direction)).toBe(
    'rtl',
  );
  await dialog
    .getByRole('button', { name: 'Send question', exact: true })
    .click();
  const answer = dialog.locator('li.answer .bff-helper-message').last();
  const hebrew = answer.getByText('מאפשר ליצור כרטיסי הושבה', { exact: false });
  await expect(hebrew).toBeVisible();
  expect(await hebrew.evaluate((e) => getComputedStyle(e).direction)).toBe(
    'rtl',
  );
  expect(await hebrew.evaluate((e) => getComputedStyle(e).textAlign)).toBe(
    'start',
  );
  expect(
    await answer.locator('ol').evaluate((e) => getComputedStyle(e).direction),
  ).toBe('rtl');
  const english = answer.getByText('English product names stay unchanged.', {
    exact: true,
  });
  expect(await english.evaluate((e) => getComputedStyle(e).direction)).toBe(
    'ltr',
  );
  expect(
    await dialog
      .locator('li.customer .bff-helper-message')
      .evaluate((e) => getComputedStyle(e).direction),
  ).toBe('rtl');
  await expect(answer.locator('bdi a[href="/create"]')).toHaveCount(1);
  expect(
    await answer.locator('code').evaluate((e) => getComputedStyle(e).direction),
  ).toBe('ltr');
  await question.fill('Another question in English');
  expect(await question.evaluate((e) => getComputedStyle(e).direction)).toBe(
    'ltr',
  );
  await expectContained(page, dialog);
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await expectContained(page, dialog);
  const composer = await dialog.locator('.bff-helper-composer').boundingBox();
  const surface = await dialog.boundingBox();
  expect(composer!.y + composer!.height).toBeLessThanOrEqual(
    surface!.y + surface!.height,
  );
  expect(calls).toBe(1);
});

test('assistant Markdown is formatted, safe and contained on desktop and phone', async ({
  page,
}) => {
  const answer = [
    '## Print at the right size',
    '',
    '1. **Use Actual Size (100%)** rather than *Fit to Page*.',
    '2. Check the `print-test PDF` before printing everything.',
    '',
    '- Match your paper size.',
    '- Preview the cards.',
    '',
    '> Start with one test sheet.',
    '',
    '| Setting | Value |',
    '| --- | --- |',
    `| Long preview label | ${'preview-'.repeat(30)} |`,
    '',
    '```text',
    'print-at-actual-size-'.repeat(25),
    '```',
    '',
    '<script>window.untrustedMarkdown = true</script>',
    '![Tracker](https://untrusted.example.invalid/pixel)',
    '[Unsafe](javascript:alert%281%29)',
    '[External](https://untrusted.example.invalid)',
    '[Read the FAQ](/#faq)',
  ].join('\n');
  let calls = 0;
  const remoteRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('untrusted.example.invalid'))
      remoteRequests.push(request.url());
  });
  await page.route('**/v1/operations/helper*', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    calls += 1;
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'x-vercel-ai-ui-message-stream': 'v1',
      },
      body: chatFixture(answer),
    });
  });
  await page.goto('/');
  const dialog = await openHelp(page);
  const original = page.url();
  await dialog
    .getByLabel('Your question')
    .fill('**A literal customer question**');
  await dialog
    .getByRole('button', { name: 'Send question', exact: true })
    .click();
  const message = dialog.locator('li.answer .bff-helper-message').last();
  await expect(
    message.getByRole('heading', { name: 'Print at the right size' }),
  ).toBeVisible();
  await expect(message.locator('strong')).toHaveText('Use Actual Size (100%)');
  await expect(message.locator('ol > li')).toHaveCount(2);
  await expect(message.locator('ul > li')).toHaveCount(2);
  await expect(message.getByRole('table')).toBeVisible();
  await expect(message.locator('pre > code')).toContainText(
    'print-at-actual-size',
  );
  await expect(message.locator('img, script, iframe')).toHaveCount(0);
  await expect(message.getByRole('link')).toHaveCount(1);
  expect(await message.textContent()).not.toContain('**');
  await expect(dialog.locator('li.customer .bff-helper-message')).toHaveText(
    '**A literal customer question**',
  );
  await expect(
    dialog.locator('li.customer .bff-helper-message strong'),
  ).toHaveCount(0);
  const boldStyle = await message.locator('strong').evaluate((element) => ({
    weight: getComputedStyle(element).fontWeight,
    size: getComputedStyle(element).fontSize,
    parentSize: getComputedStyle(element.parentElement!).fontSize,
  }));
  expect(Number(boldStyle.weight)).toBeGreaterThanOrEqual(600);
  expect(boldStyle.size).toBe(boldStyle.parentSize);
  await expectContained(page, dialog);
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await expectContained(page, dialog);
  await expect(dialog.locator('.bff-helper-composer')).toBeVisible();
  expect(page.url()).toBe(original);
  expect(remoteRequests).toEqual([]);
  expect(calls).toBe(1);
  await message
    .getByRole('link', { name: 'Frequently asked questions', exact: true })
    .click();
  await expect(page).toHaveURL(`${TABLECARDS_WEB_URL}/#faq`);
  await expect(dialog).not.toBeVisible();
});

test('pricing tool continuations show one answer bubble and one destination link', async ({
  page,
}) => {
  let calls = 0;
  let browserResults = 0;
  await page.route('**/v1/operations/helper*', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    calls += 1;
    const body = route.request().postDataJSON() as Record<string, unknown>;
    if (Array.isArray(body.toolResults) && body.toolResults.length)
      browserResults += 1;
    const chunks = [
      { type: 'start', messageId: 'synthetic-price-tool' },
      {
        type: 'data-session',
        data: { conversationId: 'synthetic-pricing', mocked: true },
        transient: true,
      },
      {
        type: 'tool-input-available',
        toolCallId: 'pricing-call',
        toolName: 'open_pricing',
        input: {},
      },
      { type: 'finish', finishReason: 'tool-calls' },
    ];
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'x-vercel-ai-ui-message-stream': 'v1',
      },
      body:
        calls === 1
          ? chunks
              .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
              .join('') + 'data: [DONE]\n\n'
          : chatFixture(
              'Price details are on our **Plans and preview access** page.\n\n[Plans and preview access](/#pricing)\n\n[See pricing](/#pricing)',
            ),
    });
  });
  await page.goto('/');
  const dialog = await openHelp(page);
  await dialog.getByLabel('Your question').fill('What does it cost?');
  await dialog
    .getByRole('button', { name: 'Send question', exact: true })
    .click();
  await expect(
    dialog.getByText('Did this help?', { exact: true }),
  ).toBeVisible();
  await expect(dialog.locator('li.answer')).toHaveCount(1);
  const answer = dialog.locator('li.answer');
  await expect(answer.locator('a[href="/#pricing"]')).toHaveCount(1);
  await expect(answer.locator('.bff-helper-markdown p')).toHaveCount(1);
  await expect(answer.getByText('See pricing', { exact: true })).toHaveCount(0);
  await expect(answer.locator('strong')).toHaveCount(2); // sender and formatted emphasis
  await expect(answer.getByText('Preparing an answer…')).toHaveCount(0);
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  expect(calls).toBe(2);
  expect(browserResults).toBe(1);
  await expectContained(page, dialog);
  await answer
    .getByRole('link', { name: 'Plans and preview access', exact: true })
    .click();
  await expect(page).toHaveURL(`${TABLECARDS_WEB_URL}/#pricing`);
  await expect(dialog).not.toBeVisible();
});

test('modern chat keeps composer visible, preserves the next draft and respects reading position', async ({
  page,
}) => {
  const releases: Array<() => void> = [];
  let calls = 0;
  const answer =
    'Synthetic UI layout answer. Choose Actual size (100%) in the print dialog.\n\n' +
    Array.from(
      { length: 18 },
      (_, index) =>
        `Layout paragraph ${index + 1}: this is a deliberately long synthetic answer to verify reading, wrapping and independent scrolling without evaluating a model.`,
    ).join('\n\n');
  await page.route('**/v1/operations/helper*', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    calls += 1;
    await new Promise<void>((resolve) => releases.push(resolve));
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'x-vercel-ai-ui-message-stream': 'v1',
      },
      body: chatFixture(answer),
    });
  });
  await page.goto('/');
  const dialog = await openHelp(page);
  await expect(
    dialog.getByRole('heading', { name: 'How can we help?' }),
  ).toBeVisible();
  const question = dialog.getByLabel('Your question');
  await question.fill('Synthetic question: my printed cards are too small');
  await question.press('Shift+Enter');
  expect(calls).toBe(0);
  await question.press('Enter');
  await expect(dialog.getByText('Preparing an answer…')).toBeVisible();
  await expect(question).toHaveValue('');
  await question.fill('My next question, not sent yet');
  await expect.poll(() => releases.length).toBe(1);
  releases.shift()!();
  await expect(dialog.locator('li.answer')).toContainText(
    'Layout paragraph 18',
  );
  await expect(question).toHaveValue('My next question, not sent yet');
  await expect(
    dialog.getByRole('heading', { name: 'How can we help?' }),
  ).toHaveCount(0);
  await expect(dialog.getByRole('log')).toHaveAttribute('aria-live', 'polite');
  const user = await dialog
    .locator('li.customer .bff-helper-message')
    .first()
    .boundingBox();
  const assistant = await dialog
    .locator('li.answer .bff-helper-message')
    .first()
    .boundingBox();
  expect(user!.x).toBeGreaterThan(assistant!.x);
  const transcript = dialog.locator('.bff-helper-transcript');
  const composer = dialog.locator('.bff-helper-composer');
  await expect(composer).toBeVisible();
  const bounds = await composer.boundingBox();
  await question.press('Enter');
  await expect(dialog.getByText('Preparing an answer…')).toBeVisible();
  await transcript.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await expect.poll(() => releases.length).toBe(1);
  releases.shift()!();
  await expect(
    dialog.getByRole('button', { name: '↓ Jump to latest' }),
  ).toBeVisible();
  expect(await transcript.evaluate((element) => element.scrollTop)).toBe(0);
  const stableBounds = await composer.boundingBox();
  expect(stableBounds!.y).toBeCloseTo(bounds!.y, 0);
  await question.fill(
    'A long unsent draft\nwith multiple lines\nthat must stay visible\nwhile reading above\nand not overlap the jump control',
  );
  const jump = dialog.getByRole('button', { name: '↓ Jump to latest' });
  await expect
    .poll(async () => {
      const button = await jump.boundingBox();
      const editor = await composer.boundingBox();
      return button!.y + button!.height <= editor!.y;
    })
    .toBe(true);
  await dialog.getByRole('button', { name: '↓ Jump to latest' }).click();
  expect(
    await transcript.evaluate(
      (element) =>
        element.scrollHeight - element.scrollTop - element.clientHeight,
    ),
  ).toBeLessThan(2);
  await expectContained(page, dialog);
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await expectContained(page, dialog);
  await expect(composer).toBeVisible();
  expect(
    await question.evaluate((element) => element.getBoundingClientRect().right),
  ).toBeLessThanOrEqual(
    (await dialog.boundingBox())!.x + (await dialog.boundingBox())!.width,
  );
  expect(calls).toBe(2);
});

test('modern chat retries the same question without erasing a newer draft or duplicating history', async ({
  page,
}) => {
  const ids: string[] = [];
  await page.route('**/v1/operations/helper*', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    ids.push(
      (route.request().postDataJSON() as { message: { id: string } }).message
        .id,
    );
    await route.fulfill(
      ids.length === 1
        ? { status: 503, body: '{}' }
        : {
            status: 200,
            headers: {
              'content-type': 'text/event-stream',
              'x-vercel-ai-ui-message-stream': 'v1',
            },
            body: chatFixture(
              'Synthetic recovered answer after an explicit retry.',
            ),
          },
    );
  });
  await page.goto('/');
  const dialog = await openHelp(page);
  const question = dialog.getByLabel('Your question');
  await question.fill('Synthetic failed question');
  await dialog.getByRole('button', { name: 'Send question' }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await question.fill('A newer unsent draft');
  await dialog.getByRole('button', { name: 'Retry answer' }).click();
  await expect(
    dialog.getByText('Synthetic recovered answer after an explicit retry.'),
  ).toBeVisible();
  await expect(question).toHaveValue('A newer unsent draft');
  await expect(dialog.locator('li.customer')).toHaveCount(1);
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
  await dialog
    .getByRole('button', { name: 'Contact support', exact: true })
    .click();
  const contact = page.getByRole('dialog', {
    name: 'Contact support',
    exact: true,
  });
  await expect(
    contact.getByRole('link', { name: 'Send us an email' }),
  ).toBeVisible();
  await expect(
    contact.getByRole('heading', { name: 'Contact support', exact: true }),
  ).toBeFocused();
  await contact.getByRole('button', { name: '← Back to Help' }).click();
  await expect(
    dialog.getByRole('heading', { name: 'TableCards Help', exact: true }),
  ).toBeFocused();
  await expect(question).toHaveValue('A newer unsent draft');
  await expect(
    dialog.getByText('Synthetic recovered answer after an explicit retry.'),
  ).toBeVisible();
});

test('modern chat follows a reduced visual viewport without fitting away pinch zoom', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const dialog = await openHelp(page);
  await dialog
    .getByLabel('Your question')
    .fill('An unsent phone keyboard test');
  // Synthetic VisualViewport geometry exercises the real hook/CSS. This is
  // not a claim that an emulated browser opens a physical phone keyboard.
  await page.evaluate(() => {
    const visible = window.visualViewport!;
    Object.defineProperties(visible, {
      height: { configurable: true, value: 430 },
      offsetTop: { configurable: true, value: 36 },
      scale: { configurable: true, value: 1 },
    });
    visible.dispatchEvent(new Event('resize'));
    visible.dispatchEvent(new Event('scroll'));
  });
  await expect.poll(async () => (await dialog.boundingBox())!.height).toBe(430);
  expect((await dialog.boundingBox())!.y).toBe(36);
  const field = await dialog.getByLabel('Your question').boundingBox();
  const close = await dialog
    .getByRole('button', { name: 'Close help' })
    .boundingBox();
  expect(field!.y + field!.height).toBeLessThanOrEqual(466);
  expect(close!.y).toBeGreaterThanOrEqual(36);
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, 'scale', {
      configurable: true,
      value: 2,
    });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect
    .poll(() =>
      dialog.evaluate((element) =>
        element.style.getPropertyValue('--bff-help-visible-height'),
      ),
    )
    .toBe('');
  await dialog.getByRole('button', { name: 'Close help' }).click();
  await expect
    .poll(() =>
      page
        .locator('.bff-help-dialog')
        .evaluate((element) =>
          element.style.getPropertyValue('--bff-help-visible-top'),
        ),
    )
    .toBe('');
});

test('shared support presentation accepts Business theming without submitting a message', async ({
  page,
}, testInfo) => {
  let contactPosts = 0;
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/v1/operations/contact'
    )
      contactPosts += 1;
  });
  await page.goto('/');
  await logInFromLanding(
    page,
    uniquePersona('support-presentation', testInfo.project.name),
  );
  const help = await openHelp(page);
  await help
    .getByRole('button', { name: 'Contact support', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Contact support',
    exact: true,
  });
  const form = dialog.locator('.bff-contact-form');
  await expect(
    form.getByText(/Please do not include private guest lists/u),
  ).toBeVisible();
  await expect(
    form.getByText(/passwords, access tokens and payment details/u),
  ).toBeVisible();
  await form
    .getByLabel('Subject', { exact: true })
    .fill('Unsent synthetic theme check');
  await form
    .getByRole('textbox', { name: 'Message', exact: true })
    .fill('Keep this unsent draft while the presentation changes.');
  const send = form.getByRole('button', { name: 'Send message', exact: true });
  await expect(send).toHaveCSS('background-color', 'rgb(151, 65, 46)');
  await form.evaluate((element) => {
    const style = (element as HTMLElement).style;
    style.setProperty('--bff-support-accent', '#006644');
    style.setProperty('--bff-support-text', '#172554');
    style.setProperty('--bff-support-radius', '1.2rem');
    style.setProperty('--bff-support-font-family', 'monospace');
    style.setProperty('--bff-support-spacing', '1.25rem');
  });
  await expect(send).toHaveCSS('background-color', 'rgb(0, 102, 68)');
  await expect(form).toHaveCSS('color', 'rgb(23, 37, 84)');
  await expect(form).toHaveCSS('font-family', 'monospace');
  const message = form.getByRole('textbox', { name: 'Message', exact: true });
  await expect(message).toHaveCSS('font-family', 'monospace');
  const radius = await message.evaluate((element) =>
    parseFloat(getComputedStyle(element).borderTopLeftRadius),
  );
  expect(radius).toBeCloseTo(19.2, 3);
  await expect(message).toHaveValue(
    'Keep this unsent draft while the presentation changes.',
  );
  await expectContained(page, dialog);
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await expectContained(page, dialog);
  const touchHeight = await send.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  expect(touchHeight).toBeGreaterThanOrEqual(44);
  expect(contactPosts).toBe(0);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('persistent shared Help bubble is available on public and signed-out workspace pages without requesting an answer', async ({
  page,
}) => {
  let actionPosts = 0;
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      /\/v1\/operations\/(helper|contact)$/u.test(
        new URL(request.url()).pathname,
      )
    )
      actionPosts += 1;
  });
  for (const path of ['/', '/privacy', '/create', '/projects', '/contact']) {
    await page.goto(path);
    const dialog = await openHelp(page);
    const launcher = page.getByRole('button', { name: 'Help', exact: true });
    await expect(launcher).toHaveAttribute('aria-expanded', 'true');
    await expectContained(page, dialog);
    await dialog
      .getByLabel('Your question')
      .fill(`Unsent question from ${path}`);
    await page.keyboard.press('Escape');
    await expect(launcher).toBeFocused();
    await expect(launcher).toHaveCSS('position', 'fixed');
    await expect(launcher).toHaveAttribute('aria-expanded', 'false');
    const bounds = await launcher.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    await expectContained(page, launcher);
    await launcher.click();
    await expect(dialog.getByLabel('Your question')).toHaveValue(
      `Unsent question from ${path}`,
    );
    await dialog.getByRole('button', { name: 'Close help' }).click();
  }
  expect(actionPosts).toBe(0);
});

test('shared Help bubble stays above the Business mobile navigation', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await logInFromLanding(
    page,
    uniquePersona('help-bubble-navigation', testInfo.project.name),
  );
  await page.goto('/projects');
  await expect(
    page.getByRole('heading', { name: 'Projects', exact: true }),
  ).toBeVisible();
  const launcher = page.getByRole('button', { name: 'Help', exact: true });
  await expect(launcher).toBeVisible();
  const nav = page.locator('.mobile-navigation');
  if (await nav.isVisible()) {
    const bubble = await launcher.boundingBox();
    const navigation = await nav.boundingBox();
    expect(bubble!.y + bubble!.height).toBeLessThanOrEqual(navigation!.y);
  }
  const dialog = await openHelp(page);
  await expectContained(page, dialog);
  await page.keyboard.press('Escape');
  await expect(launcher).toBeFocused();
});

test('anonymous site-wide mock help preserves customer-clicked links and explicit feedback', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Log in', exact: true }),
  ).toBeVisible();
  const original = page.url();
  const dialog = await askMock(
    page,
    'Synthetic browser review: how should I print my cards?',
  );
  expect(page.url()).toBe(original);
  await expectContained(page, dialog);
  await dialog.getByText('Browse help links', { exact: true }).click();
  const faq = dialog.getByRole('link', {
    name: 'Frequently asked questions',
    exact: true,
  });
  await expect(faq).toHaveAttribute('href', '/#faq');
  for (const link of await dialog.getByRole('link').all()) {
    const href = await link.getAttribute('href');
    expect(href).toMatch(/^\/(?!\/)/u);
  }
  await dialog.getByRole('button', { name: 'Yes', exact: true }).click();
  await expect(dialog.getByText('Thanks for the feedback.')).toBeVisible();
  await faq.click();
  await expect(page).toHaveURL(`${TABLECARDS_WEB_URL}/#faq`);
  await expect(dialog).not.toBeVisible();
  for (const path of ['/privacy', '/create']) {
    await page.goto(path);
    const next = await openHelp(page);
    await expectContained(page, next);
    await next
      .getByRole('button', { name: 'Contact support', exact: true })
      .click();
    const contact = page.getByRole('dialog', {
      name: 'Contact support',
      exact: true,
    });
    await expect(
      contact.getByRole('link', { name: 'Send us an email' }),
    ).toHaveAttribute('href', /^mailto:/u);
    await expect(contact.getByLabel('Message', { exact: true })).toHaveCount(0);
    await contact.getByRole('button', { name: 'Close help' }).click();
  }
});

test('keyboard entry, focus return, phone containment and readable enlarged text', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Log in', exact: true }),
  ).toBeVisible();
  const help = page.getByRole('button', { name: 'Help', exact: true });
  await help.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', {
    name: 'TableCards Help',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Close help' }),
  ).toBeFocused();
  await expectContained(page, dialog);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(help).toBeFocused();
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await help.click();
  await expectContained(page, dialog);
  const question = dialog.getByLabel('Your question');
  await question.fill('Synthetic enlarged text question');
  await expect(question).toHaveValue('Synthetic enlarged text question');
  const height = await dialog
    .getByRole('button', { name: 'Close help' })
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(height).toBeGreaterThanOrEqual(44);
});

test('development sign-in separates helper identity and explicitly submitted contact/feedback remains honest mock', async ({
  page,
}, testInfo) => {
  const helperRequests: Array<{
    authenticated: boolean;
    hasConversation: boolean;
    hasCapability: boolean;
  }> = [];
  let contactPosts = 0;
  page.on('request', (request) => {
    if (request.method() !== 'POST') return;
    const path = new URL(request.url()).pathname;
    if (path === '/v1/operations/helper') {
      const body = request.postDataJSON() as Record<string, unknown>;
      helperRequests.push({
        authenticated: Boolean(request.headers()['authorization']),
        hasConversation: Boolean(body.conversationId),
        hasCapability: Boolean(body.capability),
      });
    }
    if (path === '/v1/operations/contact') contactPosts += 1;
  });
  await page.goto('/');
  let dialog = await askMock(
    page,
    'Synthetic anonymous context question before sign-in',
  );
  await dialog.getByRole('button', { name: 'Close help' }).click();
  const persona = uniquePersona('operator-work', testInfo.project.name);
  await logInFromLanding(page, persona);
  dialog = await askMock(page, 'Synthetic signed-in context question');
  await expect(
    dialog.getByText('Synthetic anonymous context question before sign-in', {
      exact: true,
    }),
  ).toHaveCount(0);
  expect(helperRequests).toEqual([
    { authenticated: false, hasConversation: false, hasCapability: true },
    { authenticated: true, hasConversation: false, hasCapability: false },
  ]);
  await dialog
    .getByRole('button', { name: 'Contact support', exact: true })
    .click();
  const contact = page.getByRole('dialog', {
    name: 'Contact support',
    exact: true,
  });
  await expect(
    contact.getByRole('textbox', { name: 'Message', exact: true }),
  ).toHaveValue('Synthetic signed-in context question');
  expect(contactPosts).toBe(0);
  await contact
    .getByLabel('Subject', { exact: true })
    .fill('Synthetic hosted support review');
  await contact
    .getByRole('button', { name: 'Send message', exact: true })
    .click();
  await expect(
    contact.getByText(/Development test only: no email was sent\./u),
  ).toBeVisible();
  await expect(contact.getByText(/Check your inbox/u)).toHaveCount(0);
  expect(contactPosts).toBe(1);
  await contact.getByRole('button', { name: 'Close help' }).click();
  await page
    .getByRole('banner')
    .getByRole('button', { name: 'Feedback', exact: true })
    .click();
  const feedback = page.getByRole('dialog', {
    name: 'Share feedback',
    exact: true,
  });
  await expect(
    feedback.getByLabel('What would you like to share?'),
  ).toHaveValue('feedback');
  await feedback
    .getByLabel('Subject', { exact: true })
    .fill('Synthetic suggestion without a promise');
  await feedback
    .getByRole('textbox', { name: 'Message', exact: true })
    .fill(
      'Synthetic browser acceptance: a clearer print explanation would help.',
    );
  await feedback
    .getByRole('button', { name: 'Send message', exact: true })
    .click();
  await expect(
    feedback.getByText(/Development test only: no email was sent\./u),
  ).toBeVisible();
  expect(contactPosts).toBe(2);
  await feedback.getByRole('button', { name: 'Close help' }).click();
  await page
    .locator('button:visible')
    .filter({ hasText: /^Sign out$/u })
    .first()
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Sign in to open your workspace',
      exact: true,
    }),
  ).toBeVisible();
  await page.goto('/');
  dialog = await openHelp(page);
  await expect(
    dialog.getByText('Synthetic signed-in context question', { exact: true }),
  ).toHaveCount(0);
  await dialog
    .getByRole('button', { name: 'Contact support', exact: true })
    .click();
  await expect(
    page
      .getByRole('dialog', { name: 'Contact support' })
      .getByLabel('Message', { exact: true }),
  ).toHaveCount(0);
});

test('survey GET and preselected choices cannot submit an invalid or missing invitation', async ({
  page,
}) => {
  let surveyPosts = 0;
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/v1/operations/survey'
    )
      surveyPosts += 1;
  });
  await page.goto(
    '/support/feedback?token=synthetic-invalid-feedback-token-0000000000000000&choice=yes',
  );
  await expect(
    page.getByText(
      /This feedback (invitation is not available|link is unavailable or has expired)/u,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Send feedback', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText(
      /This feedback (invitation is not available|link is unavailable or has expired)/u,
    ),
  ).toBeVisible();
  expect(surveyPosts).toBe(0);
  await page.goto('/support/feedback?choice=yes');
  await expect(
    page.getByText(/This feedback link is incomplete/u),
  ).toBeVisible();
  expect(surveyPosts).toBe(0);
});
