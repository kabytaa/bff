import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize(options: {
    callback(response: GoogleCredentialResponse): void;
    client_id: string;
  }): void;
  renderButton(element: HTMLElement, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

interface GoogleIdentityValue {
  isLoading: boolean;
  token: string | null;
}

const GoogleIdentityContext = createContext<GoogleIdentityValue | null>(null);

export function tokenExpiry(token: string): number | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const base64 = payload.replaceAll('-', '+').replaceAll('_', '/');
    const normalized = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    const decoded = JSON.parse(atob(normalized)) as { exp?: unknown };
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function GoogleIdentityProvider({
  clientId,
  children,
}: {
  clientId: string;
  children: ReactNode;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity]',
    );
    if (existing) {
      if (window.google || existing.dataset.googleIdentityStatus) {
        setIsLoading(false);
        return;
      }

      let active = true;
      const finish = (status: 'error' | 'loaded') => {
        existing.dataset.googleIdentityStatus = status;
        existing.removeEventListener('load', handleLoad);
        existing.removeEventListener('error', handleError);
        if (active) setIsLoading(false);
      };
      const handleLoad = () => finish('loaded');
      const handleError = () => finish('error');
      existing.addEventListener('load', handleLoad, { once: true });
      existing.addEventListener('error', handleError, { once: true });
      return () => {
        active = false;
      };
    }

    const script = document.createElement('script');
    let active = true;
    const finish = (status: 'error' | 'loaded') => {
      script.dataset.googleIdentityStatus = status;
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      if (active) setIsLoading(false);
    };
    const handleLoad = () => finish('loaded');
    const handleError = () => finish('error');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset.googleIdentity = 'true';
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.append(script);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    const expiresAt = tokenExpiry(token);
    if (!expiresAt) {
      setToken(null);
      return;
    }
    const timeout = window.setTimeout(
      () => setToken(null),
      Math.max(0, expiresAt - Date.now() - 30_000),
    );
    return () => window.clearTimeout(timeout);
  }, [token]);

  useEffect(() => {
    if (!isLoading && window.google) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => setToken(credential),
      });
    }
  }, [clientId, isLoading]);

  const value = useMemo(() => ({ isLoading, token }), [isLoading, token]);

  return (
    <GoogleIdentityContext.Provider value={value}>
      {children}
    </GoogleIdentityContext.Provider>
  );
}

function useGoogleIdentity() {
  const value = useContext(GoogleIdentityContext);
  if (!value) throw new Error('GoogleIdentityProvider is missing');
  return value;
}

export function useGoogleAuthForConvex() {
  const { isLoading, token } = useGoogleIdentity();
  const fetchAccessToken = useCallback(
    async () =>
      token && (tokenExpiry(token) ?? 0) > Date.now() ? token : null,
    [token],
  );

  return {
    isLoading,
    isAuthenticated: token !== null,
    fetchAccessToken,
  };
}

export function GoogleSignInButton() {
  const { isLoading } = useGoogleIdentity();
  const button = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && button.current && window.google) {
      button.current.replaceChildren();
      window.google.accounts.id.renderButton(button.current, {
        shape: 'pill',
        size: 'large',
        text: 'signin_with',
        theme: 'outline',
      });
    }
  }, [isLoading]);

  if (!isLoading && !window.google) {
    return <p className="subtle">Google sign-in is currently unavailable.</p>;
  }

  return <div aria-label="Google sign in" ref={button} />;
}
