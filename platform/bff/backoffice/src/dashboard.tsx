import type { HealthResponse } from '@bff/contracts';
import type { ReactNode } from 'react';

export interface BusinessEnvironmentView {
  id: string;
  createdAt: number;
  key: string;
  businessName: string;
  environmentName: string;
  updatedAt: number;
}

export type DashboardModel =
  | { state: 'checking'; health?: HealthResponse }
  | { state: 'configuration-error'; message: string }
  | { state: 'error'; message: string; health?: HealthResponse }
  | { state: 'signed-out'; health?: HealthResponse }
  | {
      state: 'forbidden';
      health?: HealthResponse;
      issuer: string;
      subject: string;
    }
  | {
      state: 'ready';
      health: HealthResponse;
      environments: BusinessEnvironmentView[];
    };

export interface DashboardProps {
  model: DashboardModel;
  signInControl?: ReactNode;
  onCopyIdentity?: (identity: string) => void;
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
  onCopyIdentity,
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
    const identity = JSON.stringify({
      issuer: model.issuer,
      subject: model.subject,
    });
    return (
      <StateCard title="Access not enabled">
        <p className="subtle">
          Google verified this identity, but it is not on the operator
          allowlist.
        </p>
        <div className="identity">
          <strong>Issuer</strong>
          <code>{model.issuer}</code>
          <strong>Subject</strong>
          <code>{model.subject}</code>
        </div>
        <button
          className="button"
          type="button"
          onClick={() => onCopyIdentity?.(identity)}
        >
          Copy operator identity
        </button>
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
            <article className="card environment-card" key={environment.id}>
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
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
