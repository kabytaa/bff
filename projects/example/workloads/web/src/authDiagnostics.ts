export type AuthDiagnosticStatus =
  | 'idle'
  | 'waiting_for_return'
  | 'checking'
  | 'healthy'
  | 'signed_out'
  | 'session_cookie_unavailable'
  | 'cross_origin_or_network_error'
  | 'adapter_error';

export interface AuthDiagnosticSnapshot {
  readonly adapterOrigin: string;
  readonly checkedAt?: string;
  readonly generation: number;
  readonly httpStatus?: number;
  readonly message: string;
  readonly status: AuthDiagnosticStatus;
  readonly title: string;
}

export interface ExampleAuthDiagnostics {
  readonly fetch: typeof fetch;
  getSnapshot(): AuthDiagnosticSnapshot;
  markLoginStarted(): void;
  subscribe(listener: () => void): () => void;
}

interface DiagnosticsOptions {
  readonly adapterOrigin: string;
  readonly environmentKey: string;
  readonly fetch?: typeof fetch;
  readonly now?: () => number;
  readonly storage?: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;
}

const LOGIN_ATTEMPT_MAX_AGE_MS = 15 * 60 * 1_000;

function safeStorage(): DiagnosticsOptions['storage'] {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}

function requestUrl(input: Parameters<typeof fetch>[0]): URL | null {
  try {
    if (typeof input === 'string') return new URL(input);
    if (input instanceof URL) return input;
    return new URL(input.url);
  } catch {
    return null;
  }
}

export function createExampleAuthDiagnostics({
  adapterOrigin,
  environmentKey,
  fetch: fetchImplementation = fetch,
  now = Date.now,
  storage = safeStorage(),
}: DiagnosticsOptions): ExampleAuthDiagnostics {
  const normalizedAdapterOrigin = new URL(adapterOrigin).origin;
  const attemptStorageKey = `tofler:${environmentKey}:diagnostic-login-started`;
  const listeners = new Set<() => void>();
  let snapshot: AuthDiagnosticSnapshot = {
    adapterOrigin: normalizedAdapterOrigin,
    generation: 0,
    message: 'No sign-in attempt has been recorded in this tab.',
    status: 'idle',
    title: 'Waiting for sign-in',
  };

  function replace(
    next: Omit<AuthDiagnosticSnapshot, 'adapterOrigin' | 'generation'>,
  ) {
    snapshot = {
      ...next,
      adapterOrigin: normalizedAdapterOrigin,
      generation: snapshot.generation + 1,
    };
    for (const listener of listeners) listener();
  }

  function readRecentLoginAttempt(): boolean {
    if (!storage) return false;
    try {
      const startedAt = Number(storage.getItem(attemptStorageKey));
      const age = now() - startedAt;
      if (
        !Number.isFinite(startedAt) ||
        startedAt <= 0 ||
        age < 0 ||
        age > LOGIN_ATTEMPT_MAX_AGE_MS
      ) {
        storage.removeItem(attemptStorageKey);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  function clearLoginAttempt() {
    try {
      storage?.removeItem(attemptStorageKey);
    } catch {
      // Diagnostics must never interfere with authentication.
    }
  }

  const diagnosticFetch: typeof fetch = async (input, init) => {
    const url = requestUrl(input);
    const observesContext =
      url?.origin === normalizedAdapterOrigin &&
      url.pathname === '/_tofler/auth/context';
    if (!observesContext) return await fetchImplementation(input, init);

    const loginAttemptRecorded = readRecentLoginAttempt();
    replace({
      message: 'The browser is calling the Business session adapter.',
      status: 'checking',
      title: 'Checking session cookie',
    });

    try {
      const response = await fetchImplementation(input, init);
      const checkedAt = new Date(now()).toISOString();
      if (response.ok) {
        clearLoginAttempt();
        replace({
          checkedAt,
          httpStatus: response.status,
          message:
            'The adapter received the session cookie and returned an authenticated context.',
          status: 'healthy',
          title: 'Session cookie working',
        });
      } else if (response.status === 401 && loginAttemptRecorded) {
        replace({
          checkedAt,
          httpStatus: response.status,
          message:
            'Sign-in returned to this tab, but the adapter received no usable session. On iPhone this usually means the cross-site cookie was not sent; expiration or revocation can produce the same response.',
          status: 'session_cookie_unavailable',
          title: 'Session cookie unavailable',
        });
      } else if (response.status === 401) {
        replace({
          checkedAt,
          httpStatus: response.status,
          message:
            'The adapter was reachable, but this tab has no active session. This is expected before sign-in.',
          status: 'signed_out',
          title: 'No active session',
        });
      } else {
        replace({
          checkedAt,
          httpStatus: response.status,
          message:
            'The browser reached the adapter, but it returned an unexpected authentication error.',
          status: 'adapter_error',
          title: 'Adapter returned an error',
        });
      }
      return response;
    } catch (error) {
      replace({
        checkedAt: new Date(now()).toISOString(),
        message:
          'The browser did not expose a response. Browser security intentionally makes CORS failures indistinguishable from DNS, TLS, and network failures.',
        status: 'cross_origin_or_network_error',
        title: 'Cross-origin or network failure',
      });
      throw error;
    }
  };

  return {
    fetch: diagnosticFetch,
    getSnapshot: () => snapshot,
    markLoginStarted: () => {
      try {
        storage?.setItem(attemptStorageKey, String(now()));
      } catch {
        // The authentication flow still works when diagnostic storage is off.
      }
      replace({
        message:
          'Sign-in started. This tab will check whether the adapter cookie works after the redirect returns.',
        status: 'waiting_for_return',
        title: 'Waiting for authentication return',
      });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
