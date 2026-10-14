import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BusinessEventsView,
  CaseWorkspace,
  OverviewView,
  SupportQueue,
  waitLabel,
  type CaseDetailView,
  type DraftView,
} from './operator-ui';
afterEach(cleanup);

const initial: CaseDetailView = {
  conversation: {
    id: 'case-one',
    publicId: 'SUP-SYNTHETIC',
    environmentKey: 'example-development',
    subject: 'The cards print too small',
    contactEmail: 'synthetic@example.invalid',
    status: 'open',
    createdAt: 1000,
    updatedAt: 2000,
    waitingSince: 1000,
    hasDraft: true,
  },
  draft: {
    pendingId: 'pending-one',
    text: 'Use actual size / 100%.',
    recipient: 'synthetic@example.invalid',
    sender: 'support@example.invalid',
    subject: 'Re: The cards print too small',
    state: 'ready',
    fingerprint: 'one',
  },
  entries: [
    {
      id: 'entry-one',
      kind: 'customer_message',
      text: 'Printed with fit to page.',
      createdAt: 1000,
      actor: 'Synthetic customer',
    },
  ],
  deliveries: [],
  customer: null,
  coverage: { complete: true },
};
function TestCase({
  send,
  note = vi.fn().mockResolvedValue(undefined),
}: {
  send: ReturnType<typeof vi.fn>;
  note?: ReturnType<typeof vi.fn>;
}) {
  const [detail, setDetail] = useState(initial);
  return (
    <>
      <button
        onClick={() =>
          setDetail((current) => ({
            ...current,
            draft: current.draft
              ? {
                  ...current.draft,
                  state: 'needs_review',
                  fingerprint: 'changed',
                }
              : null,
          }))
        }
      >
        Simulate new customer message
      </button>
      <CaseWorkspace
        detail={detail}
        onSaveDraft={async (text) => {
          const draft: DraftView = {
            ...initial.draft!,
            pendingId: 'pending-two',
            text,
            fingerprint: 'two',
          };
          setDetail((current) => ({ ...current, draft }));
          return draft;
        }}
        onPrepare={async (pendingId, closing) => {
          const draft: DraftView = {
            ...detail.draft!,
            pendingId,
            fingerprint: closing ? 'closing' : 'prepared',
            closing,
            envelope: {
              from: 'support@example.invalid',
              to: 'synthetic@example.invalid',
              replyTo: 'reply+synthetic@example.invalid',
              subject: 'Exact prepared subject',
              text: closing
                ? 'Exact approved text.\nDid you get the help you needed?\nhttps://example.invalid/survey'
                : 'Exact approved text.',
              attachmentIds: [],
            },
          };
          setDetail((current) => ({ ...current, draft }));
          return draft;
        }}
        onSend={send}
        onNote={note}
        onStatus={vi.fn().mockResolvedValue(undefined)}
      />
    </>
  );
}
function route(
  element: React.ReactNode,
  entry = '/support?environment=example-development&case=case-one',
) {
  const router = createMemoryRouter([{ path: '*', element }], {
    initialEntries: [entry],
  });
  render(<RouterProvider router={router} />);
  return router;
}

