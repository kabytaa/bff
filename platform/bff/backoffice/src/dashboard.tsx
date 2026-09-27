import type {
  AccountPolicyOverrides,
  AccountPolicyValues,
  CustomerAuthConfiguration,
  LegacyCustomerAuthConfiguration,
  HealthResponse,
} from '@bff/contracts';
import type { ReactNode } from 'react';

export interface BusinessEnvironmentView {
  id: string;
  createdAt: number;
  key: string;
  businessName: string;
  environmentName: string;
  customerAuth?: CustomerAuthConfiguration | LegacyCustomerAuthConfiguration;
  customerAuthConfigurationRevision?: number;
  accountPolicyStateRevision?: number;
  updatedAt: number;
}

export interface CustomerUserView {
  id: string;
  verifiedEmail: string;
  displayName: string;
  activeMembershipCount: number;
  ownedAccountCount: number;
  createdAt: number;
  updatedAt: number;
}

type PolicySource = 'business_default' | 'account_override';

export interface CustomerAccountView {
  id: string;
  displayName?: string;
  ownerUserId: string;
  policyOverrides?: AccountPolicyOverrides;
  effectivePolicy: AccountPolicyValues;
  policySources: Record<keyof AccountPolicyValues, PolicySource>;
  activeMemberCount: number;
  reservedInvitationCount: number;
}

export interface CustomerMembershipView {
  id: string;
  accountId: string;
  userId: string;
  userDisplayName: string;
  userVerifiedEmail: string;
  accountDisplayName?: string;
  role: 'owner' | 'admin' | 'member';
}

export interface CustomerSessionView {
  id: string;
  userId: string;
  userDisplayName: string;
  userVerifiedEmail: string;
  provider: 'google' | 'development';
  createdAt: number;
  lastSeenAt: number;
  idleExpiresAt: number;
  absoluteExpiresAt: number;
  revokedAt?: number;
}

export interface CustomerSecurityEventView {
  type: string;
  userId?: string;
  accountId?: string;
  sessionId?: string;
  correlationId: string;
  occurredAt: number;
}

export interface CustomerEnvironmentDetail {
  loading: boolean;
  users: CustomerUserView[];
  accounts: CustomerAccountView[];
  memberships: CustomerMembershipView[];
  sessions: CustomerSessionView[];
  securityEvents: CustomerSecurityEventView[];
  userLookup?: string;
  submittedUserLookup?: string;
  matchedUsers?: CustomerUserView[];
  onUserLookupChange?: (value: string) => void;
  onUserLookupSubmit?: () => void;
  pages?: Record<
    'users' | 'accounts' | 'memberships' | 'sessions' | 'securityEvents',
    { hasMore: boolean; loading: boolean; loadMore: () => void }
  >;
}

type PageControl = NonNullable<
  CustomerEnvironmentDetail['pages']
>[keyof NonNullable<CustomerEnvironmentDetail['pages']>];

export type DashboardModel =
  | { state: 'checking'; health?: HealthResponse }
  | { state: 'configuration-error'; message: string }
  | { state: 'error'; message: string; health?: HealthResponse }
  | { state: 'signed-out'; health?: HealthResponse }
  | {
      state: 'forbidden';
      health?: HealthResponse;
      email: string | null;
      emailVerified: boolean;
    }
  | {
      state: 'ready';
      health: HealthResponse;
      environments: BusinessEnvironmentView[];
      selectedEnvironmentKey?: string;
      customerDetail?: CustomerEnvironmentDetail;
    };

export interface DashboardProps {
  model: DashboardModel;
  signInControl?: ReactNode;
  onSelectEnvironment?: (key: string) => void;
}

function Header({ health }: { health?: HealthResponse }) {
  return (
    <header className="masthead">
      <div>
        <p className="eyebrow">Operator dashboard</p>
        <h1>Business Factory</h1>
        <p className="subtle">A read-only view of the shared foundation.</p>
      </div>
      <div className="status-pill" aria-label="BFF health">
        <span className="status-dot" aria-hidden="true" />
        {health ? `${health.status} · ${health.version}` : 'Checking BFF'}
      </div>
    </header>
  );
}

function StateCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="card state-card">
      <p className="eyebrow">Business Factory</p>
      <h1>{title}</h1>
      {children}
    </section>
  );
}

