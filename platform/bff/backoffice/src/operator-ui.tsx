import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  Link,
  NavLink,
  useBlocker,
  useLocation,
  useSearchParams,
} from 'react-router-dom';

export type CaseStatus = 'open' | 'waiting_for_customer' | 'resolved';
export const STATUS_LABELS: Record<CaseStatus, string> = {
  open: 'Open',
  waiting_for_customer: 'Waiting for customer',
  resolved: 'Resolved',
};

export interface ScopeView {
  key: string;
  businessName: string;
  environmentName: string;
  enabled?: boolean;
}
export interface CoverageView {
  complete: boolean;
  description?: string;
}
export interface CaseView {
  id: string;
  publicId: string;
  environmentKey: string;
  subject: string;
  contactEmail: string;
  status: CaseStatus;
  updatedAt: number;
  createdAt: number;
  waitingSince?: number;
  hasDraft?: boolean;
  deliveryException?: string | boolean;
}
export interface DraftView {
  pendingId: string;
  text: string;
  recipient: string;
  subject: string;
  sender?: string;
  state?: string;
  updatedAt?: number;
  fingerprint?: string;
  staleReason?: string;
  closing?: boolean;
  envelope?: {
    from: string;
    to: string;
    replyTo: string;
    subject: string;
    text: string;
    attachmentIds: string[];
  };
}
export interface EntryView {
  id: string;
  kind: string;
  text: string;
  visibility?: string;
  actor?: string;
  createdAt: number;
}
export interface DeliveryView {
  id: string;
  state: string;
  error?: string;
  retryEligible?: boolean;
  mocked?: boolean;
}
export interface CaseDetailView {
  conversation: CaseView;
  draft: DraftView | null;
  entries: EntryView[];
  deliveries: DeliveryView[];
  customer: {
    userId?: string;
    accountId?: string;
    displayName?: string;
    verifiedEmail?: string;
    accountName?: string;
  } | null;
  coverage: CoverageView;
  attachments?: Array<{
    id: string;
    name: string;
    state: string;
    blockReason?: string;
  }>;
  feedback?: Array<{
    id: string;
    rating?: string;
    comment?: string;
    invitedAt?: number;
    submittedAt?: number;
    activated: boolean;
  }>;
}
export interface WorkCounts {
  open: number;
  waitingForCustomer: number;
  resolved: number;
  pendingDrafts: number;
  deliveryExceptions: number;
}
export interface BusinessKpiView {
  environmentKey: string;
  businessName: string;
  environmentName: string;
  windowStart: number;
  windowEnd: number;
  complete: boolean;
  metrics: Array<{
    key: string;
    label: string;
    description: string;
    value: number;
    trend?: Array<{ startAt: number; endAt: number; value: number }>;
  }>;
}
export interface BusinessEventView {
  id: string;
  environmentKey: string;
  name: string;
  label: string;
  version: number;
  occurredAt: number;
  properties: Record<string, string | number | boolean | null>;
  productReference?: string;
}

function TrendLine({
  label,
  trend,
  complete,
}: {
  label: string;
  trend: NonNullable<BusinessKpiView['metrics'][number]['trend']>;
  complete: boolean;
}) {
  const titleId = useId();
  if (trend.length !== 7)
    return <span className="operator-secondary">Unavailable</span>;
  const maximum = Math.max(1, ...trend.map((point) => point.value));
  const points = trend.map((point, index) => ({
    x: 4 + index * 20,
    y: 36 - (point.value / maximum) * 30,
  }));
  return (
    <svg
      className="operator-trend"
      viewBox="0 0 128 42"
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>
        {label}: {complete ? '' : 'partial sample, '}seven consecutive 24-hour
        counts, oldest to newest: {trend.map((point) => point.value).join(', ')}
      </title>
      <path className="operator-trend-baseline" d="M4 36H124" />
      <polyline
        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
      />
      <circle cx={points[6]!.x} cy={points[6]!.y} r="3" />
    </svg>
  );
}

