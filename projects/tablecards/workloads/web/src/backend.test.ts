import type {
  BffAuthBrowserClient,
  AuthSessionSnapshot,
} from '@tofler/bff-auth/browser';
import type { ConvexReactClient } from 'convex/react';
import { getFunctionName } from 'convex/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTableCardsBackend } from './backend';

function fixture() {
  let snapshot: AuthSessionSnapshot = {
    generation: 1,
    state: {
      status: 'authenticated',
      token: 'synthetic-context',
      accountId: 'account_first',
      expiresAt: 9999999999,
      customer: {
        user: {
          id: 'user_first',
          environmentKey: 'tablecards-development',
          verifiedEmail: 'synthetic@example.test',
          displayName: 'Synthetic',
          createdAt: 1,
          updatedAt: 1,
        },
        accounts: [],
      },
    },
  };
  const listeners = new Set<() => void>();
  const unsubscribe = vi.fn();
  const auth = {
    getSnapshot: () => snapshot,
    getAccessToken: vi.fn(async () =>
      snapshot.state.status === 'authenticated' ? snapshot.state.token : null,
    ),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        unsubscribe();
      };
    },
  } as unknown as BffAuthBrowserClient;
  const query = vi.fn(async (reference) => {
    const name = getFunctionName(reference);
    if (name === 'exportState:get' || name === 'exportState:latestForProject')
      return {
        publicId: 'export_one',
        status: 'ready',
        downloadUrl: '/v1/files/exports/export_one',
      };
    if (name === 'assets:list')
      return [
        {
          publicId: 'asset_one',
          source: 'uploaded',
          reusable: true,
          createdAt: 1,
          url: '/v1/files/assets/asset_one',
        },
      ];
    if (name === 'designPresets:list')
      return [
        {
          publicId: 'preset_one',
          assetPublicId: 'asset_one',
          assetSource: 'uploaded',
          artworkUrl: '/v1/files/assets/asset_one',
          displayName: 'Test',
          nameColor: '#000000',
          namePosition: 'center',
          nameFont: 'sans',
          nameSize: 'medium',
          updatedAt: 1,
        },
      ];
    return null;
  });
  const action = vi.fn();
  const convex = {
    url: 'https://test.convex.cloud',
    query,
    action,
  } as unknown as ConvexReactClient;
  const backend = createTableCardsBackend(
    convex,
    auth,
    'https://private.convex.site',
  );
  return {
    backend,
    auth,
    query,
    action,
    unsubscribe,
    switchAccount() {
      if (snapshot.state.status !== 'authenticated')
        throw new Error('Test requires account state');
      snapshot = {
        generation: snapshot.generation + 1,
        state: {
          ...snapshot.state,
          accountId: 'account_second',
          token: 'new-synthetic-context',
        },
      };
      for (const listener of listeners) listener();
    },
    signOut() {
      snapshot = {
        generation: snapshot.generation + 1,
        state: { status: 'signed_out' },
      };
      for (const listener of listeners) listener();
    },
  };
}

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(URL, 'createObjectURL').mockReturnValue(
    'blob:private-delivered-bytes',
  );
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('TableCards authenticated browser file adapter', () => {
  it('sends artwork bytes and Authorization directly, receives only the asset public ID', async () => {
    const { backend, action } = fixture();
    const file = new File([new Uint8Array([1, 2, 3])], 'art.jpg', {
      type: 'image/jpeg',
    });
    fetchMock.mockResolvedValueOnce(
      Response.json({ publicId: 'asset_created' }, { status: 201 }),
    );
    await expect(backend.uploadArtwork(file, 'project_saved')).resolves.toEqual(
      { publicId: 'asset_created' },
    );
    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      'https://private.convex.site/v1/files/artwork?projectId=project_saved',
    );
    expect(options).toMatchObject({
      method: 'POST',
      body: file,
      credentials: 'omit',
      cache: 'no-store',
      headers: {
        authorization: 'Bearer synthetic-context',
        'content-type': 'image/jpeg',
      },
    });
    expect(action).not.toHaveBeenCalled();
    backend.dispose();
  });

  it('fetches a protected PDF into a local object URL and reuses its bounded delivered bytes', async () => {
    const { backend } = fixture();
    fetchMock.mockResolvedValueOnce(
      new Response('%PDF-1.7', {
        headers: { 'content-type': 'application/pdf' },
      }),
    );
    await expect(backend.getExport('export_one')).resolves.toMatchObject({
      status: 'ready',
      storageUrl: 'blob:private-delivered-bytes',
    });
    await expect(backend.getLatestExport('project_one')).resolves.toMatchObject(
      { storageUrl: 'blob:private-delivered-bytes' },
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'https://private.convex.site/v1/files/exports/export_one',
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { authorization: 'Bearer synthetic-context' },
      credentials: 'omit',
      cache: 'no-store',
    });
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    backend.dispose();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      'blob:private-delivered-bytes',
    );
  });

  it('shares artwork bytes across asset/preset projections and revokes them on account switch and signout', async () => {
    const { backend, switchAccount, signOut, unsubscribe } = fixture();
    fetchMock.mockImplementation(
      async () =>
        new Response(new Uint8Array([1]), {
          headers: { 'content-type': 'image/jpeg' },
        }),
    );
    expect((await backend.listAssets())[0]?.url).toBe(
      'blob:private-delivered-bytes',
    );
    expect((await backend.listPresets())[0]?.artworkUrl).toBe(
      'blob:private-delivered-bytes',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    switchAccount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    await backend.listAssets();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({
      authorization: 'Bearer new-synthetic-context',
    });
    signOut();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    await expect(backend.listAssets()).rejects.toThrow(/Sign in/u);
    backend.dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('refuses external, bearer-storage and token-in-query addresses before sending any credential', async () => {
    const { backend, query } = fixture();
    for (const downloadUrl of [
      'https://attacker.test/file',
      'https://test.convex.cloud/api/storage/secret',
      '/v1/files/exports/export_one?token=secret',
    ]) {
      query.mockResolvedValueOnce({
        publicId: 'export_one',
        status: 'ready',
        downloadUrl,
      });
      await expect(backend.getExport('export_one')).rejects.toThrow(/Refresh/u);
    }
    expect(fetchMock).not.toHaveBeenCalled();
    backend.dispose();
  });

  it('rejects oversized or wrong-type delivered files without creating object URLs', async () => {
    const { backend } = fixture();
    fetchMock.mockResolvedValueOnce(
      new Response('x', {
        headers: {
          'content-type': 'application/pdf',
          'content-length': String(20 * 1024 * 1024),
        },
      }),
    );
    await expect(backend.getExport('export_one')).rejects.toThrow(/too large/u);
    fetchMock.mockResolvedValueOnce(
      new Response('<html>Error</html>', {
        headers: { 'content-type': 'text/html' },
      }),
    );
    await expect(backend.getExport('export_one')).rejects.toThrow(
      /invalid response/u,
    );
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array(10 * 1024 * 1024 + 1), {
        headers: { 'content-type': 'image/jpeg' },
      }),
    );
    await expect(backend.listAssets()).rejects.toThrow(/too large/u);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    backend.dispose();
  });

  it('does not publish an old account download that finishes after a scope change', async () => {
    const { backend, switchAccount } = fixture();
    let finish: ((response: Response) => void) | undefined;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const download = backend.getExport('export_one');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const signal = fetchMock.mock.calls[0]?.[1]?.signal;
    switchAccount();
    expect(signal?.aborted).toBe(true);
    finish?.(
      new Response('%PDF-1.7', {
        headers: { 'content-type': 'application/pdf' },
      }),
    );
    await expect(download).rejects.toThrow(/account changed/u);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    backend.dispose();
  });

  it('can restart its subscription after React StrictMode effect cleanup', async () => {
    const { backend, switchAccount } = fixture();
    backend.activate();
    backend.dispose();
    backend.activate();
    fetchMock.mockResolvedValueOnce(
      new Response('%PDF-1.7', {
        headers: { 'content-type': 'application/pdf' },
      }),
    );
    await expect(backend.getExport('export_one')).resolves.toMatchObject({
      storageUrl: 'blob:private-delivered-bytes',
    });
    switchAccount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      'blob:private-delivered-bytes',
    );
    backend.dispose();
  });
});