function formatTimestamp(value: number): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function Dashboard({
  model,
  signInControl,
  onSelectEnvironment,
}: DashboardProps) {
  if (model.state === 'configuration-error') {
    return (
      <StateCard title="Configuration required">
        <p className="subtle">{model.message}</p>
      </StateCard>
    );
  }

  if (model.state === 'signed-out') {
    return (
      <StateCard title="Operator sign-in">
        <p className="subtle">
          Sign in with the Google account approved for this dashboard.
        </p>
        {signInControl}
      </StateCard>
    );
  }

  if (model.state === 'checking') {
    return (
      <StateCard title="Checking access">
        <p className="subtle">Verifying the current operator identity…</p>
      </StateCard>
    );
  }

  if (model.state === 'error') {
    return (
      <StateCard title="Dashboard unavailable">
        <p className="subtle">{model.message}</p>
      </StateCard>
    );
  }

  if (model.state === 'forbidden') {
    return (
      <StateCard title="Access not enabled">
        <p className="subtle">
          Google verified this identity, but it is not on the operator
          allowlist.
        </p>
        <div className="identity">
          <strong>Google email</strong>
          <code>{model.email ?? 'Unavailable'}</code>
          <strong>Email verification</strong>
          <code>{model.emailVerified ? 'Verified' : 'Not verified'}</code>
        </div>
      </StateCard>
    );
  }

  return (
    <main className="shell">
      <Header health={model.health} />
      <section className="grid summary-grid" aria-label="BFF summary">
        <article className="card">
          <p className="metric-label">Service</p>
          <p className="metric-value">{model.health.service}</p>
        </article>
        <article className="card">
          <p className="metric-label">Version</p>
          <p className="metric-value">{model.health.version}</p>
        </article>
        <article className="card">
          <p className="metric-label">Business environments</p>
          <p className="metric-value">{model.environments.length}</p>
        </article>
      </section>

      <div className="section-heading">
        <div>
          <p className="eyebrow">Registry</p>
          <h2>Business environments</h2>
        </div>
        <span className="subtle">Read only</span>
      </div>

      {model.environments.length === 0 ? (
        <section className="card">
          <strong>No Business environments yet.</strong>
          <p className="subtle">
            Create the first real environment with the operator CLI.
          </p>
        </section>
      ) : (
        <section
          className="environment-list"
          aria-label="Business environments"
        >
          {model.environments.map((environment) => (
            <button
              type="button"
              className={`card environment-card environment-button${
                model.selectedEnvironmentKey === environment.key
                  ? ' selected'
                  : ''
              }`}
              key={environment.id}
              aria-pressed={model.selectedEnvironmentKey === environment.key}
              onClick={() => onSelectEnvironment?.(environment.key)}
            >
              <div>
                <strong>{environment.businessName}</strong>
                <p className="subtle">{environment.environmentName}</p>
              </div>
              <div>
                <span className="key">{environment.key}</span>
              </div>
              <div className="timestamp">
                <span>Created {formatTimestamp(environment.createdAt)}</span>
                <span>Updated {formatTimestamp(environment.updatedAt)}</span>
              </div>
            </button>
          ))}
        </section>
      )}

      {model.selectedEnvironmentKey ? (
        <CustomerEnvironmentSection
          environment={model.environments.find(
            (item) => item.key === model.selectedEnvironmentKey,
          )}
          detail={model.customerDetail}
        />
      ) : null}
    </main>
  );
}

