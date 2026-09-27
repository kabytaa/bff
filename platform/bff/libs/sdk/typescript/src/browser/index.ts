import {
  accountSummarySchema,
  CUSTOMER_AUTH_CSRF_HEADER,
  CUSTOMER_AUTH_CSRF_HEADER_VALUE,
  customerAuthErrorResponseSchema,
  customerSessionContextResponseSchema,
  customerSessionLogoutResponseSchema,
  normalizeHttpsOrigin,
  relativeApplicationPathSchema,
  type AccountSummary,
  type AuthSessionState,
  type CustomerAuthErrorCode,
  type CustomerAuthIntent,
  type CustomerSessionContextResponse,
} from '../core';

const TOKEN_REFRESH_SKEW_SECONDS = 30;

export interface AuthSessionSnapshot {
  readonly generation: number;
  readonly state: AuthSessionState;
}

export type AuthSessionListener = (snapshot: AuthSessionSnapshot) => void;

export interface AuthSessionStore {
  getSnapshot(): AuthSessionSnapshot;
  replace(state: AuthSessionState): AuthSessionSnapshot;
  subscribe(listener: AuthSessionListener): () => void;
}

export interface AccountPreferenceStore {
  read(): string | null;
  write(accountId: string): void;
  clear(): void;
}

export interface AuthSessionMessenger {
  postSessionEnded(): void;
  subscribeSessionEnded(listener: () => void): () => void;
  close(): void;
}

export interface BffAuthBrowserClientOptions {
  readonly sessionAdapterBaseUrl: string;
  readonly bffBaseUrl: string;
  readonly environmentKey: string;
  readonly webOrigin?: string;
  readonly fetch?: typeof fetch;
  readonly accountPreference?: AccountPreferenceStore;
  readonly messenger?: AuthSessionMessenger;
  readonly now?: () => number;
}

export interface BffAuthBrowserClient {
  getSnapshot(): AuthSessionSnapshot;
  subscribe(listener: AuthSessionListener): () => void;
  bootstrap(): Promise<AuthSessionSnapshot>;
  selectAccount(accountId: string): Promise<AuthSessionSnapshot>;
  createAccount(displayName?: string): Promise<AccountSummary>;
  acceptInvitation(invitationToken: string): Promise<AccountSummary>;
  getAccessToken(forceRefreshToken?: boolean): Promise<string | null>;
  logout(): Promise<void>;
  getSignInUrl(
    options?:
      | string
      | {
          readonly returnPath?: string;
          readonly intent?: CustomerAuthIntent;
        },
  ): string;
  dispose(): void;
}

export class BffAuthClientError extends Error {
  public constructor(
    public readonly code: CustomerAuthErrorCode,
    message: string,
    public readonly status: number,
    public readonly correlationId?: string,
  ) {
    super(message);
    this.name = 'BffAuthClientError';
  }

  public get retryable() {
    return (
      this.code === 'RETRYABLE_UNAVAILABLE' || this.code === 'RATE_LIMITED'
    );
  }
}

