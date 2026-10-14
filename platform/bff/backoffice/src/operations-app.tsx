import { api } from '@bff/service-api';
import { TestUserControl } from './test-user-control';
import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from 'convex/react';
import type { FunctionArgs, FunctionReturnType } from 'convex/server';
import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createBrowserRouter,
  Link,
  RouterProvider,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import {
  BusinessEventsView,
  CaseWorkspace,
  Coverage,
  destination,
  EmptyState,
  LoadingPanel,
  Notice,
  OperatorShell,
  OverviewView,
  PageHeading,
  SupportQueue,
  timestamp,
  type CaseView,
  type DraftView,
} from './operator-ui';

type Summary = FunctionReturnType<
  typeof api.operations.overview
>['cases'][number];
type Draft = NonNullable<
  FunctionReturnType<typeof api.operations.caseDetail>['draft']
>;
function caseView(value: Summary): CaseView {
  return {
    ...value,
    hasDraft: value.draftState === 'ready',
    deliveryException: value.deliveryException,
  };
}
function draftView(value: Draft): DraftView {
  return {
    pendingId: value.pendingId,
    text: value.text,
    recipient: value.to,
    sender: value.from,
    subject: value.subject,
    state: value.state,
    updatedAt: value.updatedAt,
    fingerprint: value.fingerprint,
    staleReason: value.staleReason,
    closing: value.closing,
    envelope: value.envelope,
  };
}

class QueryBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? (
      <EmptyState
        title="This view is unavailable"
        text="The request could not be completed. Other views remain available."
      >
        <button
          className="operator-button secondary"
          onClick={() => this.setState({ failed: false })}
        >
          Retry this view
        </button>
      </EmptyState>
    ) : (
      this.props.children
    );
  }
}
export function OperationsApp() {
  const router = useMemo(
    () => createBrowserRouter([{ path: '*', element: <OperatorWorkspace /> }]),
    [],
  );
  return <RouterProvider router={router} />;
}
function OperatorWorkspace() {
  const [search] = useSearchParams();
  const location = useLocation();
  const registry = useQuery(api.operations.overview, {});
  const environment = search.get('environment') ?? undefined;
  if (registry === undefined)
    return (
      <div className="operator-shell">
        <main className="operator-content">
          <LoadingPanel label="Loading your Business overview…" />
        </main>
      </div>
    );
  return (
    <OperatorShell scopes={registry.environments}>
      <QueryBoundary key={`${location.pathname}:${environment ?? 'all'}`}>
        {location.pathname === '/support' ? (
          <LiveSupport environment={environment} />
        ) : location.pathname === '/customers' ? (
          <LiveCustomers environment={environment} />
        ) : location.pathname === '/activity' ? (
          <LiveActivity environment={environment} />
        ) : location.pathname === '/bots' ? (
          <LiveBots environment={environment} />
        ) : location.pathname === '/more' ? (
          <>
            <PageHeading
              title="More"
              subtitle="Recorded activity and effective configuration."
            />
            <section className="operator-panel">
              <p>
                <Link to={destination('/activity', environment)}>Activity</Link>
              </p>
              <p>
                <Link to={destination('/bots', environment)}>
                  Bots and assigned knowledge
                </Link>
              </p>
              <p className="operator-secondary">
                Repeatable configuration is managed through the validated
                operator tools.
              </p>
            </section>
          </>
        ) : (
          <LiveOverview environment={environment} />
        )}
      </QueryBoundary>
    </OperatorShell>
  );
}
function LiveOverview({ environment }: { environment?: string }) {
  const overview = useQuery(
    api.operations.overview,
    environment ? { environmentKey: environment } : {},
  );
  if (!overview) return <LoadingPanel />;
  return (
    <OverviewView
      scopes={overview.environments}
      environment={environment}
      counts={overview.counts}
      cases={overview.cases.map(caseView)}
      longestWaiting={
        overview.longestWaiting ? caseView(overview.longestWaiting) : null
      }
      coverage={overview.coverage}
      businessKpis={overview.businessKpis}
    />
  );
}
function LiveSupport({ environment }: { environment?: string }) {
  const [search] = useSearchParams();
  const selected = search.get('case') ?? undefined;
  const filter = search.get('filter') ?? 'open';
  const status =
    filter === 'open' ||
    filter === 'waiting_for_customer' ||
    filter === 'resolved'
      ? filter
      : undefined;
  const cases = usePaginatedQuery(
    api.operations.cases,
    {
      ...(environment ? { environmentKey: environment } : {}),
      ...(status ? { status } : {}),
    },
    { initialNumItems: 25 },
  );
  if (cases.status === 'LoadingFirstPage')
    return <LoadingPanel label="Loading support queue…" />;
  return (
    <SupportQueue
      cases={cases.results.map(caseView)}
      environment={environment}
      selectedId={selected}
      coverage={{
        complete: cases.status === 'Exhausted',
        description:
          'More cases are available. This view shows the loaded page; use Load more to continue.',
      }}
      hasMore={cases.status === 'CanLoadMore'}
      loadingMore={cases.status === 'LoadingMore'}
      onLoadMore={() => cases.loadMore(25)}
    >
      {selected && environment ? (
        <QueryBoundary key={`${environment}:${selected}`}>
          <LiveCase
            key={`${environment}:${selected}`}
            environment={environment}
            conversationId={selected}
          />
        </QueryBoundary>
      ) : selected ? (
        <Notice kind="warning">
          Select the case’s Business environment to open it.
        </Notice>
      ) : undefined}
    </SupportQueue>
  );
}
function LiveCase({
  environment,
  conversationId,
}: {
  environment: string;
  conversationId: string;
}) {
  const args: FunctionArgs<typeof api.operations.caseDetail> = {
    environmentKey: environment,
    conversationId: conversationId as FunctionArgs<
      typeof api.operations.caseDetail
    >['conversationId'],
  };
  const detail = useQuery(api.operations.caseDetail, args);
  const save = useMutation(api.operations.saveDraft);
  const prepare = useMutation(api.operations.prepareReply);
  const send = useMutation(api.operations.sendReply);
  const note = useMutation(api.operations.addNote);
  const status = useMutation(api.operations.setStatus);
  const retry = useMutation(api.operations.retryDelivery);
  const readPreview = useAction(api.operationsAttachments.readPreview);
  if (!detail)
    return <LoadingPanel label="Loading conversation and customer context…" />;
  return (
    <CaseWorkspace
      detail={{
        ...detail,
        conversation: caseView(detail.conversation),
        draft: detail.draft ? draftView(detail.draft) : null,
        entries: detail.entries.map((entry) => ({
          ...entry,
          actor: entry.actorLabel,
        })),
        deliveries: detail.deliveries.map((delivery) => ({
          ...delivery,
          error: delivery.errorMessage,
        })),
      }}
      onSaveDraft={async (text, pendingId) =>
        draftView(
          await save({ ...args, text, ...(pendingId ? { pendingId } : {}) }),
        )
      }
      onPrepare={async (pendingId, closing) =>
        draftView(await prepare({ ...args, pendingId, closing }))
      }
      onSend={(pendingId, closing) => send({ ...args, pendingId, closing })}
      onNote={(text) => note({ ...args, text })}
      onStatus={(next) => status({ ...args, status: next })}
      onRetry={(deliveryId) =>
        retry({
          ...args,
          deliveryId: deliveryId as FunctionArgs<
            typeof api.operations.retryDelivery
          >['deliveryId'],
        })
      }
      onPreviewAttachment={(attachmentId) =>
        readPreview({
          environmentKey: environment,
          attachmentId: attachmentId as FunctionArgs<
            typeof api.operationsAttachments.readPreview
          >['attachmentId'],
        })
      }
      olderHistory={
        !detail.coverage.complete ? (
          <OlderHistory
            args={args}
            visibleIds={detail.entries.map((entry) => entry.id)}
          />
        ) : undefined
      }
    />
  );
}
function OlderHistory({
  args,
  visibleIds,
}: {
  args: FunctionArgs<typeof api.operations.caseDetail>;
  visibleIds: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="operator-context">
      <button
        className="operator-text-button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {open ? 'Hide earlier history' : 'Load earlier history'}
      </button>
      {open ? <EarlierEntries args={args} visibleIds={visibleIds} /> : null}
    </div>
  );
}
function EarlierEntries({
  args,
  visibleIds,
}: {
  args: FunctionArgs<typeof api.operations.caseDetail>;
  visibleIds: string[];
}) {
  const history = usePaginatedQuery(api.operations.caseHistory, args, {
    initialNumItems: 50,
  });
  const earlier = history.results.filter(
    (entry) => !visibleIds.includes(entry.id),
  );
  useEffect(() => {
    if (earlier.length === 0 && history.status === 'CanLoadMore')
      history.loadMore(50);
  }, [earlier.length, history.status, history.loadMore]);
  return (
    <>
      <ol className="operator-history" aria-label="Earlier case history">
        {[...earlier].reverse().map((entry) => (
          <li
            key={entry.id}
            className={entry.visibility === 'internal' ? 'internal' : ''}
          >
            <strong>{entry.kind.replaceAll('_', ' ')}</strong>
            <span className="operator-secondary">
              {' '}
              · {entry.actorLabel} · {timestamp(entry.createdAt)}
            </span>
            <p>{entry.text}</p>
          </li>
        ))}
      </ol>
      {history.status === 'Exhausted' ? (
        <p className="operator-secondary">Beginning of available history.</p>
      ) : (
        <button
          className="operator-button secondary"
          disabled={history.status !== 'CanLoadMore'}
          onClick={() => history.loadMore(50)}
        >
          {history.status === 'CanLoadMore'
            ? 'Load earlier messages'
            : 'Loading earlier messages…'}
        </button>
      )}
    </>
  );
}
function LiveCustomers({ environment }: { environment?: string }) {
  if (!environment)
    return (
      <>
        <PageHeading title="Customers" />
        <EmptyState
          title="Choose a Business"
          text="Customer investigation stays inside one Business environment. Select it above to search or browse customers."
        />
      </>
    );
  return <ScopedCustomers key={environment} environment={environment} />;
}
function ScopedCustomers({ environment }: { environment: string }) {
  const [search, setSearch] = useSearchParams();
  const [input, setInput] = useState(search.get('customer') ?? '');
  const exact = search.get('customer') ?? '';
  const users = usePaginatedQuery(
    api.customerBackoffice.users,
    { environmentKey: environment },
    { initialNumItems: 25 },
  );
  const matching = useQuery(
    api.customerBackoffice.userLookup,
    exact ? { environmentKey: environment, exact } : 'skip',
  );
  const visible = exact ? matching : users.results;
  return (
    <>
      <PageHeading
        title="Customers"
        subtitle="Investigate a customer without requiring an existing support case."
      />
      <section className="operator-panel">
        <form
          className="operator-search"
          onSubmit={(event) => {
            event.preventDefault();
            const next = new URLSearchParams(search);
            if (input.trim()) next.set('customer', input.trim());
            else next.delete('customer');
            setSearch(next);
          }}
        >
          <label className="operator-field">
            Exact email or public customer ID
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Email or customer ID"
            />
          </label>
          <button className="operator-button">Find customer</button>
          {exact ? (
            <button
              type="button"
              className="operator-button secondary"
              onClick={() => {
                const next = new URLSearchParams(search);
                next.delete('customer');
                setSearch(next);
                setInput('');
              }}
            >
              Clear
            </button>
          ) : null}
        </form>
        {visible === undefined ||
        (!exact && users.status === 'LoadingFirstPage') ? (
          <LoadingPanel />
        ) : visible.length === 0 ? (
          <p>
            {exact
              ? 'No exact match in this Business environment.'
              : 'No customers in this page.'}
          </p>
        ) : (
          <ul className="operator-data-list">
            {visible.map((user) => (
              <li key={user.id}>
                <Link
                  to={destination('/customers', environment, {
                    customer: user.id,
                  })}
                >
                  {user.displayName}
                </Link>
                <span>{user.verifiedEmail}</span>
                {user.isTestUser ? <span>Test user</span> : null}
                <span>{user.id}</span>
                <span>
                  Registered {timestamp(user.createdAt)} ·{' '}
                  {user.activeMembershipCount} active memberships
                </span>
              </li>
            ))}
          </ul>
        )}
        {!exact && users.status === 'CanLoadMore' ? (
          <button
            className="operator-button secondary"
            onClick={() => users.loadMore(25)}
          >
            Load more customers
          </button>
        ) : null}
        <p className="operator-secondary">
          These are scoped customer records, not unique people across
          Businesses.
        </p>
      </section>
      {exact && matching?.length === 1 ? (
        <LiveCustomerDetail
          key={matching[0]!.id}
          environment={environment}
          userPublicId={matching[0]!.id}
        />
      ) : null}
    </>
  );
}
function LiveCustomerDetail({
  environment,
  userPublicId,
}: {
  environment: string;
  userPublicId: string;
}) {
  const detail = useQuery(api.operations.customerDetail, {
    environmentKey: environment,
    userPublicId,
  });
  const [accountId, setAccountId] = useState<string>();
  const setTestUser = useMutation(api.customerBackoffice.setTestUser);
  if (!detail)
    return (
      <LoadingPanel label="Loading customer, accounts and related evidence…" />
    );
  const account =
    detail.accounts.find((item) => item.id === accountId) ?? detail.accounts[0];
  return (
    <>
      <Coverage coverage={detail.coverage} />
      <TestUserControl
        enabled={detail.user.isTestUser}
        customer={detail.user.verifiedEmail}
        onSave={(isTestUser) =>
          setTestUser({
            environmentKey: environment,
            userPublicId,
            isTestUser,
            expectedIsTestUser: detail.user.isTestUser,
          })
        }
      />
      <section className="operator-panel">
        <div className="operator-section-heading">
          <h2>Business events</h2>
          <span>
            {detail.events.length}{' '}
            {detail.eventsComplete ? 'recorded' : 'most recent'}
          </span>
        </div>
        <p className="operator-secondary">
          Reported actions and outcomes for this customer, newest first. Other
          workspace members and unlinked events are not included.
        </p>
        <BusinessEventsView events={detail.events} />
        {!detail.eventsComplete ? (
          <p className="operator-secondary">
            Showing the latest 30 events, not the complete history.
          </p>
        ) : null}
        <Link
          to={destination('/activity', environment, { customer: userPublicId })}
        >
          View all customer events
        </Link>
      </section>
      <div className="operator-briefing">
        <section className="operator-panel">
          <h2>Customer and workspace</h2>
          <p>
            {detail.user.displayName} · {detail.user.verifiedEmail}
          </p>
          {detail.accounts.length ? (
            <>
              <label className="operator-field">
                Account context
                <select
                  value={account?.id ?? ''}
                  onChange={(event) => setAccountId(event.target.value)}
                >
                  {detail.accounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.displayName} · {item.role}
                    </option>
                  ))}
                </select>
              </label>
              <dl className="operator-envelope">
                <dt>Offer</dt>
                <dd>{account?.offerKey ?? 'No current offer recorded'}</dd>
                <dt>Role</dt>
                <dd>{account?.role}</dd>
              </dl>
              <p className="operator-secondary">
                An offer records access, not proof of payment. Preview access is
                not a paid subscription.
              </p>
              <h3>Recorded units</h3>
              {account?.unitBalances.length ? (
                <ul className="operator-data-list">
                  {account.unitBalances.map((unit) => (
                    <li key={`${unit.unitType}:${unit.periodKey}`}>
                      <strong>{unit.unitType}</strong>
                      <span>{unit.periodKey}</span>
                      <span>
                        {Math.max(
                          0,
                          unit.allowance - unit.reserved - unit.consumed,
                        )}{' '}
                        remaining · {unit.reserved} reserved · {unit.consumed}{' '}
                        consumed / {unit.allowance}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No unit balance is recorded for this account.</p>
              )}
              <details className="operator-context">
                <summary>Current limits and capabilities</summary>
                {account?.numericLimits.map((item) => (
                  <p key={item.key}>
                    {item.key}: {item.value}
                  </p>
                ))}
                {account?.featureFlags.map((item) => (
                  <p key={item.key}>
                    {item.key}: {item.enabled ? 'Enabled' : 'Not enabled'}
                  </p>
                ))}
              </details>
            </>
          ) : (
            <p>No current workspace membership is recorded.</p>
          )}
        </section>
        <section className="operator-panel">
          <h2>Related support</h2>
          {detail.cases.length ? (
            <ul className="operator-data-list">
              {detail.cases.map((item) => (
                <li key={item.id}>
                  <Link
                    to={destination('/support', environment, {
                      case: item.id,
                      filter: 'all',
                    })}
                  >
                    {item.subject}
                  </Link>
                  <span>{item.status.replaceAll('_', ' ')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No related cases in the available evidence.</p>
          )}
        </section>
      </div>
      <section className="operator-panel">
        <h2>Access evidence</h2>
        <details className="operator-context">
          <summary>Sign-in and session evidence</summary>
          {detail.sessions.map((item) => (
            <p key={item.id}>
              {item.revoked
                ? 'Revoked session'
                : item.expiresAt <= Date.now()
                  ? 'Expired session'
                  : 'Active session'}{' '}
              · last seen {timestamp(item.lastSeenAt)}
            </p>
          ))}
          {detail.security.map((item) => (
            <p key={`${item.correlationId}:${item.occurredAt}`}>
              {item.type.replaceAll('_', ' ')} · {timestamp(item.occurredAt)}
            </p>
          ))}
        </details>
      </section>
    </>
  );
}
function LiveActivity({ environment }: { environment?: string }) {
  const [search] = useSearchParams();
  const customer = environment
    ? (search.get('customer') ?? undefined)
    : undefined;
  const activity = usePaginatedQuery(
    api.operations.activity,
    environment
      ? {
          environmentKey: environment,
          ...(customer ? { userPublicId: customer } : {}),
        }
      : {},
    { initialNumItems: 25 },
  );
  return (
    <>
      <PageHeading
        title={customer ? 'Customer events' : 'Activity'}
        subtitle={
          customer
            ? 'Reported actions and outcomes linked to this customer only, newest first.'
            : 'Reported milestones and meaningful failures. Missing evidence does not prove inactivity.'
        }
        action={
          customer ? (
            <Link to={destination('/customers', environment, { customer })}>
              Back to customer
            </Link>
          ) : undefined
        }
      />
      {activity.status === 'LoadingFirstPage' ? (
        <LoadingPanel />
      ) : (
        <section className="operator-panel">
          <BusinessEventsView
            events={activity.results}
            showEnvironment={!environment}
          />
          {activity.status !== 'Exhausted' ? (
            <button
              className="operator-button secondary"
              disabled={activity.status === 'LoadingMore'}
              onClick={() => activity.loadMore(25)}
            >
              {activity.status === 'LoadingMore'
                ? 'Loading…'
                : 'Load more activity'}
            </button>
          ) : null}
        </section>
      )}
    </>
  );
}
function LiveBots({ environment }: { environment?: string }) {
  const businesses = useQuery(
    api.operations.bots,
    environment ? { environmentKey: environment } : {},
  );
  return (
    <>
      <PageHeading
        title="Bots and knowledge"
        subtitle="Effective configuration. Support reads are automatic; every substantive reply needs an operator’s Send decision."
      />
      {businesses === undefined ? (
        <LoadingPanel />
      ) : (
        businesses.map((business) => (
          <section className="operator-panel" key={business.environmentKey}>
            <h2>{business.businessName}</h2>
            <p className="operator-secondary">
              {business.environmentKey} · Configuration{' '}
              {business.configurationRevision} ·{' '}
              {business.enabled ? 'Enabled' : 'Not enabled'}
            </p>
            {business.bots.length ? (
              business.bots.map((bot) => (
                <div className="operator-context" key={bot.key}>
                  <h3>{bot.name}</h3>
                  <p>
                    {bot.kind === 'support'
                      ? 'Suggested replies for operator review'
                      : 'Customer help'}{' '}
                    · Version {bot.version}
                  </p>
                  <p className="operator-secondary">Model: {bot.model}</p>
                  <details>
                    <summary>Assigned knowledge ({bot.skills.length})</summary>
                    <ul>
                      {bot.skills.map((skill) => (
                        <li key={skill.key}>
                          <strong>{skill.name}</strong> · v{skill.version}
                          <p>{skill.whenToUse}</p>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              ))
            ) : (
              <p>No bots are configured for this environment.</p>
            )}
          </section>
        ))
      )}
    </>
  );
}
