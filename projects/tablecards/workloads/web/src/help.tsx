import {
  BffContactForm,
  BffHelpSurface,
  BffHelper,
  BffSupportSurvey,
  operationsRequest,
  type AssistantPageLink,
  type OperationsConnection,
} from '@bff/assistant/react';
import { BffAuthLink, useBffAuth } from '@tofler/bff-auth/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { useTableCardsApplication } from './application-context';

const helpLinks: readonly AssistantPageLink[] = [
  { toolName: 'open_faq', label: 'Frequently asked questions', path: '/#faq' },
  {
    toolName: 'open_pricing',
    label: 'Plans and preview access',
    path: '/#pricing',
  },
  { toolName: 'open_create', label: 'Create cards', path: '/create' },
  {
    toolName: 'open_account',
    label: 'Account and workspace',
    path: '/settings',
  },
  { toolName: 'open_projects', label: 'Saved projects', path: '/projects' },
  { toolName: 'open_designs', label: 'Browse designs', path: '/designs' },
  { toolName: 'open_team', label: 'Workspace team', path: '/settings/team' },
];
interface PublicOperationsConfiguration {
  enabled: boolean;
  productName?: string;
  contactEmail?: string;
}
interface HelpContextValue {
  open: (view: 'help' | 'contact' | 'feedback') => void;
  connection: OperationsConnection;
  configuration?: PublicOperationsConfiguration;
}
const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpActions() {
  const help = useContext(HelpContext);
  if (!help) return null;
  return (
    <div className="tablecards-help-actions">
      <button
        type="button"
        className="text-button"
        onClick={() => help.open('feedback')}
      >
        Feedback
      </button>
    </div>
  );
}

export function TableCardsHelpRoot() {
  const { operations } = useTableCardsApplication();
  return operations ? (
    <ConnectedHelpRoot operations={operations} />
  ) : (
    <Outlet />
  );
}
function ConnectedHelpRoot({
  operations,
}: {
  operations: { apiBaseUrl: string; environmentKey: string };
}) {
  const { state, client } = useBffAuth();
  const location = useLocation();
  const authContextKey = `${operations.apiBaseUrl}:${operations.environmentKey}:${state.status === 'authenticated' ? `${state.customer.user.id}:${state.accountId}` : state.status}`;
  type HelpView = 'help' | 'contact' | 'feedback' | null;
  const [surface, setSurface] = useState<{
    identity: string;
    view: HelpView;
    summary: string;
  }>({ identity: authContextKey, view: null, summary: '' });
  // Never project a previous identity's support state into a new workspace.
  // Only support children remount; the product Outlet keeps its unsaved work.
  const view = surface.identity === authContextKey ? surface.view : null;
  const summary = surface.identity === authContextKey ? surface.summary : '';
  const setView = useCallback(
    (next: HelpView) =>
      setSurface((previous) => ({
        identity: authContextKey,
        view: next,
        summary: previous.identity === authContextKey ? previous.summary : '',
      })),
    [authContextKey],
  );
  const setSummary = useCallback(
    (next: string) =>
      setSurface((previous) => ({
        identity: authContextKey,
        summary: next,
        view: previous.identity === authContextKey ? previous.view : null,
      })),
    [authContextKey],
  );
  const [configuration, setConfiguration] =
    useState<PublicOperationsConfiguration>();
  const connection = useMemo<OperationsConnection>(
    () => ({
      ...operations,
      getAccessToken: () =>
        state.status === 'authenticated'
          ? client.getAccessToken()
          : Promise.resolve(null),
    }),
    [operations.apiBaseUrl, operations.environmentKey, state.status, client],
  );
  useEffect(() => {
    let active = true;
    void operationsRequest<PublicOperationsConfiguration>(
      connection,
      `config?environmentKey=${encodeURIComponent(connection.environmentKey)}`,
    )
      .then((value) => {
        if (active) setConfiguration(value);
      })
      .catch(() => {
        if (active) setConfiguration({ enabled: false });
      });
    return () => {
      active = false;
    };
  }, [connection]);
  const open = useCallback(
    (next: 'help' | 'contact' | 'feedback') => {
      setSummary('');
      setView(next);
    },
    [setSummary, setView],
  );
  const context = useMemo(
    () => ({ open, connection, configuration }),
    [open, connection, configuration],
  );
  const contextKey = `${state.status === 'authenticated' ? `${state.customer.user.id}:${state.accountId}` : state.status}:${location.pathname}`;
  return (
    <HelpContext.Provider value={context}>
      <Outlet />
      <BffHelpSurface
        key={authContextKey}
        className={`tablecards-help-surface${state.status === 'authenticated' && /^\/(projects|designs|settings)(\/|$)/u.test(location.pathname) ? ' tablecards-help-above-nav' : ''}`}
        open={view !== null}
        onOpen={() => open('help')}
        title={
          view === 'help'
            ? 'TableCards Help'
            : view === 'feedback'
              ? 'Share feedback'
              : 'Contact support'
        }
        onClose={() => setView(null)}
        layout={view === 'help' ? 'chat' : 'content'}
        subtitle={
          view === 'help'
            ? 'A little guidance, whenever you need it'
            : 'We follow up by email'
        }
      >
        <div className="bff-help-view" hidden={view !== 'help'}>
          <BffHelper
            key={authContextKey}
            connection={connection}
            contextKey={contextKey}
            pageKey={location.pathname}
            productName="TableCards"
            links={helpLinks}
            enabled={configuration?.enabled === true}
            suggestions={[
              'How do I print at the right size?',
              'Can I try this without paying?',
              'How do I import a guest list?',
            ]}
            renderLink={(link) => (
              <Link to={link.path} onClick={() => setView(null)}>
                {link.label}
              </Link>
            )}
            onContact={(kind, message) => {
              setSummary(message ?? '');
              setView(kind === 'feedback' ? 'feedback' : 'contact');
            }}
          />
        </div>
        {view === 'contact' || view === 'feedback' ? (
          <>
            <button className="text-button" onClick={() => setView('help')}>
              ← Back to Help
            </button>
            <ContactContent
              initialKind={view === 'feedback' ? 'feedback' : 'question'}
              initialMessage={summary}
            />
          </>
        ) : null}
      </BffHelpSurface>
    </HelpContext.Provider>
  );
}