export function createAuthSessionStore(
  initialState: AuthSessionState = { status: 'loading' },
): AuthSessionStore {
  let snapshot: AuthSessionSnapshot = {
    generation: 0,
    state: initialState,
  };
  const listeners = new Set<AuthSessionListener>();

  return {
    getSnapshot: () => snapshot,
    replace: (state) => {
      snapshot = { generation: snapshot.generation + 1, state };
      for (const listener of listeners) listener(snapshot);
      return snapshot;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function memoryPreference(): AccountPreferenceStore {
  let accountId: string | null = null;
  return {
    read: () => accountId,
    write: (value) => {
      accountId = value;
    },
    clear: () => {
      accountId = null;
    },
  };
}

export function createAccountPreferenceStore(
  environmentKey: string,
  storage:
    | Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
    | undefined = typeof localStorage === 'undefined'
    ? undefined
    : localStorage,
): AccountPreferenceStore {
  if (!storage) return memoryPreference();
  const key = `tofler:${environmentKey}:last-account`;
  return {
    read: () => {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    write: (accountId) => {
      try {
        storage.setItem(key, accountId);
      } catch {
        // The preference is optional; private storage modes may reject writes.
      }
    },
    clear: () => {
      try {
        storage.removeItem(key);
      } catch {
        // The preference is optional; private storage modes may reject writes.
      }
    },
  };
}

function noOpMessenger(): AuthSessionMessenger {
  return {
    postSessionEnded: () => undefined,
    subscribeSessionEnded: () => () => undefined,
    close: () => undefined,
  };
}

export function createAuthSessionMessenger(
  environmentKey: string,
  adapterOrigin: string,
): AuthSessionMessenger {
  if (typeof BroadcastChannel === 'undefined') return noOpMessenger();
  const channel = new BroadcastChannel(
    `tofler-auth:${environmentKey}:${adapterOrigin}`,
  );
  const listeners = new Set<() => void>();
  channel.addEventListener('message', (event) => {
    if (event.data !== 'session_ended') return;
    for (const listener of listeners) listener();
  });
  return {
    postSessionEnded: () => channel.postMessage('session_ended'),
    subscribeSessionEnded: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close: () => {
      listeners.clear();
      channel.close();
    },
  };
}

function currentWebOrigin(explicitOrigin: string | undefined) {
  if (explicitOrigin) return normalizeHttpsOrigin(explicitOrigin);
  if (typeof location === 'undefined') {
    throw new Error('webOrigin is required outside a browser');
  }
  return normalizeHttpsOrigin(location.origin);
}

async function responseJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new BffAuthClientError(
      'RETRYABLE_UNAVAILABLE',
      'The authentication response was invalid.',
      response.status,
    );
  }
}

async function responseError(response: Response): Promise<BffAuthClientError> {
  const parsed = customerAuthErrorResponseSchema.safeParse(
    await responseJson(response),
  );
  if (parsed.success) {
    return new BffAuthClientError(
      parsed.data.error.code,
      parsed.data.error.message,
      response.status,
      parsed.data.error.correlationId,
    );
  }
  return new BffAuthClientError(
    response.status === 401 ? 'UNAUTHENTICATED' : 'RETRYABLE_UNAVAILABLE',
    response.status === 401
      ? 'Sign in again to continue.'
      : 'Authentication is temporarily unavailable.',
    response.status,
  );
}

function recoverableState(error: unknown): AuthSessionState {
  if (error instanceof BffAuthClientError) {
    return {
      status: 'recoverable_error',
      message: error.message,
      ...(error.correlationId === undefined
        ? {}
        : { correlationId: error.correlationId }),
    };
  }
  return {
    status: 'recoverable_error',
    message: 'Authentication is temporarily unavailable.',
  };
}

function selectedAccountId(state: AuthSessionState): string | undefined {
  return state.status === 'authenticated' ? state.accountId : undefined;
}

export function createBffAuthBrowserClient(
  options: BffAuthBrowserClientOptions,
): BffAuthBrowserClient {
  const adapterOrigin = normalizeHttpsOrigin(options.sessionAdapterBaseUrl);
  const bffOrigin = normalizeHttpsOrigin(options.bffBaseUrl);
  const webOrigin = currentWebOrigin(options.webOrigin);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(options.environmentKey)) {
    throw new Error('environmentKey must be kebab-case');
  }
  const fetchImplementation = options.fetch ?? fetch;
  const preference =
    options.accountPreference ??
    createAccountPreferenceStore(options.environmentKey);
  const messenger =
    options.messenger ??
    createAuthSessionMessenger(options.environmentKey, adapterOrigin);
  const now = options.now ?? Date.now;
  const store = createAuthSessionStore();
  const contextFlights = new Map<
    string,
    Promise<CustomerSessionContextResponse>
  >();
  let epoch = 0;
  let disposed = false;
  let knownAccountIds = new Set<string>();

  function requireActive() {
    if (disposed) throw new Error('Authentication client is disposed');
  }

  function endSession(broadcast: boolean) {
    epoch += 1;
    contextFlights.clear();
    knownAccountIds = new Set();
    const snapshot = store.replace({ status: 'signed_out' });
    if (broadcast) messenger.postSessionEnded();
    return snapshot;
  }

  const unsubscribeMessenger = messenger.subscribeSessionEnded(() => {
    if (!disposed) endSession(false);
  });

  async function fetchContext(accountId?: string) {
    const key = accountId ?? 'onboarding-or-default';
    const existing = contextFlights.get(key);
    if (existing) return await existing;
    const pending = (async () => {
      let response: Response;
      try {
        response = await fetchImplementation(
          new URL('/_tofler/auth/context', adapterOrigin),
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'content-type': 'application/json',
              [CUSTOMER_AUTH_CSRF_HEADER]: CUSTOMER_AUTH_CSRF_HEADER_VALUE,
            },
            body: JSON.stringify(accountId === undefined ? {} : { accountId }),
          },
        );
      } catch {
        throw new BffAuthClientError(
          'RETRYABLE_UNAVAILABLE',
          'Authentication is temporarily unavailable.',
          503,
        );
      }
      if (!response.ok) throw await responseError(response);
      const parsed = customerSessionContextResponseSchema.safeParse(
        await responseJson(response),
      );
      if (!parsed.success) {
        throw new BffAuthClientError(
          'RETRYABLE_UNAVAILABLE',
          'The authentication response was invalid.',
          503,
        );
      }
      return parsed.data;
    })();
    contextFlights.set(key, pending);
    try {
      return await pending;
    } finally {
      if (contextFlights.get(key) === pending) contextFlights.delete(key);
    }
  }

  function applyContext(
    context: CustomerSessionContextResponse,
    expectedEpoch: number,
  ) {
    if (disposed || epoch !== expectedEpoch) return store.getSnapshot();
    knownAccountIds = new Set(
      context.customer.accounts.map((account) => account.id),
    );
    if (context.status === 'authenticated') {
      preference.write(context.accountId);
      return store.replace(context);
    }
    if (context.status === 'onboarding_required') {
      preference.clear();
      return store.replace(context);
    }
    return store.replace(context);
  }

  function applyFailure(error: unknown, expectedEpoch: number) {
    if (disposed || epoch !== expectedEpoch) return store.getSnapshot();
    if (
      error instanceof BffAuthClientError &&
      (error.code === 'UNAUTHENTICATED' || error.code === 'SESSION_EXPIRED')
    ) {
      return endSession(true);
    }
    return store.replace(recoverableState(error));
  }

  async function activateAccount(
    accountId: string,
    requireKnownAccount: boolean,
  ) {
    requireActive();
    if (requireKnownAccount && !knownAccountIds.has(accountId)) {
      throw new BffAuthClientError(
        'FORBIDDEN',
        'This account is not available.',
        403,
      );
    }
    const operationEpoch = ++epoch;
    store.replace({ status: 'loading' });
    try {
      const context = await fetchContext(accountId);
      return applyContext(context, operationEpoch);
    } catch (error) {
      applyFailure(error, operationEpoch);
      throw error;
    }
  }

  async function authorizedBffPost(path: string, body: unknown) {
    const token = await getAccessToken(false);
    if (!token) {
      throw new BffAuthClientError(
        'UNAUTHENTICATED',
        'Sign in again to continue.',
        401,
      );
    }
    let response: Response;
    try {
      const url = new URL(path, bffOrigin);
      url.searchParams.set('environment', options.environmentKey);
      response = await fetchImplementation(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'x-tofler-environment': options.environmentKey,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new BffAuthClientError(
        'RETRYABLE_UNAVAILABLE',
        'The request is temporarily unavailable.',
        503,
      );
    }
    if (!response.ok) throw await responseError(response);
    return await responseJson(response);
  }

  async function bootstrap() {
    requireActive();
    const operationEpoch = ++epoch;
    store.replace({ status: 'loading' });
    const preferredAccount = preference.read();
    try {
      let context: CustomerSessionContextResponse;
      try {
        context = await fetchContext(preferredAccount ?? undefined);
      } catch (error) {
        if (
          preferredAccount === null ||
          !(error instanceof BffAuthClientError) ||
          error.code !== 'FORBIDDEN'
        ) {
          throw error;
        }
        preference.clear();
        context = await fetchContext();
      }
      return applyContext(context, operationEpoch);
    } catch (error) {
      return applyFailure(error, operationEpoch);
    }
  }

  async function getAccessToken(forceRefreshToken = false) {
    requireActive();
    const state = store.getSnapshot().state;
    if (
      !forceRefreshToken &&
      (state.status === 'authenticated' ||
        state.status === 'onboarding_required') &&
      state.expiresAt > Math.floor(now() / 1_000) + TOKEN_REFRESH_SKEW_SECONDS
    ) {
      return state.token;
    }
    if (
      state.status === 'signed_out' ||
      state.status === 'account_selection_required' ||
      state.status === 'loading'
    ) {
      return null;
    }
    const operationEpoch = epoch;
    const accountId =
      selectedAccountId(state) ??
      (state.status === 'recoverable_error'
        ? (preference.read() ?? undefined)
        : undefined);
    try {
      const context = await fetchContext(accountId);
      applyContext(context, operationEpoch);
      if (disposed || epoch !== operationEpoch) return null;
      return context.status === 'authenticated' ||
        context.status === 'onboarding_required'
        ? context.token
        : null;
    } catch (error) {
      applyFailure(error, operationEpoch);
      return null;
    }
  }

  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    bootstrap,
    selectAccount: async (accountId) => await activateAccount(accountId, true),
    createAccount: async (displayName) => {
      const account = accountSummarySchema.parse(
        await authorizedBffPost('/v1/accounts', {
          ...(displayName === undefined ? {} : { displayName }),
        }),
      );
      await activateAccount(account.id, false);
      return account;
    },
    acceptInvitation: async (invitationToken) => {
      const account = accountSummarySchema.parse(
        await authorizedBffPost('/v1/accounts/invitations/accept', {
          invitationToken,
        }),
      );
      await activateAccount(account.id, false);
      return account;
    },
    getAccessToken,
    logout: async () => {
      requireActive();
      const operationEpoch = ++epoch;
      store.replace({ status: 'loading' });
      let response: Response;
      try {
        response = await fetchImplementation(
          new URL('/_tofler/auth/logout', adapterOrigin),
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'content-type': 'application/json',
              [CUSTOMER_AUTH_CSRF_HEADER]: CUSTOMER_AUTH_CSRF_HEADER_VALUE,
            },
            body: '{}',
          },
        );
        if (response.status !== 401) {
          if (!response.ok) throw await responseError(response);
          customerSessionLogoutResponseSchema.parse(
            await responseJson(response),
          );
        }
        if (epoch === operationEpoch) endSession(true);
      } catch (error) {
        applyFailure(error, operationEpoch);
        throw error;
      }
    },
    getSignInUrl: (options = '/') => {
      requireActive();
      const returnPath =
        typeof options === 'string' ? options : (options.returnPath ?? '/');
      const intent =
        typeof options === 'string'
          ? 'continue'
          : (options.intent ?? 'continue');
      const path = relativeApplicationPathSchema.parse(returnPath);
      const url = new URL('/_tofler/auth/login', adapterOrigin);
      url.searchParams.set('webOrigin', webOrigin);
      url.searchParams.set('returnPath', path);
      url.searchParams.set('intent', intent);
      return url.href;
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      epoch += 1;
      contextFlights.clear();
      unsubscribeMessenger();
      messenger.close();
    },
  };
}
