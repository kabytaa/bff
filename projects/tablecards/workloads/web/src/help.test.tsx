// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useState } from 'react';
import type * as AssistantReact from '@bff/assistant/react';
import { TableCardsApplicationProvider } from './application-context';
import { ContactPage, HelpActions, TableCardsHelpRoot } from './help';

const auth = vi.hoisted(() => ({
  state: {
    status: 'authenticated',
    accountId: 'account-one',
    customer: {
      user: { id: 'user-one', verifiedEmail: 'person@example.invalid' },
      accounts: [
        { id: 'account-one', displayName: 'First workspace' },
        { id: 'account-two', displayName: 'Second workspace' },
      ],
    },
  },
  listeners: new Set<() => void>(),
  helperMounts: 0,
}));
vi.mock('@tofler/bff-auth/react', async () => {
  const { useSyncExternalStore, createElement } = await import('react');
  const client = {
    getAccessToken: async () => 'synthetic-token',
    bootstrap: vi.fn(),
  };
  return {
    useBffAuth: () => ({
      state: useSyncExternalStore(
        (callback) => {
          auth.listeners.add(callback);
          return () => auth.listeners.delete(callback);
        },
        () => auth.state,
      ),
      client,
    }),
    BffAuthLink: ({ children }: { children: React.ReactNode }) =>
      createElement('a', { href: '/sign-in' }, children),
  };
});
vi.mock('@bff/assistant/react', async (importOriginal) => {
  const original = await importOriginal<typeof AssistantReact>();
  const { createElement, useState, useEffect } = await import('react');
  return {
    ...original,
    BffHelper: ({
      onContact,
    }: {
      onContact: (kind: 'question', summary: string) => void;
    }) => {
      const [question, setQuestion] = useState('');
      useEffect(() => {
        auth.helperMounts += 1;
      }, []);
      return createElement(
        'div',
        {},
        createElement(
          'label',
          {},
          'Synthetic helper question',
          createElement('input', {
            value: question,
            onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
              setQuestion(event.target.value),
          }),
        ),
        createElement(
          'button',
          { onClick: () => onContact('question', question) },
          'Transfer reviewed summary',
        ),
      );
    },
  };
});
beforeEach(() => {
  auth.state = {
    ...auth.state,
    status: 'authenticated',
    accountId: 'account-one',
    customer: {
      ...auth.state.customer,
      user: { id: 'user-one', verifiedEmail: 'person@example.invalid' },
    },
  };
  auth.helperMounts = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            enabled: true,
            contactEmail: 'support@example.invalid',
          }),
          { status: 200 },
        ),
      ),
    ),
  );
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});
function ProductDraft() {
  const [text, setText] = useState('');
  return (
    <label>
      Unrelated product draft
      <input value={text} onChange={(event) => setText(event.target.value)} />
    </label>
  );
}
function surface(entry = '/') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <TableCardsApplicationProvider
            developmentControlsEnabled={false}
            operations={{
              apiBaseUrl: 'https://bff.example.invalid',
              environmentKey: 'tablecards-development',
            }}
          >
            <TableCardsHelpRoot />
          </TableCardsApplicationProvider>
        ),
        children: [
          {
            index: true,
            element: (
              <>
                <HelpActions />
                <ProductDraft />
              </>
            ),
          },
          { path: 'contact', element: <ContactPage /> },
        ],
      },
    ],
    { initialEntries: [entry] },
  );
  render(<RouterProvider router={router} />);
}
describe('TableCards support identity boundary', () => {
  it('clears a standalone contact page draft on account switch without retaining a hidden duplicate form', async () => {
    surface('/contact');
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.getAllByLabelText('Message')).toHaveLength(1);
    expect(
      screen.getByText(/Please do not include private guest lists/u),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'Private direct contact subject' },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Private direct contact message' },
    });
    act(() => {
      auth.state = { ...auth.state, accountId: 'account-two' };
      for (const callback of auth.listeners) callback();
    });
    expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe(
      '',
    );
    expect(
      (screen.getByLabelText('Message') as HTMLTextAreaElement).value,
    ).toBe('');
  });
  it.each(['account', 'user', 'sign-out'] as const)(
    'remounts helper and clears contact summary/draft when %s changes',
    async (change) => {
      surface();
      await waitFor(() => expect(fetch).toHaveBeenCalled());
      fireEvent.change(screen.getByLabelText('Unrelated product draft'), {
        target: { value: 'Keep unsaved card changes' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Help' }));
      fireEvent.change(screen.getByLabelText('Synthetic helper question'), {
        target: { value: 'Private first workspace summary' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: 'Transfer reviewed summary' }),
      );
      fireEvent.change(screen.getByLabelText('Subject'), {
        target: { value: 'Private first workspace subject' },
      });
      expect(
        (screen.getByLabelText('Message') as HTMLTextAreaElement).value,
      ).toBe('Private first workspace summary');
      act(() => {
        auth.state =
          change === 'account'
            ? { ...auth.state, accountId: 'account-two' }
            : change === 'user'
              ? {
                  ...auth.state,
                  customer: {
                    ...auth.state.customer,
                    user: {
                      id: 'user-two',
                      verifiedEmail: 'other@example.invalid',
                    },
                  },
                }
              : { ...auth.state, status: 'signed_out' };
        for (const callback of auth.listeners) callback();
      });
      expect(auth.helperMounts).toBe(2);
      expect(
        (screen.getByLabelText('Unrelated product draft') as HTMLInputElement)
          .value,
      ).toBe('Keep unsaved card changes');
      expect(document.body.textContent).not.toContain(
        'Private first workspace',
      );
      expect(
        (screen.getByLabelText('Synthetic helper question') as HTMLInputElement)
          .value,
      ).toBe('');
      if (change === 'sign-out')
        expect(screen.queryByLabelText('Message')).toBeNull();
      else {
        fireEvent.click(screen.getByRole('button', { name: 'Help' }));
        fireEvent.click(
          screen.getByRole('button', { name: 'Transfer reviewed summary' }),
        );
        expect(
          (screen.getByLabelText('Message') as HTMLTextAreaElement).value,
        ).toBe('');
        expect(
          (screen.getByLabelText('Subject') as HTMLInputElement).value,
        ).toBe('');
      }
      await waitFor(() =>
        expect(fetch).toHaveBeenCalledTimes(change === 'sign-out' ? 2 : 1),
      );
    },
  );
});
