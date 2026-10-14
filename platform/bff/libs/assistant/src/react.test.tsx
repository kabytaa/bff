// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import {
  BffContactForm,
  BffHelpSurface,
  BffHelper,
  BffSupportSurvey,
  helperRequestBody,
  type OperationsConnection,
} from './react';

const connection: OperationsConnection = {
  apiBaseUrl: 'https://bff.example.invalid',
  environmentKey: 'sample-development',
  getAccessToken: async () => 'synthetic-test-token',
};
const request = vi.fn<typeof fetch>();
function helperStream(chunks: unknown[]): Response {
  return new Response(
    [
      ...chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`),
      'data: [DONE]\n\n',
    ].join(''),
    {
      headers: {
        'content-type': 'text/event-stream',
        'x-vercel-ai-ui-message-stream': 'v1',
      },
    },
  );
}
function helper(identity = 'user-one:account-one') {
  return (
    <BffHelper
      key={identity}
      connection={connection}
      contextKey={`${identity}:/create`}
      pageKey="/create"
      productName="Synthetic"
      links={[
        { toolName: 'open_create', path: '/create', label: 'Create cards' },
        {
          toolName: 'bad_external',
          path: '//untrusted.example.invalid',
          label: 'Unsafe external',
        },
      ]}
      renderLink={(link) => <a href={link.path}>{link.label}</a>}
      onContact={vi.fn()}
    />
  );
}
beforeEach(() => {
  vi.stubGlobal('fetch', request);
  request.mockReset();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});

describe('Shared support UI authority and continuity', () => {
  it('keeps anonymous recovery authority and the exact question ID when the first response is lost', async () => {
    const anonymous = { ...connection, getAccessToken: async () => null };
    request.mockRejectedValueOnce(new TypeError('Synthetic lost response'));
    render(
      <BffHelper
        connection={anonymous}
        contextKey="anonymous:/create"
        pageKey="/create"
        productName="Synthetic"
        links={[]}
        renderLink={() => null}
        onContact={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'How do I print at the right size?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await screen.findByRole('alert');
    const first = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
    expect(first.capability).toMatch(/^[0-9a-f]{64}$/u);
    expect(first).not.toHaveProperty('conversationId');
    request.mockResolvedValueOnce(
      helperStream([
        { type: 'start', messageId: 'saved-printing-answer' },
        {
          type: 'data-session',
          data: {
            conversationId: 'saved-conversation',
            capability: first.capability,
            mocked: true,
          },
          transient: true,
        },
        { type: 'text-start', id: 'saved-printing-answer' },
        {
          type: 'text-delta',
          id: 'saved-printing-answer',
          delta: 'Use Actual Size / 100%.',
        },
        { type: 'text-end', id: 'saved-printing-answer' },
        { type: 'finish', finishReason: 'stop' },
      ]),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry answer' }));
    await screen.findByText('Use Actual Size / 100%.');
    expect(request).toHaveBeenCalledTimes(2);
    const retry = JSON.parse(String(request.mock.calls[1]?.[1]?.body));
    expect(retry).toEqual(first);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(
      screen.getAllByText('How do I print at the right size?'),
    ).toHaveLength(1);
  });
  it('isolates mixed-language messages and reads Hebrew right-to-left even after a Latin brand', async () => {
    request.mockResolvedValueOnce(
      helperStream([
        { type: 'start', messageId: 'hebrew-answer' },
        { type: 'text-start', id: 'hebrew-text' },
        {
          type: 'text-delta',
          id: 'hebrew-text',
          delta:
            '## איך מתחילים?\n\n**TableCards** מאפשר ליצור כרטיסי הושבה ולשמור קובץ PDF.\n\n1. בחרו עיצוב.\n2. הדפיסו ב־`100%`.\n\n[פתיחת העורך](/create)\n\nEnglish names stay unchanged.',
        },
        { type: 'text-end', id: 'hebrew-text' },
        { type: 'finish', finishReason: 'stop' },
      ]),
    );
    const view = render(helper());
    const question = screen.getByLabelText('Your question');
    expect(question.getAttribute('dir')).toBe('auto');
    fireEvent.change(question, { target: { value: 'איך זה עובד?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await screen.findByRole('heading', { name: 'איך מתחילים?' });
    const answer = view.container.querySelector(
      'li.answer .bff-helper-message',
    )!;
    expect(answer.getAttribute('dir')).toBe('rtl');
    expect(
      view.container
        .querySelector('li.customer .bff-helper-message')
        ?.getAttribute('dir'),
    ).toBe('rtl');
    expect(answer.querySelector('h3')?.getAttribute('dir')).toBe('rtl');
    expect(answer.querySelector('p')?.getAttribute('dir')).toBe('rtl');
    expect(answer.querySelector('ol')?.getAttribute('dir')).toBe('rtl');
    expect(
      screen.getByText('English names stay unchanged.').getAttribute('dir'),
    ).toBe('auto');
    expect(answer.querySelector('a')?.closest('bdi')).toBeTruthy();
    expect(answer.querySelector('code')?.getAttribute('dir')).toBe('ltr');
    expect(question.closest('form')?.getAttribute('dir')).not.toBe('rtl');
  });
  it('renders assistant Markdown while preserving literal customer messages', async () => {
    const answer = [
      '## Printing steps',
      '',
      '1. **Use Actual Size (100%)** instead of *Fit to Page*.',
      '2. Open [the creator](/create), then use `Print`. [Open again](/create).',
      '',
      '- Check the preview.',
      '- Keep ~~old~~ settings out.',
      '',
      '| Setting | Value |',
      '| --- | --- |',
      '| Scale | 100% |',
      '',
      '```text',
      'No executable code here.',
      '```',
    ].join('\n');
    request.mockResolvedValueOnce(
      helperStream([
        { type: 'start', messageId: 'markdown-answer' },
        { type: 'text-start', id: 'markdown-text' },
        { type: 'text-delta', id: 'markdown-text', delta: answer },
        { type: 'text-end', id: 'markdown-text' },
        { type: 'finish', finishReason: 'stop' },
      ]),
    );
    const view = render(helper());
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: '**Keep my question literal**' },
    });
    fireEvent.keyDown(screen.getByLabelText('Your question'), { key: 'Enter' });
    await screen.findByRole('heading', { name: 'Printing steps' });
    const message = view.container.querySelector(
      'li.answer .bff-helper-message',
    )!;
    expect(message.querySelector('strong')?.textContent).toBe(
      'Use Actual Size (100%)',
    );
    expect(message.querySelector('em')?.textContent).toBe('Fit to Page');
    expect(message.querySelectorAll('ol > li')).toHaveLength(2);
    expect(message.querySelectorAll('ul > li')).toHaveLength(2);
    expect(message.querySelector('del')?.textContent).toBe('old');
    expect(within(message as HTMLElement).getByRole('table')).toBeTruthy();
    expect(message.querySelector('pre > code')?.textContent).toContain(
      'No executable code here.',
    );
    expect(
      within(message as HTMLElement)
        .getByRole('link', { name: 'Create cards' })
        .getAttribute('href'),
    ).toBe('/create');
    expect(message.textContent).not.toContain('**');
    const customer = view.container.querySelector(
      'li.customer .bff-helper-message',
    )!;
    expect(customer.textContent).toBe('**Keep my question literal**');
    expect(customer.querySelector('strong')).toBeNull();
  });
  it('does not execute raw HTML, fetch Markdown images or link to unregistered destinations', async () => {
    const answer = [
      '**Safe answer**',
      '',
      '<script>window.stolen = true</script>',
      '<iframe src="https://untrusted.example.invalid"></iframe>',
      '<img src="https://untrusted.example.invalid/track" onerror="alert(1)">',
      '![Tracking image](https://untrusted.example.invalid/pixel)',
      '[Script](javascript:alert%281%29)',
      '[Data](data:text/html;base64,c3RvbGVu)',
      '[External](https://untrusted.example.invalid)',
      '[Protocol relative](//untrusted.example.invalid)',
      '[Unregistered page](/account/delete)',
      '[Allowed](/create)',
    ].join('\n\n');
    request.mockResolvedValueOnce(
      helperStream([
        { type: 'start', messageId: 'safe-answer' },
        { type: 'text-start', id: 'safe-text' },
        { type: 'text-delta', id: 'safe-text', delta: answer },
        { type: 'text-end', id: 'safe-text' },
        { type: 'finish', finishReason: 'stop' },
      ]),
    );
    const view = render(helper());
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Help me safely' },
    });
    fireEvent.keyDown(screen.getByLabelText('Your question'), { key: 'Enter' });
    await screen.findByText('Safe answer');
    const message = view.container.querySelector(
      'li.answer .bff-helper-message',
    )!;
    expect(message.querySelector('script, iframe, img, form')).toBeNull();
    expect(message.querySelectorAll('a')).toHaveLength(1);
    expect(message.querySelector('a')?.getAttribute('href')).toBe('/create');
    expect(message.textContent).toContain('External');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('starts with a welcome, a chat log and a labelled compact composer, without a provider call', () => {
    const view = render(helper());
    expect(
      screen.getByRole('heading', { name: 'How can we help?' }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('log', { name: 'Help conversation' })
        .getAttribute('aria-live'),
    ).toBe('polite');
    expect(screen.getByLabelText('Your question').getAttribute('rows')).toBe(
      '1',
    );
    expect(screen.getByRole('button', { name: 'Send question' })).toBeTruthy();
    expect(view.container.querySelector('.bff-helper-composer')).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });
  it('does not send Shift+Enter, repeated Enter or IME confirmation; ordinary Enter sends once', async () => {
    request.mockResolvedValueOnce(
      helperStream([
        { type: 'start', messageId: 'answer-one' },
        { type: 'text-start', id: 'text-one' },
        {
          type: 'text-delta',
          id: 'text-one',
          delta: 'A useful synthetic answer.',
        },
        { type: 'text-end', id: 'text-one' },
        { type: 'finish', finishReason: 'stop' },
      ]),
    );
    render(helper());
    const field = screen.getByLabelText('Your question');
    fireEvent.change(field, { target: { value: 'How should I print?' } });
    fireEvent.keyDown(field, { key: 'Enter', shiftKey: true });
    fireEvent.keyDown(field, { key: 'Enter', repeat: true });
    fireEvent.compositionStart(field);
    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.compositionEnd(field);
    fireEvent.keyDown(field, { key: 'Enter', isComposing: true });
    expect(request).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: 'Enter' });
    await screen.findByText('A useful synthetic answer.');
    expect(request).toHaveBeenCalledTimes(1);
    expect((field as HTMLTextAreaElement).value).toBe('');
  });
  it('does not erase the next draft when the previous answer finishes', async () => {
    let finish!: (response: Response) => void;
    request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(helper());
    const field = screen.getByLabelText('Your question');
    fireEvent.change(field, { target: { value: 'First question' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect((field as HTMLTextAreaElement).value).toBe('');
    fireEvent.change(field, {
      target: { value: 'My next question, still unsent' },
    });
    finish(
      helperStream([
        { type: 'start', messageId: 'answer-one' },
        { type: 'text-start', id: 'text-one' },
        {
          type: 'text-delta',
          id: 'text-one',
          delta: 'Answer to the first question.',
        },
        { type: 'text-end', id: 'text-one' },
        { type: 'finish', finishReason: 'stop' },
      ]),
    );
    await screen.findByText('Answer to the first question.');
    expect((field as HTMLTextAreaElement).value).toBe(
      'My next question, still unsent',
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('opens a themed shared bubble, preserves unsent input on close and restores focus without a provider call', () => {
    function Surface() {
      const [open, setOpen] = useState(false);
      return (
        <BffHelpSurface
          title="Synthetic help"
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          className="sample-help-surface"
          style={{ '--bff-support-accent': '#006644' }}
        >
          <label>
            Unsent question
            <input />
          </label>
        </BffHelpSurface>
      );
    }
    const view = render(<Surface />);
    const launcher = screen.getByRole('button', { name: 'Help' });
    expect(launcher.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('dialog')).toBeNull();
    launcher.focus();
    fireEvent.click(launcher);
    const dialog = screen.getByRole('dialog', { name: 'Synthetic help' });
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Close help' }),
    );
    expect(dialog.id).toBe(launcher.getAttribute('aria-controls'));
    expect(launcher.getAttribute('aria-expanded')).toBe('true');
    const surface =
      view.container.querySelector<HTMLElement>('.bff-help-surface')!;
    expect(surface.classList.contains('sample-help-surface')).toBe(true);
    expect(surface.style.getPropertyValue('--bff-support-accent')).toBe(
      '#006644',
    );
    fireEvent.change(screen.getByLabelText('Unsent question'), {
      target: { value: 'Do not send this question' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Close help' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(launcher);
    fireEvent.click(launcher);
    expect(
      (screen.getByLabelText('Unsent question') as HTMLInputElement).value,
    ).toBe('Do not send this question');
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
  it('gives separate embedded help surfaces distinct accessible dialog IDs', () => {
    const props = { open: false, onOpen: vi.fn(), onClose: vi.fn() };
    render(
      <>
        <BffHelpSurface {...props} title="First help" />
        <BffHelpSurface {...props} title="Second help" />
      </>,
    );
    const ids = screen
      .getAllByRole('button', { name: 'Help' })
      .map((button) => button.getAttribute('aria-controls'));
    expect(new Set(ids).size).toBe(2);
    expect(request).not.toHaveBeenCalled();
  });
  it('tracks the visible phone viewport while open, preserves pinch zoom and releases listeners on close', () => {
    const visible = Object.assign(new window.EventTarget(), {
      height: 430,
      offsetTop: 36,
      scale: 1,
    });
    vi.stubGlobal('visualViewport', visible);
    const remove = vi.spyOn(visible, 'removeEventListener');
    const props = {
      onOpen: vi.fn(),
      onClose: vi.fn(),
      title: 'Synthetic help',
    };
    const view = render(<BffHelpSurface {...props} open />);
    const dialog = screen.getByRole('dialog') as HTMLDialogElement;
    expect(dialog.style.getPropertyValue('--bff-help-visible-height')).toBe(
      '430px',
    );
    expect(dialog.style.getPropertyValue('--bff-help-visible-top')).toBe(
      '36px',
    );
    visible.height = 380;
    visible.offsetTop = 64;
    visible.dispatchEvent(new Event('resize'));
    expect(dialog.style.getPropertyValue('--bff-help-visible-height')).toBe(
      '380px',
    );
    visible.dispatchEvent(new Event('scroll'));
    expect(dialog.style.getPropertyValue('--bff-help-visible-top')).toBe(
      '64px',
    );
    visible.scale = 2;
    visible.dispatchEvent(new Event('resize'));
    expect(dialog.style.getPropertyValue('--bff-help-visible-height')).toBe('');
    visible.scale = 1;
    visible.dispatchEvent(new Event('resize'));
    view.rerender(<BffHelpSurface {...props} open={false} />);
    expect(dialog.style.getPropertyValue('--bff-help-visible-height')).toBe('');
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    visible.height = 900;
    visible.dispatchEvent(new Event('resize'));
    expect(dialog.style.getPropertyValue('--bff-help-visible-height')).toBe('');
    expect(request).not.toHaveBeenCalled();
  });
  it('focuses the updated view heading without closing the modal or stealing focus on rerenders', () => {
    const props = { open: true, onOpen: vi.fn(), onClose: vi.fn() };
    const view = render(<BffHelpSurface {...props} title="Synthetic help" />);
    const close = screen.getByRole('button', { name: 'Close help' });
    close.focus();
    view.rerender(<BffHelpSurface {...props} title="Contact support" />);
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Contact support' }),
    );
    close.focus();
    view.rerender(
      <BffHelpSurface
        {...props}
        title="Contact support"
        subtitle="Updated copy"
      />,
    );
    expect(document.activeElement).toBe(close);
    view.rerender(<BffHelpSurface {...props} title="Synthetic help" />);
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Synthetic help' }),
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });
  it('keeps the default contact warning Business-neutral', () => {
    render(
      <BffContactForm connection={connection} signedIn signInControl={null} />,
    );
    expect(screen.queryByText(/guest lists/iu)).toBeNull();
    expect(
      screen.getByText(/passwords, access tokens and payment details/u),
    ).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });
  it('exposes helper presentation without granting model or navigation authority', () => {
    const view = render(
      <BffHelper
        connection={connection}
        contextKey="anonymous:/help"
        pageKey="/help"
        productName="Synthetic"
        links={[]}
        renderLink={() => null}
        onContact={vi.fn()}
        enabled={false}
        className="sample-help"
        style={{ '--bff-support-radius': '1rem', fontFamily: 'serif' }}
      />,
    );
    const root = view.container.querySelector<HTMLElement>('.bff-helper')!;
    expect(root.classList.contains('sample-help')).toBe(true);
    expect(root.style.getPropertyValue('--bff-support-radius')).toBe('1rem');
    expect(root.style.fontFamily).toBe('serif');
    expect(request).not.toHaveBeenCalled();
  });
  it('renders caller-owned privacy wording as text and supports scoped presentation', () => {
    const view = render(
      <BffContactForm
        connection={connection}
        signedIn
        signInControl={null}
        additionalPrivacyNotice="Do not include private incident reports. <script>untrusted()</script>"
        className="sample-support"
        style={{ '--bff-support-accent': '#006644', fontFamily: 'monospace' }}
      />,
    );
    const form = screen.getByLabelText('Message').closest('form')!;
    expect(form.classList.contains('bff-contact-form')).toBe(true);
    expect(form.classList.contains('sample-support')).toBe(true);
    expect(form.style.getPropertyValue('--bff-support-accent')).toBe('#006644');
    expect(form.style.fontFamily).toBe('monospace');
    expect(screen.getByText(/private incident reports/u)).toBeTruthy();
    expect(form.querySelector('script')).toBeNull();
    view.rerender(
      <BffContactForm
        connection={connection}
        signedIn
        signInControl={null}
        additionalPrivacyNotice="Do not include private client documents."
      />,
    );
    expect(screen.queryByText(/private incident reports/u)).toBeNull();
    expect(screen.getByText(/private client documents/u)).toBeTruthy();
    expect(
      screen.getByText(/passwords, access tokens and payment details/u),
    ).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });
  it.each(['answer-one', 'answer-two'])(
    'shows one answer/link and resumes each browser result once with continuation ID %s',
    async (continuationId) => {
      request
        .mockResolvedValueOnce(
          helperStream([
            { type: 'start', messageId: 'answer-one' },
            {
              type: 'data-session',
              data: { conversationId: 'private-one', mocked: true },
              transient: true,
            },
            {
              type: 'tool-input-available',
              toolCallId: 'call-one',
              toolName: 'open_create',
              input: {},
            },
            { type: 'finish', finishReason: 'tool-calls' },
          ]),
        )
        .mockResolvedValueOnce(
          helperStream([
            { type: 'start', messageId: continuationId },
            { type: 'text-start', id: 'text-one' },
            {
              type: 'text-delta',
              id: 'text-one',
              delta:
                'Choose a link if useful.\n\n[Create](/create) and [Create again](/create).\n\n[Duplicate create link](/create)',
            },
            { type: 'text-end', id: 'text-one' },
            { type: 'finish', finishReason: 'stop' },
          ]),
        );
      const initialUrl = window.location.href;
      const view = render(helper());
      fireEvent.change(screen.getByLabelText('Your question'), {
        target: { value: 'Where can I create cards?' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
      await screen.findByText('Choose a link if useful.');
      expect(view.container.querySelectorAll('li.answer')).toHaveLength(1);
      expect(
        view.container.querySelectorAll('li.answer a[href="/create"]'),
      ).toHaveLength(1);
      expect(screen.queryByText('Duplicate create link')).toBeNull();
      expect(window.location.href).toBe(initialUrl);
      expect(
        screen.queryByRole('link', { name: 'Unsafe external' }),
      ).toBeNull();
      expect(
        screen
          .getAllByRole('link', { name: 'Create cards' })
          .every((link) => link.getAttribute('href') === '/create'),
      ).toBe(true);
      const resume = JSON.parse(String(request.mock.calls[1]?.[1]?.body));
      expect(resume.conversationId).toBe('private-one');
      expect(resume.toolResults).toEqual([
        {
          toolCallId: 'call-one',
          toolName: 'open_create',
          contextKey: 'user-one:account-one:/create',
          output: {
            offered: true,
            destination: '/create',
            label: 'Create cards',
          },
        },
      ]);
      expect(resume).not.toHaveProperty('messages');
      await waitFor(() => {
        expect(request).toHaveBeenCalledTimes(2);
        expect(screen.queryByRole('alert')).toBeNull();
        expect(
          screen.getByLabelText('Your question').hasAttribute('disabled'),
        ).toBe(false);
      });
    },
  );
  it.each([
    { toolName: 'navigate', input: { url: 'javascript:alert(1)' } },
    { toolName: 'bad_external', input: {} },
    { toolName: 'open_create', input: { url: '/settings' } },
    { toolName: 'open_create', input: [] },
  ])(
    'refuses unsupported link tool payload $toolName without executing or following model instructions',
    async ({ toolName, input }) => {
      request
        .mockResolvedValueOnce(
          helperStream([
            { type: 'start', messageId: 'answer-one' },
            {
              type: 'tool-input-available',
              toolCallId: 'call-one',
              toolName,
              input,
            },
            { type: 'finish', finishReason: 'tool-calls' },
          ]),
        )
        .mockResolvedValueOnce(new Response('{}', { status: 409 }));
      const initialUrl = window.location.href;
      render(helper());
      fireEvent.change(screen.getByLabelText('Your question'), {
        target: { value: 'A question to preserve' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
      await screen.findByRole('alert');
      expect(window.location.href).toBe(initialUrl);
      expect(
        screen.queryByRole('link', { name: 'Unsafe external' }),
      ).toBeNull();
      const resume = JSON.parse(String(request.mock.calls[1]?.[1]?.body));
      expect(resume.toolResults).toHaveLength(1);
      expect(resume.toolResults[0].output.offered).toBe(false);
      expect(resume.toolResults[0].output).not.toHaveProperty('destination');
    },
  );
  it('preserves the question and shows an error if an unsupported multiple-call response is refused by the single-checkpoint server', async () => {
    request
      .mockResolvedValueOnce(
        helperStream([
          { type: 'start', messageId: 'answer-one' },
          {
            type: 'tool-input-available',
            toolCallId: 'call-one',
            toolName: 'open_create',
            input: {},
          },
          {
            type: 'tool-input-available',
            toolCallId: 'call-two',
            toolName: 'open_create',
            input: {},
          },
          { type: 'finish', finishReason: 'tool-calls' },
        ]),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 400 }));
    render(helper());
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Preserved question' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await screen.findByRole('alert');
    expect(screen.getByText('Preserved question')).toBeTruthy();
    expect(request).toHaveBeenCalledTimes(2);
    expect(
      JSON.parse(String(request.mock.calls[1]?.[1]?.body)).toolResults,
    ).toHaveLength(2);
  });
  it('clears private history and session identifiers when the identity-scoped helper remounts', async () => {
    request.mockResolvedValueOnce(
      helperStream([
        { type: 'start', messageId: 'private-answer' },
        {
          type: 'data-session',
          data: {
            conversationId: 'private-old',
            capability: 'private-capability',
            mocked: true,
          },
          transient: true,
        },
        { type: 'text-start', id: 'text-one' },
        {
          type: 'text-delta',
          id: 'text-one',
          delta: 'Private previous account answer',
        },
        { type: 'text-end', id: 'text-one' },
        { type: 'finish', finishReason: 'stop' },
      ]),
    );
    const view = render(helper());
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'Private previous account question' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await screen.findByText('Private previous account answer');
    view.rerender(helper('user-one:account-two'));
    expect(screen.queryByText('Private previous account answer')).toBeNull();
    expect(screen.queryByText('Private previous account question')).toBeNull();
    request.mockResolvedValueOnce(
      helperStream([
        { type: 'start', messageId: 'new-answer' },
        { type: 'finish', finishReason: 'stop' },
      ]),
    );
    fireEvent.change(screen.getByLabelText('Your question'), {
      target: { value: 'New account question' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    const body = JSON.parse(String(request.mock.calls[1]?.[1]?.body));
    expect(body).not.toHaveProperty('conversationId');
    expect(body).not.toHaveProperty('capability');
    expect(body.message.text).toBe('New account question');
  });
  it('gives signed-out visitors email and sign-in without an anonymous form or request', () => {
    render(
      <BffContactForm
        connection={connection}
        signedIn={false}
        contactEmail="support@example.invalid"
        signInControl={<a href="/login">Sign in</a>}
      />,
    );
    expect(
      screen
        .getByRole('link', { name: 'Send us an email' })
        .getAttribute('href'),
    ).toContain('mailto:support@example.invalid');
    expect(screen.queryByLabelText('Message')).toBeNull();
    expect(
      screen.getByText(
        'Development test only: this synthetic address cannot receive email.',
      ),
    ).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });
  it('submits only after an explicit action and uses the same idempotency key after a failure', async () => {
    request
      .mockRejectedValueOnce(new Error('Connection lost'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            conversationId: 'synthetic-case',
            reference: 'SYN-1',
            contactEmail: 'customer@example.invalid',
            receiptState: 'mocked',
          }),
          { status: 200 },
        ),
      );
    render(
      <BffContactForm
        connection={connection}
        signedIn
        contactEmail="support@example.invalid"
        signInControl={null}
        initialMessage="A reviewable summary, not a submitted case."
      />,
    );
    expect(request).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'Synthetic printing question' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByText(/We could not confirm receipt/);
    expect(
      (screen.getByLabelText('Message') as HTMLTextAreaElement).value,
    ).toContain('reviewable summary');
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByText('Development test only: no email was sent.', {
      exact: false,
    });
    const first = JSON.parse(
      String(request.mock.calls[0]?.[1]?.body),
    ) as Record<string, unknown>;
    const second = JSON.parse(
      String(request.mock.calls[1]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(first.idempotencyKey).toBe(second.idempotencyKey);
    expect(first).not.toHaveProperty('contactEmail');
    expect(first).not.toHaveProperty('accountId');
    expect(screen.queryByText(/Check your inbox/)).toBeNull();
  });
  it('does not label an ordinary configured mailbox as synthetic', () => {
    render(
      <BffContactForm
        connection={connection}
        signedIn={false}
        contactEmail="support@example.com"
        signInControl={null}
      />,
    );
    expect(
      screen.queryByText(
        'Development test only: this synthetic address cannot receive email.',
      ),
    ).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
  it('does not submit a preselected survey answer on GET', async () => {
    request.mockResolvedValue(
      new Response(
        JSON.stringify({
          active: true,
          question: 'Did you get the help you needed?',
        }),
        { status: 200 },
      ),
    );
    render(
      <BffSupportSurvey
        connection={connection}
        token="synthetic-invitation"
        initialChoice="partly"
        className="sample-survey"
        style={{ '--bff-support-accent': '#006644' }}
      />,
    );
    await screen.findByRole('button', { name: 'Send feedback' });
    const surface = screen
      .getByRole('button', { name: 'Send feedback' })
      .closest<HTMLElement>('.bff-support-survey-surface')!;
    expect(surface.classList.contains('sample-survey')).toBe(true);
    expect(surface.style.getPropertyValue('--bff-support-accent')).toBe(
      '#006644',
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[1]?.method).toBe('GET');
    expect((screen.getByLabelText('Partly') as HTMLInputElement).checked).toBe(
      true,
    );
    request.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await screen.findByText('Thank you for your feedback');
    expect(request.mock.calls[1]?.[1]?.method).toBe('POST');
    expect(JSON.parse(String(request.mock.calls[1]?.[1]?.body))).toEqual({
      token: 'synthetic-invitation',
      choice: 'partly',
    });
  });
  it('clears the previous survey answer and receipt when invitation tokens change', async () => {
    request.mockResolvedValueOnce(
      new Response(JSON.stringify({ active: true }), { status: 200 }),
    );
    const view = render(
      <BffSupportSurvey
        connection={connection}
        token="invitation-one"
        initialChoice="yes"
      />,
    );
    await screen.findByRole('button', { name: 'Send feedback' });
    request.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await screen.findByText('Thank you for your feedback');
    request.mockResolvedValueOnce(
      new Response(JSON.stringify({ active: true }), { status: 200 }),
    );
    view.rerender(
      <BffSupportSurvey connection={connection} token="invitation-two" />,
    );
    await screen.findByRole('button', { name: 'Send feedback' });
    expect(screen.queryByText('Thank you for your feedback')).toBeNull();
    expect((screen.getByLabelText('Yes') as HTMLInputElement).checked).toBe(
      false,
    );
    expect(request.mock.calls[2]?.[1]?.method).toBe('GET');
    expect(String(request.mock.calls[2]?.[0])).toContain('invitation-two');
  });
  it('describes a queued contact confirmation without claiming delivery', async () => {
    request.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          conversationId: 'case-one',
          reference: 'SYN-QUEUE',
          contactEmail: 'person@example.invalid',
          receiptState: 'queued',
        }),
        { status: 200 },
      ),
    );
    render(
      <BffContactForm
        connection={connection}
        signedIn
        contactEmail="support@example.invalid"
        signInControl={null}
        initialMessage="Synthetic question"
      />,
    );
    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'A question' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByText(/A confirmation email is queued/);
    expect(screen.queryByText(/Check your inbox/)).toBeNull();
  });
  it('keeps survey failure visible and allows another explicit submit', async () => {
    request
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ active: true }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 503 }));
    render(
      <BffSupportSurvey
        connection={connection}
        token="synthetic-invitation"
        initialChoice="no"
      />,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Send feedback' }),
    );
    await screen.findByText('Your response was not saved. Please try again.');
    await waitFor(() =>
      expect(
        (
          screen.getByRole('button', {
            name: 'Send feedback',
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
  });
  it('sends current user input without client-supplied assistant histories or identity claims', () => {
    const body = helperRequestBody({
      environmentKey: 'sample-development',
      session: {
        conversationId: 'synthetic-case',
        capability: 'synthetic-anonymous-capability',
      },
      pageKey: '/create',
      message: { id: 'message-one', text: 'How should I print?' },
    });
    expect(body).toEqual({
      environmentKey: 'sample-development',
      conversationId: 'synthetic-case',
      capability: 'synthetic-anonymous-capability',
      page: { key: '/create' },
      message: { id: 'message-one', text: 'How should I print?' },
    });
    expect(body).not.toHaveProperty('messages');
    expect(body).not.toHaveProperty('accountId');
  });
});
