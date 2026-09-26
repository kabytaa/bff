import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { tokenExpiry } from './googleIdentity';

const BFF_DEVELOPMENT_AUTH_DO_NOT_SHIP = 'BFF_DEVELOPMENT_AUTH_DO_NOT_SHIP';
const TOKEN_GLOBAL = '__BFF_DEVELOPMENT_AUTOMATION_TOKEN__';

declare global {
  interface Window {
    __BFF_DEVELOPMENT_AUTOMATION_TOKEN__?: unknown;
  }
}

interface DevelopmentIdentityValue {
  token: string | null;
}

const DevelopmentIdentityContext =
  createContext<DevelopmentIdentityValue | null>(null);

export function consumeDevelopmentAutomationToken(): string | null {
  document.documentElement.dataset.developmentAuth =
    BFF_DEVELOPMENT_AUTH_DO_NOT_SHIP;
  const candidate = window[TOKEN_GLOBAL];
  delete window.__BFF_DEVELOPMENT_AUTOMATION_TOKEN__;
  if (
    typeof candidate !== 'string' ||
    (tokenExpiry(candidate) ?? 0) <= Date.now()
  ) {
    return null;
  }
  return candidate;
}

export function DevelopmentIdentityProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken: string;
}) {
  const [token, setToken] = useState<string | null>(initialToken);

  useEffect(() => {
    const expiresAt = tokenExpiry(initialToken);
    if (!expiresAt) {
      setToken(null);
      return;
    }
    const timeout = window.setTimeout(
      () => setToken(null),
      Math.max(0, expiresAt - Date.now() - 30_000),
    );
    return () => window.clearTimeout(timeout);
  }, [initialToken]);

  const value = useMemo(() => ({ token }), [token]);
  return (
    <DevelopmentIdentityContext.Provider value={value}>
      {children}
    </DevelopmentIdentityContext.Provider>
  );
}

export function useDevelopmentAuthForConvex() {
  const value = useContext(DevelopmentIdentityContext);
  if (!value) throw new Error('DevelopmentIdentityProvider is missing');
  const fetchAccessToken = useCallback(
    async () =>
      value.token && (tokenExpiry(value.token) ?? 0) > Date.now()
        ? value.token
        : null,
    [value.token],
  );

  return {
    isLoading: false,
    isAuthenticated: value.token !== null,
    fetchAccessToken,
  };
}
