import { describe, expect, it, vi } from 'vitest';

import { createAuthSessionStore } from './index';

describe('createAuthSessionStore', () => {
  it('increments the generation and notifies active listeners', () => {
    const store = createAuthSessionStore({ status: 'signed_out' });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    expect(
      store.replace({
        status: 'authenticated',
        token: 'short-token',
        accountId: 'account_abcdefghijklmnop',
        expiresAt: 1_600,
      }),
    ).toMatchObject({ generation: 1 });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.replace({ status: 'signed_out' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({
      generation: 2,
      state: { status: 'signed_out' },
    });
  });
});