describe('Operator work journeys', () => {
  it('shows Business-supplied KPI definitions, window, evidence links and honest lower bounds', () => {
    route(
      <OverviewView
        scopes={[]}
        counts={{
          open: 0,
          waitingForCustomer: 0,
          pendingDrafts: 0,
          resolved: 0,
          deliveryExceptions: 0,
        }}
        cases={[]}
        coverage={{ complete: true }}
        businessKpis={[
          {
            environmentKey: 'example-development',
            businessName: 'Example',
            environmentName: 'Development',
            windowStart: 1000,
            windowEnd: 2000,
            complete: false,
            metrics: [
              {
                key: 'saves',
                label: 'Items saved',
                description: 'Recorded item saves, not unique items.',
                value: 12,
                trend: [0, 2, 4, 0, 1, 3, 2].map((value, index) => ({
                  startAt: index * 86400000,
                  endAt: (index + 1) * 86400000,
                  value,
                })),
              },
            ],
          },
        ]}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Business KPIs' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(
      screen.getByRole('rowheader', { name: 'Items saved' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('At least')).toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveAccessibleName(
      /Example recorded Business KPIs/,
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(
      /partial sample.*0, 2, 4, 0, 1, 3, 2/,
    );
    fireEvent.click(screen.getByText('Metric definitions and daily counts'));
    expect(
      screen.getByText('Recorded item saves, not unique items.'),
    ).toBeVisible();
    expect(
      screen.getByText(/these values are lower bounds/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View recorded activity' }),
    ).toHaveAttribute('href', '/activity?environment=example-development');
  });
  it('renders empty and flat trends without inventing growth or invalid SVG coordinates', () => {
    route(
      <OverviewView
        scopes={[]}
        counts={{
          open: 0,
          waitingForCustomer: 0,
          resolved: 0,
          pendingDrafts: 0,
          deliveryExceptions: 0,
        }}
        cases={[]}
        coverage={{ complete: true }}
        businessKpis={[
          {
            environmentKey: 'example-development',
            businessName: 'Example',
            environmentName: 'Development',
            windowStart: 0,
            windowEnd: 7 * 86400000,
            complete: true,
            metrics: [0, 2].map((value) => ({
              key: `count-${value}`,
              label: `Count ${value}`,
              description: 'Recorded count.',
              value: value * 7,
              trend: Array.from({ length: 7 }, (_, index) => ({
                startAt: index * 86400000,
                endAt: (index + 1) * 86400000,
                value,
              })),
            })),
          },
        ]}
      />,
    );
    expect(screen.getAllByRole('img')).toHaveLength(2);
    for (const chart of screen.getAllByRole('img')) {
      const coordinates = chart
        .querySelector('polyline')!
        .getAttribute('points')!;
      expect(coordinates).not.toMatch(/NaN|Infinity/);
      expect(
        new Set(coordinates.split(' ').map((point) => point.split(',')[1]))
          .size,
      ).toBe(1);
    }
    expect(screen.queryByText(/growth|% increase/i)).not.toBeInTheDocument();
  });
  it('shows Business labels, linked reference and useful properties as text with an honest empty state', () => {
    const { rerender } = render(
      <BusinessEventsView
        events={[
          {
            id: 'event-one',
            environmentKey: 'example-development',
            name: 'item.saved',
            label: 'Item saved',
            version: 1,
            occurredAt: 1000,
            productReference: 'item-public-id',
            properties: {
              itemCount: 12,
              itemReference: 'item-public-id',
              reason_code: 'timeout',
              note: '<script>not executable</script>',
              missing: null,
            },
          },
        ]}
      />,
    );
    expect(
      screen.getByRole('list', { name: 'Business events' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Item saved')).toBeVisible();
    expect(screen.getByText('item-public-id')).toBeVisible();
    expect(screen.getAllByText('item-public-id')).toHaveLength(1);
    expect(screen.getByText('item Count')).toBeVisible();
    expect(screen.getByText('12')).toBeVisible();
    expect(screen.getByText('<script>not executable</script>')).toBeVisible();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText('Not recorded')).toBeVisible();
    fireEvent.click(screen.getByText('Event identifier'));
    expect(screen.getByText('item.saved · v1')).toBeVisible();
    rerender(<BusinessEventsView events={[]} />);
    expect(
      screen.getByText(/Missing records do not prove inactivity/),
    ).toBeVisible();
  });
  it('shows delivery exceptions above sparse summaries and qualifies partial evidence', () => {
    route(
      <OverviewView
        scopes={[]}
        counts={{
          open: 3,
          waitingForCustomer: 1,
          pendingDrafts: 2,
          resolved: 0,
          deliveryExceptions: 1,
        }}
        cases={[initial.conversation]}
        coverage={{
          complete: false,
          description: 'Only the bounded sample is available.',
        }}
      />,
    );
    expect(
      screen.getByText(/1 delivery problem needs attention/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Only the bounded sample/)).toBeInTheDocument();
    expect(screen.queryByText(/all clear/i)).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Review delivery problems' }),
    ).toHaveAttribute('href', '/support?filter=delivery');
  });
  it('requires exact prepared review before send and leaves case status separate', async () => {
    const send = vi.fn().mockResolvedValue({ state: 'queued' });
    route(<TestCase send={send} />);
    expect(screen.queryByRole('button', { name: 'Send reply' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Review reply' }));
    expect(await screen.findByText('Exact approved text.')).toBeInTheDocument();
    expect(
      screen.getByText('reply+synthetic@example.invalid'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sending leaves the case open/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith('pending-two', false),
    );
    expect(
      await screen.findByText(/Reply approved and queued/),
    ).toBeInTheDocument();
  });
  it('invalidates the open exact review when customer context changes', async () => {
    const send = vi.fn();
    route(<TestCase send={send} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review reply' }));
    await screen.findByText('Exact approved text.');
    fireEvent.click(
      screen.getByRole('button', { name: 'Simulate new customer message' }),
    );
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled();
    expect(screen.getByText(/Nothing has been sent/)).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });
  it('saves an attributed internal note without sending an email', async () => {
    const note = vi.fn().mockResolvedValue(undefined);
    const send = vi.fn();
    route(<TestCase send={send} note={note} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add internal note' }));
    fireEvent.change(screen.getByLabelText(/Internal note · only operators/), {
      target: { value: 'Check the reported print scaling first.' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Add note', exact: true }),
    );
    await waitFor(() =>
      expect(note).toHaveBeenCalledWith(
        'Check the reported print scaling first.',
      ),
    );
    expect(send).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/The customer cannot see it/),
    ).toBeInTheDocument();
  });
  it('marks a loaded queue as partial instead of presenting its length as a total', () => {
    route(
      <SupportQueue
        cases={[initial.conversation]}
        coverage={{ complete: false, description: 'More cases are available.' }}
        hasMore
        onLoadMore={vi.fn()}
      />,
    );
    expect(screen.getByText('More cases are available.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Load more cases' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('1 total cases')).toBeNull();
  });
  it('formats the current uninterrupted wait without creation-age assumptions', () => {
    expect(waitLabel(1000, 1000 + 29 * 3_600_000)).toBe('1 day 5 hr');
    expect(waitLabel(1000, 20_000)).toBe('Less than a minute');
  });
});