function CustomerEnvironmentSection({
  environment,
  detail,
}: {
  environment?: BusinessEnvironmentView;
  detail?: CustomerEnvironmentDetail;
}) {
  if (!environment) return null;
  return (
    <section aria-label="Customer access">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Customer access</p>
          <h2>{environment.key}</h2>
        </div>
        <span className="subtle">Read only</span>
      </div>
      <div className="grid customer-grid">
        <article className="card">
          <p className="metric-label">Registration</p>
          {environment.customerAuth ? (
            <dl className="detail-list">
              <dt>Web origins</dt>
              <dd>
                {environment.customerAuth.transport.webOrigins.join(', ')}
              </dd>
              <dt>Session adapter</dt>
              <dd>
                {environment.customerAuth.transport.sessionAdapterBaseUrl}
              </dd>
              <dt>Default destination</dt>
              <dd>{environment.customerAuth.transport.defaultPostLoginPath}</dd>
              <dt>Configuration revision</dt>
              <dd>{environment.customerAuthConfigurationRevision ?? 0}</dd>
              <dt>Definition revision</dt>
              <dd>
                {environment.customerAuth.version === 2
                  ? environment.customerAuth.definitionRevision
                  : 'Legacy v1'}
              </dd>
              <dt>Definition fingerprint</dt>
              <dd>
                {environment.customerAuth.version === 2
                  ? environment.customerAuth.definitionFingerprint
                  : 'Not recorded'}
              </dd>
              <dt>Providers</dt>
              <dd>{environment.customerAuth.enabledProviders.join(', ')}</dd>
              {environment.customerAuth.version === 2 ? (
                <>
                  <dt>Sign-in presentation</dt>
                  <dd>
                    <span
                      aria-label={`${environment.customerAuth.presentation.accentColor} accent preview`}
                      style={{
                        display: 'inline-block',
                        width: '0.9rem',
                        height: '0.9rem',
                        marginRight: '0.4rem',
                        borderRadius: '999px',
                        background:
                          environment.customerAuth.presentation.accentColor,
                      }}
                    />
                    {environment.customerAuth.presentation.productName} ·{' '}
                    {environment.customerAuth.presentation.theme} ·{' '}
                    {environment.customerAuth.presentation.accentColor}
                  </dd>
                </>
              ) : null}
              <dt>Session policy</dt>
              <dd>
                {environment.customerAuth.sessionPolicy.idleSeconds}s idle ·{' '}
                {environment.customerAuth.sessionPolicy.absoluteSeconds}s max
              </dd>
              <dt>Account policy</dt>
              <dd>{JSON.stringify(environment.customerAuth.accountPolicy)}</dd>
              <dt>Account defaults</dt>
              <dd>
                {JSON.stringify(environment.customerAuth.accountDefaults)}
              </dd>
              <dt>Account-state revision</dt>
              <dd>{environment.accountPolicyStateRevision ?? 0}</dd>
            </dl>
          ) : (
            <p className="subtle">Customer authentication is not configured.</p>
          )}
        </article>
        <article className="card">
          <p className="metric-label">Current page</p>
          {detail?.loading ? (
            <p className="subtle">Loading customer state…</p>
          ) : (
            <dl className="detail-list compact-counts">
              <dt>Users</dt>
              <dd>{detail?.users.length ?? 0}</dd>
              <dt>Accounts</dt>
              <dd>{detail?.accounts.length ?? 0}</dd>
              <dt>Memberships</dt>
              <dd>{detail?.memberships.length ?? 0}</dd>
              <dt>Sessions</dt>
              <dd>{detail?.sessions.length ?? 0}</dd>
              <dt>Security events</dt>
              <dd>{detail?.securityEvents.length ?? 0}</dd>
            </dl>
          )}
        </article>
      </div>
      {!detail?.loading && detail ? (
        <div className="grid customer-records">
          <CustomerUserLookup detail={detail} />
          <CustomerUsers users={detail.users} page={detail.pages?.users} />
          <CustomerAccounts
            accounts={detail.accounts}
            page={detail.pages?.accounts}
          />
          <CustomerMemberships
            memberships={detail.memberships}
            page={detail.pages?.memberships}
          />
          <CustomerSessions
            sessions={detail.sessions}
            page={detail.pages?.sessions}
          />
          <CustomerSecurityEvents
            events={detail.securityEvents}
            page={detail.pages?.securityEvents}
          />
        </div>
      ) : null}
    </section>
  );
}

function LoadMore({ page }: { page?: PageControl }) {
  if (!page?.hasMore && !page?.loading) return null;
  return (
    <button type="button" disabled={page.loading} onClick={page.loadMore}>
      {page.loading ? 'Loading…' : 'Load more'}
    </button>
  );
}

function CustomerUserLookup({ detail }: { detail: CustomerEnvironmentDetail }) {
  return (
    <article className="card">
      <h3>Exact user lookup</h3>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          detail.onUserLookupSubmit?.();
        }}
      >
        <label>
          <span>Email or public user ID</span>
          <input
            value={detail.userLookup ?? ''}
            onChange={(event) =>
              detail.onUserLookupChange?.(event.target.value)
            }
          />
        </label>
        <button type="submit">Find user</button>
      </form>
      {detail.submittedUserLookup && detail.matchedUsers?.length === 0 ? (
        <p className="subtle">No exact match.</p>
      ) : null}
      {detail.matchedUsers?.map((user) => (
        <div className="record-row" key={user.id}>
          <strong>{user.displayName}</strong>
          <span>{user.verifiedEmail}</span>
          <code>{user.id}</code>
        </div>
      ))}
    </article>
  );
}

