import {
  currentCustomerViewSchema,
  customerContextClaimsSchema,
} from '@bff/contracts';
import { api } from '@example/backend-api';
import {
  BffAccountSelector,
  BffSignInButton,
  BffSignOutButton,
  useBffAuth,
} from '@tofler/bff-auth/react';
import { useQuery } from 'convex/react';
import type { FunctionReference } from 'convex/server';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { z } from 'zod';

import {
  ExampleAuthDiagnosticsPanel,
  ExampleDashboard,
  type ContextEvidence,
  type ExampleDashboardModel,
} from './dashboard';
import type { ExampleAuthDiagnostics } from './authDiagnostics';

function DevelopmentDiagnostics({
  diagnostics,
}: {
  readonly diagnostics: ExampleAuthDiagnostics;
}) {
  const snapshot = useSyncExternalStore(
    diagnostics.subscribe,
    diagnostics.getSnapshot,
    diagnostics.getSnapshot,
  );
  return <ExampleAuthDiagnosticsPanel snapshot={snapshot} />;
}

const evidenceSchema = z
  .object({
    userId: z.string(),
    accountId: z.string(),
    role: z.enum(['owner', 'admin', 'member']),
  })
  .passthrough();

const bffMeSchema = z
  .object({
    customer: currentCustomerViewSchema,
    context: customerContextClaimsSchema,
  })
  .strict();

interface RemoteEvidence {
  readonly bff?: ContextEvidence;
  readonly error?: string;
  readonly http?: ContextEvidence;
}

interface NativeContextResult extends ContextEvidence {
  readonly membershipId: string;
  readonly permissions: string[];
  readonly sessionId: string;
}

const currentContextQuery = api['currentContext']?.[
  'currentContext'
] as FunctionReference<
  'query',
  'public',
  Record<string, never>,
  NativeContextResult
>;

async function readJson(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok)
    throw new Error(`Protected request failed (${response.status})`);
  return body;
}

export function ExampleApp({
  bffBaseUrl,
  convexSiteUrl,
  environmentKey,
  diagnostics,
}: {
  readonly bffBaseUrl: string;
  readonly convexSiteUrl: string;
  readonly environmentKey: string;
  readonly diagnostics?: ExampleAuthDiagnostics;
}) {
  const { client, snapshot, state } = useBffAuth();
  const nativeContext = useQuery(
    currentContextQuery,
    state.status === 'authenticated' ? {} : 'skip',
  );
  const [remote, setRemote] = useState<RemoteEvidence>({});

  useEffect(() => {
    if (state.status !== 'authenticated') {
      setRemote({});
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      const token = await client.getAccessToken(false);
      if (!token) throw new Error('The account credential is unavailable');
      const headers = { authorization: `Bearer ${token}` };
      const bffMeUrl = new URL('/v1/me', bffBaseUrl);
      bffMeUrl.searchParams.set('environment', environmentKey);
      const [httpBody, bffBody] = await Promise.all([
        fetch(new URL('/v1/context', convexSiteUrl), {
          headers,
          signal: controller.signal,
        }).then(readJson),
        fetch(bffMeUrl, {
          headers: {
            ...headers,
            'x-tofler-environment': environmentKey,
          },
          signal: controller.signal,
        }).then(readJson),
      ]);
      const http = evidenceSchema.parse(httpBody);
      const bff = bffMeSchema.parse(bffBody).context;
      if (bff.contextType !== 'account') {
        throw new Error(
          'BFF returned an onboarding context for an active account',
        );
      }
      setRemote({
        http: {
          userId: http.userId,
          accountId: http.accountId,
          role: http.role,
        },
        bff: { userId: bff.sub, accountId: bff.accountId, role: bff.role },
      });
    };
    void load().catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setRemote({
          error: 'A protected reference request could not be verified.',
        });
      }
    });
    return () => controller.abort();
  }, [
    bffBaseUrl,
    client,
    convexSiteUrl,
    environmentKey,
    snapshot.generation,
    state.status,
  ]);

  const model = useMemo<ExampleDashboardModel>(() => {
    if (state.status === 'loading') return { state: 'checking' };
    if (state.status === 'signed_out') return { state: 'signed_out' };
    if (state.status === 'recoverable_error') {
      return {
        state: 'recoverable_error',
        message: state.message,
        ...(state.correlationId === undefined
          ? {}
          : { correlationId: state.correlationId }),
      };
    }
    if (state.status === 'onboarding_required') {
      return {
        state: 'onboarding_required',
        displayName: state.customer.user.displayName,
        email: state.customer.user.verifiedEmail,
        userId: state.customer.user.id,
      };
    }
    if (state.status === 'account_selection_required') {
      return {
        state: 'account_selection_required',
        displayName: state.customer.user.displayName,
        accountCount: state.customer.accounts.length,
      };
    }
    const account = state.customer.accounts.find(
      (candidate) => candidate.id === state.accountId,
    );
    if (!account) {
      return {
        state: 'recoverable_error',
        message: 'The selected account is no longer available.',
      };
    }
    return {
      state: 'ready',
      accountId: account.id,
      ...(account.displayName === undefined
        ? {}
        : { accountName: account.displayName }),
      displayName: state.customer.user.displayName,
      email: state.customer.user.verifiedEmail,
      role: account.membership.role,
      userId: state.customer.user.id,
      ...(nativeContext === undefined
        ? {}
        : {
            nativeContext: {
              userId: nativeContext.userId,
              accountId: nativeContext.accountId,
              role: nativeContext.role,
            },
          }),
      ...(remote.http === undefined ? {} : { httpContext: remote.http }),
      ...(remote.bff === undefined ? {} : { bffContext: remote.bff }),
      ...(remote.error === undefined ? {} : { evidenceError: remote.error }),
    };
  }, [nativeContext, remote, state]);

  const retry = (
    <button
      className="button"
      type="button"
      onClick={() => void client.bootstrap()}
    >
      Try again
    </button>
  );
  const actionControl =
    state.status === 'signed_out' ? (
      <BffSignInButton
        className="button"
        returnPath="/"
        {...(diagnostics === undefined
          ? {}
          : { onClick: () => diagnostics.markLoginStarted() })}
      >
        Sign in with Google
      </BffSignInButton>
    ) : state.status === 'recoverable_error' ? (
      retry
    ) : state.status === 'loading' ? null : (
      <BffSignOutButton className="secondary-button">Sign out</BffSignOutButton>
    );

  return (
    <>
      <ExampleDashboard
        model={model}
        accountControl={<BffAccountSelector className="account-selector" />}
        actionControl={actionControl}
      />
      {diagnostics ? (
        <DevelopmentDiagnostics diagnostics={diagnostics} />
      ) : null}
    </>
  );
}
