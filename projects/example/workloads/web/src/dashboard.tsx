import type { ReactNode } from 'react';

import type { AuthDiagnosticSnapshot } from './authDiagnostics';

export interface ContextEvidence {
  readonly accountId: string;
  readonly role: 'owner' | 'admin' | 'member';
  readonly userId: string;
}

export type ExampleDashboardModel =
  | { readonly state: 'checking' }
  | { readonly state: 'configuration_error'; readonly message: string }
  | { readonly state: 'signed_out' }
  | {
      readonly state: 'recoverable_error';
      readonly message: string;
      readonly correlationId?: string;
    }
  | {
      readonly state: 'onboarding_required';
      readonly displayName: string;
      readonly email: string;
      readonly userId: string;
    }
  | {
      readonly state: 'account_selection_required';
      readonly displayName: string;
      readonly accountCount: number;
    }
  | {
      readonly state: 'ready';
      readonly accountId: string;
      readonly accountName?: string;
      readonly displayName: string;
      readonly email: string;
      readonly role: 'owner' | 'admin' | 'member';
      readonly userId: string;
      readonly nativeContext?: ContextEvidence;
      readonly httpContext?: ContextEvidence;
      readonly bffContext?: ContextEvidence;
      readonly evidenceError?: string;
    };

function EvidenceCard({
  title,
  evidence,
}: {
  readonly title: string;
  readonly evidence?: ContextEvidence;
}) {
  return (
    <article className="card evidence-card">
      <p className="label">{title}</p>
      {evidence ? (
        <dl>
          <div>
            <dt>User</dt>
            <dd>{evidence.userId}</dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>{evidence.accountId}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{evidence.role}</dd>
          </div>
        </dl>
      ) : (
        <p className="subtle">Checking the protected context…</p>
      )}
    </article>
  );
}

export function ExampleDashboard({
  accountControl,
  actionControl,
  model,
}: {
  readonly accountControl?: ReactNode;
  readonly actionControl?: ReactNode;
  readonly model: ExampleDashboardModel;
}) {
  if (model.state === 'checking') {
    return (
      <main className="center-card">
        <p className="label">Tofler authentication example</p>
        <h1>Checking your session</h1>
        <p className="subtle">Loading the secure Business context…</p>
      </main>
    );
  }
  if (model.state === 'configuration_error') {
    return (
      <main className="center-card">
        <p className="label">Configuration required</p>
        <h1>Example unavailable</h1>
        <p>{model.message}</p>
      </main>
    );
  }
  if (model.state === 'signed_out') {
    return (
      <main className="center-card">
        <p className="label">Tofler authentication example</p>
        <h1>One session, one verified context</h1>
        <p className="subtle">
          Sign in to prove the browser SDK, Business backend and shared BFF use
          the same short-lived credential.
        </p>
        {actionControl}
      </main>
    );
  }
  if (model.state === 'recoverable_error') {
    return (
      <main className="center-card">
        <p className="label">Temporary problem</p>
        <h1>We could not load your session</h1>
        <p>{model.message}</p>
        {model.correlationId ? (
          <p className="subtle">Reference: {model.correlationId}</p>
        ) : null}
        {actionControl}
      </main>
    );
  }
  if (model.state === 'onboarding_required') {
    return (
      <main className="center-card">
        <p className="label">Signed in</p>
        <h1>Account setup is required</h1>
        <p>
          {model.displayName} ({model.email}) is authenticated, but this
          Business has not assigned an account yet.
        </p>
        <p className="identifier">{model.userId}</p>
        {actionControl}
      </main>
    );
  }
  if (model.state === 'account_selection_required') {
    return (
      <main className="center-card">
        <p className="label">Signed in as {model.displayName}</p>
        <h1>Choose an account</h1>
        <p className="subtle">
          This tab can choose one of {model.accountCount} accounts without
          changing another tab.
        </p>
        {accountControl}
        {actionControl}
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="masthead">
        <div>
          <p className="label">Tofler authentication example</p>
          <h1>Verified Business context</h1>
          <p className="subtle">
            The reference app contains no custom session or account logic.
          </p>
        </div>
        <div className="controls">
          {accountControl}
          {actionControl}
        </div>
      </header>

      <section className="identity-grid" aria-label="Current identity">
        <article className="card">
          <p className="label">User</p>
          <h2>{model.displayName}</h2>
          <p>{model.email}</p>
          <p className="identifier">{model.userId}</p>
        </article>
        <article className="card">
          <p className="label">Active account</p>
          <h2>{model.accountName ?? 'Account'}</h2>
          <p className="role">{model.role}</p>
          <p className="identifier">{model.accountId}</p>
        </article>
      </section>

      <div className="section-heading">
        <div>
          <p className="label">One token, three consumers</p>
          <h2>Protected verification paths</h2>
        </div>
      </div>
      {model.evidenceError ? (
        <p className="error-banner">{model.evidenceError}</p>
      ) : null}
      <section className="evidence-grid" aria-label="Protected contexts">
        <EvidenceCard
          title="Native Convex query"
          evidence={model.nativeContext}
        />
        <EvidenceCard title="Business HTTP API" evidence={model.httpContext} />
        <EvidenceCard title="Shared BFF /v1/me" evidence={model.bffContext} />
      </section>
    </main>
  );
}

export function ExampleAuthDiagnosticsPanel({
  snapshot,
}: {
  readonly snapshot: AuthDiagnosticSnapshot;
}) {
  const statusClass =
    snapshot.status === 'healthy'
      ? 'diagnostics-success'
      : snapshot.status === 'session_cookie_unavailable' ||
          snapshot.status === 'cross_origin_or_network_error' ||
          snapshot.status === 'adapter_error'
        ? 'diagnostics-error'
        : 'diagnostics-neutral';
  return (
    <aside
      className={`diagnostics-panel ${statusClass}`}
      aria-label="Authentication diagnostics"
    >
      <div className="diagnostics-heading">
        <div>
          <p className="label">Development authentication diagnostics</p>
          <h2>{snapshot.title}</h2>
        </div>
        <span className="diagnostics-status">{snapshot.status}</span>
      </div>
      <p>{snapshot.message}</p>
      <dl className="diagnostics-details">
        <div>
          <dt>Adapter</dt>
          <dd>{snapshot.adapterOrigin}</dd>
        </div>
        <div>
          <dt>HTTP response</dt>
          <dd>{snapshot.httpStatus ?? 'No response'}</dd>
        </div>
        <div>
          <dt>Last check</dt>
          <dd>
            {snapshot.checkedAt
              ? new Date(snapshot.checkedAt).toLocaleTimeString()
              : 'Not checked yet'}
          </dd>
        </div>
      </dl>
      <p className="diagnostics-note">
        Safe status only. Cookie, token, authorization code and personal data
        values are never displayed.
      </p>
    </aside>
  );
}