function EmptyValue() {
  return <p className="subtle">No records on this page.</p>;
}

function CustomerUsers({
  users,
  page,
}: {
  users: CustomerUserView[];
  page?: PageControl;
}) {
  return (
    <article className="card">
      <h3>Users</h3>
      {users.length === 0 ? <EmptyValue /> : null}
      {users.map((user) => (
        <div className="record-row" key={user.id}>
          <strong>{user.displayName}</strong>
          <span>{user.verifiedEmail}</span>
          <code>{user.id}</code>
          <span>
            {user.activeMembershipCount} memberships · {user.ownedAccountCount}{' '}
            owned
          </span>
          <span>Created {formatTimestamp(user.createdAt)}</span>
        </div>
      ))}
      <LoadMore page={page} />
    </article>
  );
}

function CustomerMemberships({
  memberships,
  page,
}: {
  memberships: CustomerMembershipView[];
  page?: PageControl;
}) {
  return (
    <article className="card">
      <h3>Memberships</h3>
      {memberships.length === 0 ? <EmptyValue /> : null}
      {memberships.map((membership) => (
        <div className="record-row" key={membership.id}>
          <strong>{membership.role}</strong>
          <span>
            {membership.userDisplayName} · {membership.userVerifiedEmail}
          </span>
          <span>
            Account {membership.accountDisplayName ?? membership.accountId}
          </span>
          <code>{membership.id}</code>
        </div>
      ))}
      <LoadMore page={page} />
    </article>
  );
}

function CustomerAccounts({
  accounts,
  page,
}: {
  accounts: CustomerAccountView[];
  page?: PageControl;
}) {
  return (
    <article className="card">
      <h3>Accounts and effective policy</h3>
      {accounts.length === 0 ? <EmptyValue /> : null}
      {accounts.map((account) => (
        <div className="record-row" key={account.id}>
          <strong>{account.displayName ?? account.id}</strong>
          <span>Owner {account.ownerUserId}</span>
          <span>
            Seats {account.activeMemberCount}/
            {account.effectivePolicy.seatLimit} (
            {account.policySources.seatLimit})
          </span>
          <span>
            Admin {String(account.effectivePolicy.adminRoleEnabled)} · invites{' '}
            {String(account.effectivePolicy.memberInvitationsEnabled)}
          </span>
        </div>
      ))}
      <LoadMore page={page} />
    </article>
  );
}

function CustomerSessions({
  sessions,
  page,
}: {
  sessions: CustomerSessionView[];
  page?: PageControl;
}) {
  return (
    <article className="card">
      <h3>Sessions</h3>
      {sessions.length === 0 ? <EmptyValue /> : null}
      {sessions.map((session) => (
        <div className="record-row" key={session.id}>
          <strong>{session.provider}</strong>
          <code>{session.id}</code>
          <span>
            {session.userDisplayName} · {session.userVerifiedEmail}
          </span>
          <span>{session.revokedAt ? 'Revoked' : 'Active'}</span>
          <span>
            Created {formatTimestamp(session.createdAt)} · seen{' '}
            {formatTimestamp(session.lastSeenAt)}
          </span>
          <span>
            Idle expiry {formatTimestamp(session.idleExpiresAt)} · max{' '}
            {formatTimestamp(session.absoluteExpiresAt)}
          </span>
        </div>
      ))}
      <LoadMore page={page} />
    </article>
  );
}

function CustomerSecurityEvents({
  events,
  page,
}: {
  events: CustomerSecurityEventView[];
  page?: PageControl;
}) {
  return (
    <article className="card">
      <h3>Security evidence</h3>
      {events.length === 0 ? <EmptyValue /> : null}
      {events.map((event) => (
        <div
          className="record-row"
          key={`${event.correlationId}:${event.occurredAt}`}
        >
          <strong>{event.type}</strong>
          <span>{formatTimestamp(event.occurredAt)}</span>
          <code>{event.correlationId}</code>
        </div>
      ))}
      <LoadMore page={page} />
    </article>
  );
}
