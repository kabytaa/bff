import type { CustomerAuthTransactionChallenge } from '@bff/contracts';

export interface GoogleCredentialResponse {
  readonly credential: string;
}

export interface GoogleIdentityApi {
  initialize(options: {
    readonly auto_select: false;
    readonly callback: (response: GoogleCredentialResponse) => void;
    readonly cancel_on_tap_outside: true;
    readonly client_id: string;
    readonly nonce: string;
    readonly ux_mode: 'popup';
  }): void;
  renderButton(
    element: HTMLElement,
    options: {
      readonly shape: 'pill';
      readonly size: 'large';
      readonly text: 'continue_with';
      readonly theme: 'outline';
      readonly width: number;
    },
  ): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityApi } };
  }
}

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';

function currentGoogleIdentityApi(): GoogleIdentityApi | undefined {
  return window.google?.accounts.id;
}

export async function loadGoogleIdentityApi(): Promise<GoogleIdentityApi> {
  const current = currentGoogleIdentityApi();
  if (current) return current;
  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-customer-google-identity]',
  );
  const script = existing ?? document.createElement('script');
  if (!existing) {
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.dataset.customerGoogleIdentity = 'true';
    document.head.append(script);
  }

  await new Promise<void>((resolve, reject) => {
    if (currentGoogleIdentityApi()) {
      resolve();
      return;
    }
    const loaded = () => {
      cleanup();
      resolve();
    };
    const failed = () => {
      cleanup();
      reject(new Error('Google Identity Services could not be loaded'));
    };
    const cleanup = () => {
      script.removeEventListener('load', loaded);
      script.removeEventListener('error', failed);
    };
    script.addEventListener('load', loaded, { once: true });
    script.addEventListener('error', failed, { once: true });
  });
  const loaded = currentGoogleIdentityApi();
  if (!loaded) {
    throw new Error('Google Identity Services did not initialize');
  }
  return loaded;
}

export function renderGoogleIdentityButton(input: {
  readonly api: GoogleIdentityApi;
  readonly challenge: CustomerAuthTransactionChallenge;
  readonly clientId: string;
  readonly element: HTMLElement;
  readonly onCredential: (credential: string) => void;
}) {
  input.api.initialize({
    auto_select: false,
    callback: ({ credential }) => input.onCredential(credential),
    cancel_on_tap_outside: true,
    client_id: input.clientId,
    nonce: input.challenge.providerNonce,
    ux_mode: 'popup',
  });
  input.element.replaceChildren();
  input.api.renderButton(input.element, {
    shape: 'pill',
    size: 'large',
    text: 'continue_with',
    theme: 'outline',
    width: 280,
  });
}
