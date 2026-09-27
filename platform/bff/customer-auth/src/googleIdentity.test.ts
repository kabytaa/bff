import { describe, expect, it, vi } from 'vitest';

import type { CustomerAuthTransactionChallenge } from '@bff/contracts';
import {
  renderGoogleIdentityButton,
  type GoogleIdentityApi,
} from './googleIdentity';

const challenge: CustomerAuthTransactionChallenge = {
  reference: 'login_abcdefghijklmnop',
  environmentKey: 'example-development',
  purpose: 'ownership_transfer',
  intent: 'continue',
  presentation: {
    productName: 'Example',
    theme: 'system',
    accentColor: '#314EC6',
  },
  environmentName: 'Development',
  returnUrl: 'https://example.tofler.app/',
  enabledProviders: ['google'],
  providerNonce: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
  callbackUrl: 'https://api.example.tofler.app/_tofler/auth/callback',
  expiresAt: 1_800_000_000_000,
};

describe('Google Identity Services button', () => {
  it('binds the BFF nonce and returns the credential without decoding it', () => {
    let callback: ((response: { credential: string }) => void) | undefined;
    const initialize = vi.fn<GoogleIdentityApi['initialize']>((options) => {
      callback = options.callback;
    });
    const renderButton = vi.fn<GoogleIdentityApi['renderButton']>();
    const replaceChildren = vi.fn();
    const onCredential = vi.fn();

    renderGoogleIdentityButton({
      api: { initialize, renderButton },
      challenge,
      clientId: 'public-google-client-id.apps.googleusercontent.com',
      element: { replaceChildren } as unknown as HTMLElement,
      onCredential,
    });

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        auto_select: false,
        client_id: 'public-google-client-id.apps.googleusercontent.com',
        nonce: challenge.providerNonce,
        ux_mode: 'popup',
      }),
    );
    expect(renderButton).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ text: 'continue_with' }),
    );
    callback?.({ credential: 'opaque-google-credential' });
    expect(onCredential).toHaveBeenCalledWith('opaque-google-credential');
  });
});
