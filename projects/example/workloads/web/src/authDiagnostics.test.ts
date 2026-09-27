import { describe, expect, it, vi } from 'vitest';

import { createExampleAuthDiagnostics } from './authDiagnostics';

class MemoryStorage implements Pick<
  Storage,
  'getItem' | 'removeItem' | 'setItem'
> {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const contextUrl = 'https://example.convex.site/_tofler/auth/context';

describe('example authentication diagnostics', () => {
  it('treats an ordinary initial 401 as an expected signed-out state', async () => {
    const diagnostics = createExampleAuthDiagnostics({
      adapterOrigin: 'https://example.convex.site',
      environmentKey: 'example-development',
      fetch: vi.fn(async () => new Response('{}', { status: 401 })),
      storage: new MemoryStorage(),
    });

    await diagnostics.fetch(contextUrl);

    expect(diagnostics.getSnapshot()).toMatchObject({
      httpStatus: 401,
      status: 'signed_out',
      title: 'No active session',
    });
  });

  it('classifies a 401 after a recorded login return as an unavailable session cookie', async () => {
    const diagnostics = createExampleAuthDiagnostics({
      adapterOrigin: 'https://example.convex.site',
      environmentKey: 'example-development',
      fetch: vi.fn(async () => new Response('{}', { status: 401 })),
      now: () => 10_000,
      storage: new MemoryStorage(),
    });
    diagnostics.markLoginStarted();

    await diagnostics.fetch(contextUrl);

    expect(diagnostics.getSnapshot()).toMatchObject({
      httpStatus: 401,
      status: 'session_cookie_unavailable',
      title: 'Session cookie unavailable',
    });
  });

  it('reports the browser-hidden CORS or network failure without claiming which one occurred', async () => {
    const diagnostics = createExampleAuthDiagnostics({
      adapterOrigin: 'https://example.convex.site',
      environmentKey: 'example-development',
      fetch: vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
      storage: new MemoryStorage(),
    });

    await expect(diagnostics.fetch(contextUrl)).rejects.toThrow(
      'Failed to fetch',
    );
    expect(diagnostics.getSnapshot()).toMatchObject({
      status: 'cross_origin_or_network_error',
      title: 'Cross-origin or network failure',
    });
  });

  it('reports success and clears the recorded login attempt', async () => {
    const storage = new MemoryStorage();
    const diagnostics = createExampleAuthDiagnostics({
      adapterOrigin: 'https://example.convex.site',
      environmentKey: 'example-development',
      fetch: vi.fn(async () => new Response('{}', { status: 200 })),
      now: () => 10_000,
      storage,
    });
    diagnostics.markLoginStarted();

    await diagnostics.fetch(contextUrl);

    expect(diagnostics.getSnapshot()).toMatchObject({
      httpStatus: 200,
      status: 'healthy',
      title: 'Session cookie working',
    });
    expect(storage.values.size).toBe(0);
  });
});