export function BusinessEventsView({
  events,
  showEnvironment = false,
}: {
  events: BusinessEventView[];
  showEnvironment?: boolean;
}) {
  return events.length === 0 ? (
    <p>
      No business events linked to this view yet. Missing records do not prove
      inactivity.
    </p>
  ) : (
    <ol className="operator-event-timeline" aria-label="Business events">
      {events.map((event) => {
        // Some event definitions also carry the product reference as a
        // property. Keep the reference visible once, without repeating it.
        const properties = Object.entries(event.properties).filter(
          ([, value]) => value !== event.productReference,
        );
        return (
          <li key={event.id}>
            <div className="operator-entry-heading">
              <strong>{event.label}</strong>
              <time dateTime={new Date(event.occurredAt).toISOString()}>
                {timestamp(event.occurredAt)}
              </time>
            </div>
            {showEnvironment ? (
              <p className="operator-secondary">{event.environmentKey}</p>
            ) : null}
            {event.productReference ? (
              <p className="operator-event-reference">
                Reference: <code>{event.productReference}</code>
              </p>
            ) : null}
            {properties.length ? (
              <dl className="operator-event-properties">
                {properties.map(([key, value]) => (
                  <div key={key}>
                    <dt>
                      {key
                        .replace(/([a-z])([A-Z])/g, '$1 $2')
                        .replaceAll('_', ' ')}
                    </dt>
                    <dd>{value === null ? 'Not recorded' : String(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <details className="operator-event-definition">
              <summary>Event identifier</summary>
              <code>
                {event.name} · v{event.version}
              </code>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

export function destination(
  path: string,
  environment?: string,
  extras?: Record<string, string>,
) {
  const query = new URLSearchParams(extras);
  if (environment) query.set('environment', environment);
  return `${path}${query.size ? `?${query}` : ''}`;
}

export function timestamp(value: number) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export function waitLabel(since: number, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - since) / 60_000));
  if (minutes < 1) return 'Less than a minute';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ${minutes % 60} min`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ${hours % 24} hr`;
}

export function OperatorShell({
  scopes,
  children,
  healthWarning,
}: {
  scopes: ScopeView[];
  children: ReactNode;
  healthWarning?: string;
}) {
  const [search, setSearch] = useSearchParams();
  const location = useLocation();
  const environment = search.get('environment') ?? undefined;
  const scope = scopes.find((item) => item.key === environment);
  const nav = [
    { path: '/', label: 'Overview' },
    { path: '/support', label: 'Support' },
    { path: '/customers', label: 'Customers' },
    { path: '/activity', label: 'Activity' },
    { path: '/bots', label: 'Bots' },
  ];
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('#operator-content h1')
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, search.get('case'), search.get('review')]);
  return (
    <div className="operator-shell">
      <a className="operator-skip" href="#operator-content">
        Skip to content
      </a>
      <aside className="operator-rail">
        <Link className="operator-brand" to="/">
          Business Factory<span>Operator desk</span>
        </Link>
        <nav aria-label="Operator navigation">
          {nav.map((item) => (
            <NavLink
              end={item.path === '/'}
              key={item.path}
              to={destination(item.path, environment)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <p className="operator-rail-note">
          A shared view.
          <br />
          Every action is attributed.
        </p>
      </aside>
      <div className="operator-main">
        <header className="operator-topbar">
          <Link className="operator-mobile-brand" to="/">
            Business Factory
          </Link>
          <label className="operator-scope">
            <span>Business / environment</span>
            <select
              value={environment ?? ''}
              onChange={(event) => {
                const next = new URLSearchParams(search);
                if (event.target.value)
                  next.set('environment', event.target.value);
                else next.delete('environment');
                next.delete('case');
                next.delete('review');
                next.delete('customer');
                setSearch(next);
              }}
            >
              <option value="">All Businesses</option>
              {scopes.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.businessName} · {item.environmentName}
                </option>
              ))}
            </select>
          </label>
          <span className="operator-scope-caption">
            {scope?.environmentName ?? 'Across registered environments'}
          </span>
        </header>
        <main id="operator-content" className="operator-content">
          {healthWarning ? (
            <Notice kind="warning">{healthWarning}</Notice>
          ) : null}
          {environment && !scope ? (
            <EmptyState
              title="This environment is unavailable"
              text="Choose a registered Business environment to continue."
            />
          ) : (
            children
          )}
        </main>
      </div>
      <nav
        className="operator-mobile-nav"
        aria-label="Mobile operator navigation"
      >
        {nav.slice(0, 3).map((item) => (
          <NavLink
            end={item.path === '/'}
            key={item.path}
            to={destination(item.path, environment)}
          >
            {item.label}
          </NavLink>
        ))}
        <NavLink to={destination('/more', environment)}>More</NavLink>
      </nav>
    </div>
  );
}

export function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="operator-page-heading">
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
export function Notice({
  children,
  kind = 'info',
}: {
  children: ReactNode;
  kind?: 'info' | 'error' | 'warning' | 'success';
}) {
  return (
    <div
      className={`operator-notice ${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}
export function EmptyState({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <section className="operator-panel operator-empty">
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </section>
  );
}
export function LoadingPanel({
  label = 'Loading current evidence…',
}: {
  label?: string;
}) {
  return (
    <section className="operator-panel operator-loading" aria-busy="true">
      <p role="status">{label}</p>
      <div />
      <div />
      <div />
    </section>
  );
}
export function Coverage({ coverage }: { coverage: CoverageView }) {
  return coverage.complete ? null : (
    <Notice kind="warning">
      {coverage.description ??
        'This view contains partial evidence. Counts cover the available records, not the complete Business.'}
    </Notice>
  );
}
export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className={`operator-badge ${status}`}>{STATUS_LABELS[status]}</span>
  );
}

export function OverviewView({
  scopes,
  environment,
  counts,
  cases,
  coverage,
  longestWaiting,
  businessKpis = [],
}: {
  scopes: ScopeView[];
  environment?: string;
  counts: WorkCounts;
  cases: CaseView[];
  coverage: CoverageView;
  longestWaiting?: CaseView | null;
  businessKpis?: BusinessKpiView[];
}) {
  const scope = scopes.find((item) => item.key === environment);
  const waiting = [
    ...(longestWaiting ? [longestWaiting] : []),
    ...cases.filter(
      (item) =>
        item.id !== longestWaiting?.id &&
        item.status === 'open' &&
        item.waitingSince !== undefined,
    ),
  ].sort((a, b) => a.waitingSince! - b.waitingSince!);
  return (
    <>
      <PageHeading
        title={scope ? scope.businessName : 'Business overview'}
        subtitle={
          scope
            ? `${scope.environmentName} · Current support and recorded outcomes`
            : 'A concise view of your Businesses and what needs attention.'
        }
      />
      {counts.deliveryExceptions > 0 ? (
        <Notice kind="error">
          <strong>
            {counts.deliveryExceptions} delivery{' '}
            {counts.deliveryExceptions === 1
              ? 'problem needs'
              : 'problems need'}{' '}
            attention.
          </strong>{' '}
          A customer may not have received our message.{' '}
          <Link
            to={destination('/support', environment, { filter: 'delivery' })}
          >
            Review delivery problems
          </Link>
        </Notice>
      ) : null}
      <Coverage coverage={coverage} />
      <div className="operator-briefing">
        <div>
          <section className="operator-panel">
            <div className="operator-section-heading">
              <h2>Business KPIs</h2>
              <span>Last 7 days</span>
            </div>
            <p className="operator-secondary">
              Recorded product activity, not lifetime totals. Missing events do
              not prove inactivity. Development includes synthetic test records.
            </p>
            {businessKpis.length === 0 ? (
              <p>No KPI definitions are configured for this scope yet.</p>
            ) : (
              businessKpis.map((group) => (
                <section
                  key={group.environmentKey}
                  className="operator-kpi-group"
                >
                  {!environment ? (
                    <h3>
                      {group.businessName} · {group.environmentName}
                    </h3>
                  ) : null}
                  <table className="operator-kpi-table">
                    <caption className="operator-sr-only">
                      {group.businessName} recorded Business KPIs for the last
                      seven days
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Metric</th>
                        <th scope="col">Count</th>
                        <th scope="col">7-day trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.metrics.map((metric) => (
                        <tr key={metric.key}>
                          <th scope="row">{metric.label}</th>
                          <td className="operator-kpi-value">
                            {group.complete ? (
                              ''
                            ) : (
                              <span aria-label="At least">≥ </span>
                            )}
                            {metric.value.toLocaleString('en')}
                          </td>
                          <td>
                            {metric.trend ? (
                              <TrendLine
                                label={metric.label}
                                trend={metric.trend}
                                complete={group.complete}
                              />
                            ) : (
                              <span className="operator-secondary">
                                Unavailable
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="operator-secondary operator-trend-caption">
                    Oldest → newest · seven 24-hour intervals. Each line has its
                    own scale.
                  </p>
                  <details className="operator-context">
                    <summary>Metric definitions and daily counts</summary>
                    {group.metrics.map((metric) => (
                      <div
                        className="operator-metric-definition"
                        key={metric.key}
                      >
                        <strong>{metric.label}</strong>
                        <p>{metric.description}</p>
                        {metric.trend ? (
                          <ol>
                            {metric.trend.map((point) => (
                              <li key={point.startAt}>
                                {timestamp(point.startAt)} –{' '}
                                {timestamp(point.endAt)}:{' '}
                                {group.complete ? '' : 'at least '}
                                {point.value.toLocaleString('en')}
                              </li>
                            ))}
                          </ol>
                        ) : null}
                      </div>
                    ))}
                  </details>
                  {!group.complete ? (
                    <p className="operator-secondary">
                      Partial recent sample: these values are lower bounds. Open
                      this Business to narrow the scope or review the underlying
                      activity.
                    </p>
                  ) : null}
                  <Link to={destination('/activity', group.environmentKey)}>
                    View recorded activity
                  </Link>
                </section>
              ))
            )}
          </section>
          <section className="operator-panel">
            <div className="operator-section-heading">
              <h2>Current support</h2>
              <Link to={destination('/support', environment)}>
                Open support
              </Link>
            </div>
            <dl className="operator-facts">
              <div>
                <dt>Open</dt>
                <dd>{counts.open}</dd>
              </div>
              <div>
                <dt>Waiting for customer</dt>
                <dd>{counts.waitingForCustomer}</dd>
              </div>
              <div>
                <dt>Replies to review</dt>
                <dd>{counts.pendingDrafts}</dd>
              </div>
            </dl>
            <p className="operator-secondary">
              Reply reviews and delivery problems can belong to the same open
              case.
            </p>
          </section>
          {!environment ? (
            <section className="operator-panel">
              <div className="operator-section-heading">
                <h2>Businesses</h2>
                <span>{scopes.length} registered environments</span>
              </div>
              {scopes.length === 0 ? (
                <p>No Business environments are registered.</p>
              ) : (
                scopes.map((item) => (
                  <div className="operator-business-row" key={item.key}>
                    <div>
                      <strong>{item.businessName}</strong>
                      <span>
                        {item.environmentName}
                        {item.enabled === false
                          ? ' · Operator work not configured'
                          : ''}
                      </span>
                    </div>
                    <Link to={destination('/', item.key)}>
                      Open overview
                      <span className="operator-sr-only">
                        {' '}
                        for {item.businessName} {item.environmentName}
                      </span>
                    </Link>
                  </div>
                ))
              )}
            </section>
          ) : (
            <section className="operator-panel">
              <h2>Recorded activity</h2>
              <p>
                Review reported product outcomes and support actions. Missing
                events do not prove a customer was inactive.
              </p>
              <Link to={destination('/activity', environment)}>
                View meaningful activity
              </Link>
            </section>
          )}
        </div>
        <section className="operator-panel operator-attention">
          <h2>Waiting for us</h2>
          <p className="operator-secondary">
            {coverage.complete
              ? 'Longest current waits first.'
              : 'Longest waits among available cases.'}
          </p>
          {waiting.length === 0 ? (
            <p>
              {coverage.complete
                ? 'No cases are waiting for our next action.'
                : 'No waiting cases in the available evidence.'}
            </p>
          ) : (
            waiting.slice(0, 5).map((item) => (
              <div className="operator-attention-row" key={item.id}>
                <Link
                  to={destination('/support', item.environmentKey, {
                    case: item.id,
                  })}
                >
                  {item.subject}
                </Link>
                <span>
                  {waitLabel(item.waitingSince!)} · {item.contactEmail}
                </span>
              </div>
            ))
          )}
          {counts.pendingDrafts > 0 ? (
            <Link
              className="operator-button secondary"
              to={destination('/support', environment, { filter: 'drafts' })}
            >
              Review suggested replies
            </Link>
          ) : null}
        </section>
      </div>
    </>
  );
}

export function SupportQueue({
  cases,
  environment,
  selectedId,
  coverage,
  hasMore,
  loadingMore,
  onLoadMore,
  children,
}: {
  cases: CaseView[];
  environment?: string;
  selectedId?: string;
  coverage: CoverageView;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  children?: ReactNode;
}) {
  const [search, setSearch] = useSearchParams();
  const filter = search.get('filter') ?? 'open';
  const [order, setOrder] = useState<string[]>([]);
  const known = new Set(order);
  const ordered = [...cases].sort((a, b) => {
    if (known.has(a.id) && known.has(b.id))
      return order.indexOf(a.id) - order.indexOf(b.id);
    if (known.has(a.id)) return -1;
    if (known.has(b.id)) return 1;
    return (a.waitingSince ?? a.updatedAt) - (b.waitingSince ?? b.updatedAt);
  });
  useEffect(() => {
    setOrder([]);
  }, [environment, filter]);
  useEffect(() => {
    if (!order.length && cases.length) setOrder(cases.map((item) => item.id));
  }, [cases, order.length]);
  const matching = ordered.filter(
    (item) =>
      filter === 'all' ||
      (filter === 'drafts'
        ? item.hasDraft
        : filter === 'delivery'
          ? item.deliveryException
          : item.status === filter),
  );
  return (
    <>
      <PageHeading
        title="Support"
        subtitle="A shared queue. Status, reply review and delivery are separate."
      />
      <div
        className={`operator-support-layout${selectedId ? ' has-selection' : ''}`}
      >
        <section
          className="operator-panel operator-queue"
          aria-label="Support queue"
        >
          <label className="operator-field">
            Show
            <select
              value={filter}
              onChange={(event) => {
                const next = new URLSearchParams(search);
                next.set('filter', event.target.value);
                next.delete('case');
                next.delete('review');
                setSearch(next);
              }}
            >
              <option value="open">Open</option>
              <option value="waiting_for_customer">Waiting for customer</option>
              <option value="resolved">Resolved</option>
              <option value="drafts">Replies to review</option>
              <option value="delivery">Delivery problems</option>
              <option value="all">All cases</option>
            </select>
          </label>
          <Coverage coverage={coverage} />
          {cases.some((item) => !known.has(item.id)) && order.length > 0 ? (
            <button
              className="operator-text-button"
              onClick={() =>
                setOrder(
                  [...cases]
                    .sort(
                      (a, b) =>
                        (a.waitingSince ?? a.updatedAt) -
                        (b.waitingSince ?? b.updatedAt),
                    )
                    .map((item) => item.id),
                )
              }
            >
              Queue updated · Refresh order
            </button>
          ) : null}
          {matching.length === 0 ? (
            <p className="operator-queue-empty">
              {coverage.complete
                ? 'No cases match this view.'
                : 'No matching cases in the loaded evidence.'}
            </p>
          ) : (
            matching.map((item) => (
              <article
                className={`operator-case-row${item.id === selectedId ? ' selected' : ''}`}
                key={item.id}
              >
                <div className="operator-row-meta">
                  <CaseStatusBadge status={item.status} />
                  {item.waitingSince !== undefined && item.status === 'open' ? (
                    <span title={timestamp(item.waitingSince)}>
                      {waitLabel(item.waitingSince)}
                    </span>
                  ) : null}
                </div>
                <Link
                  aria-current={item.id === selectedId ? 'page' : undefined}
                  to={destination('/support', item.environmentKey, {
                    case: item.id,
                    filter,
                  })}
                >
                  {item.subject}
                </Link>
                <span>{item.contactEmail}</span>
                {!environment ? <span>{item.environmentKey}</span> : null}
                {item.deliveryException ? (
                  <strong className="operator-delivery-flag">
                    Delivery needs attention
                  </strong>
                ) : item.hasDraft ? (
                  <span className="operator-draft-flag">
                    Suggested reply ready
                  </span>
                ) : null}
              </article>
            ))
          )}
          {hasMore || loadingMore ? (
            <button
              className="operator-button secondary"
              disabled={loadingMore}
              onClick={onLoadMore}
            >
              {loadingMore ? 'Loading…' : 'Load more cases'}
            </button>
          ) : null}
        </section>
        <div className="operator-case-workspace">
          {children ?? (
            <EmptyState
              title="Choose a case"
              text="Read the conversation, inspect relevant customer facts and review a reply together."
            />
          )}
        </div>
      </div>
    </>
  );
}

function readableKind(kind: string) {
  const names: Record<string, string> = {
    customer_message: 'Customer message',
    incoming: 'Customer message',
    reply: 'Support reply',
    outgoing: 'Support reply',
    outgoing_reply: 'Support reply',
    operator_note: 'Internal note',
    internal_note: 'Internal note',
    note: 'Internal note',
    receipt: 'Initial receipt',
    system: 'Case activity',
  };
  return names[kind] ?? kind.replaceAll('_', ' ');
}
function errorText(caught: unknown) {
  if (
    caught instanceof Error &&
    /stale|changed|pending|invalidat|conflict/iu.test(caught.message)
  )
    return 'This reply changed or a new message arrived. Your text is preserved. Reload the current draft and review it again.';
  return 'The action could not be completed. Your text is preserved. Check the current case and try again.';
}

export function CaseWorkspace({
  detail,
  onSaveDraft,
  onPrepare,
  onSend,
  onNote,
  onStatus,
  onRetry,
  onPreviewAttachment,
  olderHistory,
}: {
  detail: CaseDetailView;
  onSaveDraft: (text: string, pendingId?: string) => Promise<DraftView>;
  onPrepare: (pendingId: string, closing: boolean) => Promise<DraftView>;
  onSend: (pendingId: string, closing: boolean) => Promise<unknown>;
  onNote: (text: string) => Promise<unknown>;
  onStatus: (status: CaseStatus) => Promise<unknown>;
  onRetry?: (deliveryId: string) => Promise<unknown>;
  onPreviewAttachment?: (
    attachmentId: string,
  ) => Promise<{ bytes: ArrayBuffer; contentType: string; name: string }>;
  olderHistory?: ReactNode;
}) {
  const [search, setSearch] = useSearchParams();
  const review = search.get('review') === '1';
  const [text, setText] = useState(detail.draft?.text ?? '');
  const [baseId, setBaseId] = useState(detail.draft?.pendingId);
  const [reviewDraft, setReviewDraft] = useState<DraftView | null>(null);
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!dirty && !note.trim()) return false;
    const before = new URLSearchParams(currentLocation.search);
    const after = new URLSearchParams(nextLocation.search);
    return (
      currentLocation.pathname !== nextLocation.pathname ||
      before.get('case') !== after.get('case') ||
      before.get('environment') !== after.get('environment')
    );
  });
  const lastCase = useRef(detail.conversation.id);
  const changed = baseId !== detail.draft?.pendingId && dirty;
  useEffect(() => {
    if (lastCase.current !== detail.conversation.id || !dirty) {
      setText(detail.draft?.text ?? '');
      setBaseId(detail.draft?.pendingId);
      lastCase.current = detail.conversation.id;
    }
  }, [
    detail.conversation.id,
    detail.draft?.pendingId,
    detail.draft?.text,
    dirty,
  ]);
  useEffect(() => {
    if (!dirty && !note.trim()) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, note]);
  const run = async (name: string, action: () => Promise<void>) => {
    setBusy(name);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(null);
    }
  };
  const leaveReview = () => {
    const next = new URLSearchParams(search);
    next.delete('review');
    setSearch(next);
  };
  const caseItem = detail.conversation;
  const back = new URLSearchParams(search);
  back.delete('case');
  back.delete('review');
  const staleReview =
    reviewDraft !== null &&
    (detail.draft?.pendingId !== reviewDraft.pendingId ||
      detail.draft?.state !== 'ready' ||
      detail.draft?.fingerprint !== reviewDraft.fingerprint);
  if (review)
    return (
      <section className="operator-panel operator-review">
        {blocker.state === 'blocked' ? (
          <LeaveDraftDialog
            onStay={() => blocker.reset()}
            onDiscard={() => blocker.proceed()}
          />
        ) : null}
        <button className="operator-text-button" onClick={leaveReview}>
          ← Back to draft
        </button>
        <h2>Review exact reply</h2>
        <p>
          {caseItem.publicId} · {caseItem.environmentKey}
        </p>
        {!reviewDraft ? (
          <Notice kind="warning">
            Open the current draft and choose Review reply before sending.
          </Notice>
        ) : (
          <>
            {staleReview ? (
              <Notice kind="warning">
                A new message arrived or this reply changed. Return to the draft
                and review again. Nothing has been sent.
              </Notice>
            ) : null}
            <dl className="operator-envelope">
              <dt>To</dt>
              <dd>{reviewDraft.envelope?.to ?? reviewDraft.recipient}</dd>
              <dt>From</dt>
              <dd>{reviewDraft.envelope?.from ?? reviewDraft.sender}</dd>
              <dt>Reply to</dt>
              <dd>{reviewDraft.envelope?.replyTo}</dd>
              <dt>Subject</dt>
              <dd>{reviewDraft.envelope?.subject ?? reviewDraft.subject}</dd>
              <dt>Attachments</dt>
              <dd>{reviewDraft.envelope?.attachmentIds.length ?? 0}</dd>
            </dl>
            <div className="operator-email-preview">
              {reviewDraft.envelope?.text ?? reviewDraft.text}
            </div>
            <label className="operator-check">
              <input
                type="checkbox"
                checked={closing}
                disabled={busy !== null || staleReview}
                onChange={(event) => {
                  const nextClosing = event.target.checked;
                  void run('prepare', async () => {
                    const prepared = await onPrepare(
                      reviewDraft.pendingId,
                      nextClosing,
                    );
                    setReviewDraft(prepared);
                    setBaseId(prepared.pendingId);
                    setClosing(nextClosing);
                  });
                }}
              />
              <span>
                This is a closing reply. Include the feedback invitation shown
                in the email preview.
              </span>
            </label>
            <p className="operator-secondary">
              Sending leaves the case{' '}
              {STATUS_LABELS[caseItem.status].toLowerCase()}. Change its status
              separately after the reply is accepted.
            </p>
            {error ? <Notice kind="error">{error}</Notice> : null}
            <button
              className="operator-button"
              disabled={busy !== null || staleReview || !reviewDraft.envelope}
              onClick={() =>
                void run('send', async () => {
                  await onSend(reviewDraft.pendingId, closing);
                  setDirty(false);
                  setText('');
                  setReviewDraft(null);
                  setNotice(
                    'Reply approved and queued. Check its delivery outcome below; a development mock does not send email.',
                  );
                  leaveReview();
                })
              }
            >
              {busy === 'send'
                ? 'Submitting approved reply…'
                : busy === 'prepare'
                  ? 'Preparing exact email…'
                  : 'Send reply'}
            </button>
          </>
        )}
      </section>
    );
  return (
    <section className="operator-panel operator-case-detail">
      {blocker.state === 'blocked' ? (
        <LeaveDraftDialog
          onStay={() => blocker.reset()}
          onDiscard={() => blocker.proceed()}
        />
      ) : null}
      <Link
        className="operator-back"
        to={`/support${back.size ? `?${back}` : ''}`}
      >
        ← Back to queue
      </Link>
      <div className="operator-case-heading">
        <div>
          <span className="operator-secondary">{caseItem.publicId}</span>
          <h2>{caseItem.subject}</h2>
          <p>{caseItem.contactEmail}</p>
        </div>
        <CaseStatusBadge status={caseItem.status} />
      </div>
      {detail.deliveries
        .filter((item) =>
          [
            'failed',
            'uncertain',
            'rejected',
            'bounced',
            'complained',
            'suppressed',
          ].includes(item.state),
        )
        .map((delivery) => (
          <Notice kind="error" key={delivery.id}>
            <strong>Email {delivery.state}.</strong>{' '}
            {delivery.error ??
              'The customer may not have received this message.'}
            {delivery.retryEligible && onRetry ? (
              <button
                className="operator-text-button"
                disabled={busy !== null}
                onClick={() =>
                  void run('retry', async () => {
                    await onRetry(delivery.id);
                    setNotice(
                      'The same approved email was queued for a safe retry.',
                    );
                  })
                }
              >
                Retry same email
              </button>
            ) : null}
          </Notice>
        ))}
      {notice ? <Notice kind="success">{notice}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      <details className="operator-context">
        <summary>Customer and account</summary>
        {detail.customer ? (
          <dl className="operator-envelope">
            <dt>Customer</dt>
            <dd>
              {detail.customer.displayName ??
                detail.customer.verifiedEmail ??
                'Verified association'}
            </dd>
            <dt>Account</dt>
            <dd>
              {detail.customer.accountName ??
                detail.customer.accountId ??
                'No verified account association'}
            </dd>
          </dl>
        ) : (
          <p>
            This email contact has no verified customer/account association.
            Contact alone does not grant access to private account facts.
          </p>
        )}
        {detail.customer?.userId ? (
          <Link
            to={destination('/customers', caseItem.environmentKey, {
              customer: detail.customer.userId,
            })}
          >
            Investigate customer
          </Link>
        ) : null}
      </details>
      <Coverage coverage={detail.coverage} />
      {olderHistory}
      <ol className="operator-history" aria-label="Case history">
        {detail.entries.map((entry) => (
          <li
            key={entry.id}
            className={
              entry.visibility === 'internal' || /note/u.test(entry.kind)
                ? 'internal'
                : ''
            }
          >
            <div className="operator-entry-heading">
              <strong>{readableKind(entry.kind)}</strong>
              <time dateTime={new Date(entry.createdAt).toISOString()}>
                {timestamp(entry.createdAt)}
              </time>
            </div>
            {entry.actor ? (
              <span className="operator-secondary">{entry.actor}</span>
            ) : null}
            <p>{entry.text}</p>
          </li>
        ))}
      </ol>
      {detail.attachments?.length ? (
        <section className="operator-context">
          <h3>Screenshots</h3>
          {detail.attachments.map((attachment) => (
            <AttachmentPreview
              key={attachment.id}
              attachment={attachment}
              onPreview={onPreviewAttachment}
            />
          ))}
        </section>
      ) : null}
      {detail.deliveries.length ? (
        <details className="operator-context">
          <summary>Email delivery history</summary>
          {detail.deliveries.map((item) => (
            <p key={item.id}>
              <strong>{item.state.replaceAll('_', ' ')}</strong>
              {item.mocked
                ? ' · Synthetic / mock evidence — no email sent'
                : ''}
              {item.error ? ` · ${item.error}` : ''}
            </p>
          ))}
        </details>
      ) : null}
      {detail.feedback?.length ? (
        <details className="operator-context">
          <summary>
            Customer feedback ·{' '}
            {
              detail.feedback.filter((item) => item.submittedAt !== undefined)
                .length
            }{' '}
            responses /{' '}
            {
              detail.feedback.filter((item) => item.invitedAt !== undefined)
                .length
            }{' '}
            invitations
          </summary>
          {detail.feedback.map((item) => (
            <p key={item.id}>
              <strong>
                {item.rating ??
                  (item.activated ? 'No response' : 'Invitation not active')}
              </strong>
              {item.comment ? ` · ${item.comment}` : ''}
            </p>
          ))}
          <p className="operator-secondary">
            Feedback is a review signal. It does not change the case status or
            prove answer correctness.
          </p>
        </details>
      ) : null}
      <section className="operator-composer" aria-labelledby="reply-heading">
        <h3 id="reply-heading">Reply draft</h3>
        {changed ? (
          <Notice kind="warning">
            The saved draft changed. Your text is preserved.{' '}
            <button
              className="operator-text-button"
              onClick={() => {
                setText(detail.draft?.text ?? '');
                setBaseId(detail.draft?.pendingId);
                setDirty(false);
              }}
            >
              Use current saved draft
            </button>
          </Notice>
        ) : null}
        {detail.draft?.staleReason ? (
          <Notice kind="warning">{detail.draft.staleReason}</Notice>
        ) : null}
        <label className="operator-field">
          <span>Message to {caseItem.contactEmail}</span>
          <textarea
            rows={8}
            value={text}
            maxLength={12000}
            onChange={(event) => {
              setText(event.target.value);
              setDirty(true);
            }}
          />
        </label>
        <div className="operator-actions">
          <button
            className="operator-button"
            disabled={!text.trim() || busy !== null || changed}
            onClick={() =>
              void run('review', async () => {
                const draft = await onSaveDraft(text, baseId);
                const prepared = await onPrepare(draft.pendingId, closing);
                setBaseId(prepared.pendingId);
                setReviewDraft(prepared);
                setDirty(false);
                const next = new URLSearchParams(search);
                next.set('review', '1');
                setSearch(next);
              })
            }
          >
            {busy === 'review' ? 'Preparing exact email…' : 'Review reply'}
          </button>
          <button
            className="operator-button secondary"
            disabled={!text.trim() || busy !== null || changed}
            onClick={() =>
              void run('save', async () => {
                const draft = await onSaveDraft(text, baseId);
                setBaseId(draft.pendingId);
                setDirty(false);
                setNotice('Draft saved. It has not been sent.');
              })
            }
          >
            Save draft
          </button>
          <span className="operator-secondary">
            {dirty
              ? 'Unsaved edits'
              : detail.draft
                ? 'Saved draft'
                : 'No reply sent'}
          </span>
        </div>
      </section>
      <div className="operator-case-tools">
        <button
          className="operator-text-button"
          onClick={() => setNoteOpen(!noteOpen)}
          aria-expanded={noteOpen}
        >
          Add internal note
        </button>
        <label className="operator-field">
          Case status
          <select
            value={caseItem.status}
            disabled={busy !== null}
            onChange={(event) =>
              void run('status', async () => {
                await onStatus(event.target.value as CaseStatus);
                setNotice('Case status updated. No email was sent.');
              })
            }
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {noteOpen ? (
        <form
          className="operator-note-form"
          onSubmit={(event) => {
            event.preventDefault();
            void run('note', async () => {
              await onNote(note);
              setNote('');
              setNoteOpen(false);
              setNotice('Internal note added. The customer cannot see it.');
            });
          }}
        >
          <label className="operator-field">
            Internal note · only operators can see this
            <textarea
              rows={4}
              maxLength={4000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <button
            className="operator-button secondary"
            disabled={!note.trim() || busy !== null}
          >
            Add note
          </button>
        </form>
      ) : null}
    </section>
  );
}

function LeaveDraftDialog({
  onStay,
  onDiscard,
}: {
  onStay: () => void;
  onDiscard: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      className="operator-leave-dialog"
      ref={dialog}
      aria-labelledby="leave-draft-title"
      onCancel={onStay}
    >
      <h2 id="leave-draft-title">Keep your unsaved edits?</h2>
      <p>The reply or internal note has changes that have not been saved.</p>
      <div className="operator-actions">
        <button className="operator-button" autoFocus onClick={onStay}>
          Keep editing
        </button>
        <button className="operator-button secondary" onClick={onDiscard}>
          Discard unsaved changes
        </button>
      </div>
    </dialog>
  );
}
function AttachmentPreview({
  attachment,
  onPreview,
}: {
  attachment: NonNullable<CaseDetailView['attachments']>[number];
  onPreview?: (
    id: string,
  ) => Promise<{ bytes: ArrayBuffer; contentType: string; name: string }>;
}) {
  const [url, setUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return (
    <div className="operator-attachment">
      <strong>{attachment.name}</strong>
      <p className="operator-secondary">
        {attachment.state === 'blocked'
          ? (attachment.blockReason ??
            'This file could not be safely previewed.')
          : attachment.state === 'ready'
            ? 'Private regenerated preview'
            : 'Preview is being checked.'}
      </p>
      {attachment.state === 'ready' && onPreview && !url ? (
        <button
          className="operator-button secondary"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError(false);
            void onPreview(attachment.id)
              .then((result) =>
                setUrl(
                  URL.createObjectURL(
                    new Blob([result.bytes], { type: result.contentType }),
                  ),
                ),
              )
              .catch(() => setError(true))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? 'Loading preview…' : 'View screenshot'}
        </button>
      ) : null}
      {error ? (
        <p role="alert">The private preview could not be loaded. Try again.</p>
      ) : null}
      {url ? (
        <img src={url} alt={`Support screenshot: ${attachment.name}`} />
      ) : null}
    </div>
  );
}