function ContactContent({
  initialKind = 'question',
  initialMessage = '',
}: {
  initialKind?: 'question' | 'feedback';
  initialMessage?: string;
}) {
  const help = useContext(HelpContext);
  const { state, client } = useBffAuth();
  const location = useLocation();
  if (!help)
    return <p className="notice">Support is not configured on this surface.</p>;
  const account =
    state.status === 'authenticated'
      ? state.customer.accounts.find((item) => item.id === state.accountId)
      : undefined;
  return (
    <>
      {state.status === 'loading' ? (
        <p role="status">Checking your session…</p>
      ) : null}
      {state.status === 'recoverable_error' ? (
        <p className="notice error" role="alert">
          Your session could not be checked.{' '}
          <button
            className="text-button"
            onClick={() => void client.bootstrap()}
          >
            Retry session
          </button>
        </p>
      ) : null}
      <BffContactForm
        additionalPrivacyNotice="Please do not include private guest lists."
        key={`${help.connection.apiBaseUrl}:${help.connection.environmentKey}:${state.status === 'authenticated' ? `${state.customer.user.id}:${state.accountId}` : state.status}:${initialKind}:${initialMessage}`}
        connection={help.connection}
        signedIn={state.status === 'authenticated'}
        contactEmail={help.configuration?.contactEmail}
        enabled={help.configuration?.enabled === true}
        initialKind={initialKind}
        initialMessage={initialMessage}
        replyAddress={
          state.status === 'authenticated'
            ? state.customer.user.verifiedEmail
            : undefined
        }
        workspaceName={account?.displayName}
        signInControl={
          state.status === 'signed_out' ? (
            <BffAuthLink
              className="button"
              intent="login"
              returnPath={`${location.pathname}${location.search}${location.hash}`}
              onClick={(event) => {
                if (location.pathname === '/create') {
                  event.preventDefault();
                  window.dispatchEvent(new Event('tablecards:creator-sign-in'));
                }
              }}
            >
              Sign in with Google
            </BffAuthLink>
          ) : state.status === 'account_selection_required' ||
            state.status === 'onboarding_required' ? (
            <Link className="button" to="/projects">
              Open your workspace
            </Link>
          ) : null
        }
      />
    </>
  );
}

export function ContactPage() {
  const [search] = useSearchParams();
  return (
    <main
      id="public-content"
      tabIndex={-1}
      className="app-page policy-page support-page"
    >
      <p className="eyebrow">TableCards no-charge preview</p>
      <h1>
        {search.get('kind') === 'feedback' ? 'Share feedback' : 'Contact'}
      </h1>
      <p>
        Questions, problems and suggestions are welcome. We follow up by email.
      </p>
      <ContactContent
        initialKind={
          search.get('kind') === 'feedback' ? 'feedback' : 'question'
        }
      />
    </main>
  );
}
export function SupportSurveyPage() {
  const help = useContext(HelpContext);
  const [search] = useSearchParams();
  const choice = search.get('choice');
  return (
    <main
      id="public-content"
      tabIndex={-1}
      className="app-page policy-page support-page"
    >
      <p className="eyebrow">TableCards support</p>
      <h1>Your feedback</h1>
      {help && search.get('token') ? (
        <BffSupportSurvey
          key={search.get('token')!}
          connection={help.connection}
          token={search.get('token')!}
          initialChoice={
            choice === 'yes' || choice === 'partly' || choice === 'no'
              ? choice
              : undefined
          }
        />
      ) : (
        <p>
          This feedback link is incomplete. You can still reply to the support
          email.
        </p>
      )}
    </main>
  );
}
