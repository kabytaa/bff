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
    if (name === 'aiState:get')
      return { publicId: 'batch_reference', status: 'ready', choices: [] };
    if (name === 'assets:page')
      return {
        page: [
          {
            publicId: 'asset_one',
            source: 'uploaded',
            reusable: true,
            createdAt: 1,
            url: '/v1/files/assets/asset_one',
          },
        ],
        isDone: false,
        continueCursor: 'opaque-assets-next',
      };
    if (name === 'designPresets:page')
      return {
        page: [
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
        ],
        isDone: true,
        continueCursor: 'opaque-presets-end',
      };
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
    if (name === 'assets:get')
      return {
        publicId: 'asset_one',
        source: 'uploaded',
        reusable: true,
        createdAt: 1,
        url: '/v1/files/assets/asset_one',
      };
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
  it('forwards only the selected reference bytes and MIME type alongside the style request', async () => {
    const { backend, action, query } = fixture();
    const referenceImage = {
      bytes: new Uint8Array([1, 2, 3]).buffer,
      mimeType: 'image/jpeg' as const,
    };
    action.mockResolvedValue({ batchId: 'batch_reference', status: 'ready' });
    query.mockResolvedValue({
      publicId: 'batch_reference',
      status: 'ready',
      choices: [],
    });
    await backend.generateAi({
      prompt: 'Blue corners',
      idempotencyKey: 'selected_reference',
      referenceImage,
    });
    expect(getFunctionName(action.mock.calls[0]?.[0])).toBe('ai:generate');
    expect(action.mock.calls[0]?.[1]).toEqual({
      accessToken: 'synthetic-context',
      prompt: 'Blue corners',
      idempotencyKey: 'selected_reference',
      referenceImage,
    });
    backend.dispose();
  });

  it('loads cursor-based metadata pages without fetching any private bytes', async () => {
    const { backend, query, auth } = fixture();
    await expect(backend.listAssetPage()).resolves.toEqual({
      items: [
        {
          id: 'asset_one',
          source: 'uploaded',
          reusable: true,
          createdAt: 1,
          url: '/v1/files/assets/asset_one',
        },
      ],
      done: false,
      cursor: 'opaque-assets-next',
    });
    expect(query).toHaveBeenLastCalledWith(expect.anything(), {
      paginationOpts: { cursor: null, numItems: 24 },
    });
    await backend.listAssetPage('opaque-assets-next');
    expect(query).toHaveBeenLastCalledWith(expect.anything(), {
      paginationOpts: { cursor: 'opaque-assets-next', numItems: 24 },
    });
    await expect(backend.listPresetPage()).resolves.toEqual({
      items: [
        {
          id: 'preset_one',
          assetId: 'asset_one',
          assetSource: 'uploaded',
          artworkUrl: '/v1/files/assets/asset_one',
          displayName: 'Test',
          nameColor: '#000000',
          namePosition: 'center',
          nameFont: 'sans',
          nameSize: 'medium',
          updatedAt: 1,
        },
      ],
      done: true,
      cursor: 'opaque-presets-end',
    });
    await backend.listPresetPage('opaque-presets-next');
    expect(query).toHaveBeenLastCalledWith(expect.anything(), {
      paginationOpts: { cursor: 'opaque-presets-next', numItems: 24 },
    });
    expect(
      query.mock.calls.map(([reference]) => getFunctionName(reference)),
    ).toEqual([
      'assets:page',
      'assets:page',
      'designPresets:page',
      'designPresets:page',
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(auth.getAccessToken).not.toHaveBeenCalled();
    backend.dispose();
  });

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
    const assetAddress = (await backend.listAssets())[0]?.url;
    const presetAddress = (await backend.listPresets())[0]?.artworkUrl;
    expect(assetAddress).toBe('/v1/files/assets/asset_one');
    expect(presetAddress).toBe(assetAddress);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await backend.resolveArtwork(assetAddress!)).toBe(
      'blob:private-delivered-bytes',
    );
    expect(await backend.resolveArtwork(presetAddress!)).toBe(
      'blob:private-delivered-bytes',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    switchAccount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    await backend.resolveArtwork(assetAddress!);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({
      authorization: 'Bearer new-synthetic-context',
    });
    signOut();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    await expect(backend.resolveArtwork(assetAddress!)).rejects.toThrow(
      /Sign in/u,
    );
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
    await expect(
      backend.resolveArtwork('/v1/files/assets/asset_one'),
    ).rejects.toThrow(/too large/u);
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

  it('lists a large artwork/preset library without fetching bytes and resolves only the selected asset', async () => {
    const { backend, query } = fixture();
    const assets = Array.from({ length: 128 }, (_, index) => ({
      publicId: `asset_${index}`,
      source: 'uploaded',
      reusable: true,
      createdAt: index,
      url: `/v1/files/assets/asset_${index}`,
    }));
    const presets = assets.map((asset, index) => ({
      publicId: `preset_${index}`,
      assetPublicId: asset.publicId,
      assetSource: 'uploaded',
      artworkUrl: asset.url,
      displayName: `Preset ${index}`,
      nameColor: '#000000',
      namePosition: 'center',
      nameFont: 'sans',
      nameSize: 'medium',
      updatedAt: index,
    }));
    query.mockResolvedValueOnce(assets).mockResolvedValueOnce(presets);
    const listedAssets = await backend.listAssets();
    const listedPresets = await backend.listPresets();
    expect(listedAssets).toHaveLength(128);
    expect(listedPresets).toHaveLength(128);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([1]), {
        headers: { 'content-type': 'image/jpeg' },
      }),
    );
    const selected = await backend.resolveArtwork(listedAssets[127]!.url!);
    expect(selected).toBe('blob:private-delivered-bytes');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/asset_127');
    backend.releaseArtwork(listedAssets[127]!.url!, selected);
    backend.dispose();
  });

  it('retrieves one selected descriptor by public ID without reading the library or file bytes', async () => {
    const { backend, query } = fixture();
    query.mockResolvedValueOnce({
      publicId: 'asset_outside_window',
      source: 'uploaded',
      reusable: true,
      createdAt: 1,
      url: '/v1/files/assets/asset_outside_window',
    });
    await expect(
      backend.getAsset('asset_outside_window'),
    ).resolves.toMatchObject({
      id: 'asset_outside_window',
      url: '/v1/files/assets/asset_outside_window',
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(getFunctionName(query.mock.calls[0]![0])).toBe('assets:get');
    expect(query).toHaveBeenCalledWith(expect.anything(), {
      publicId: 'asset_outside_window',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    query.mockResolvedValueOnce(null);
    await expect(backend.getAsset('asset_missing')).resolves.toBeNull();
    backend.dispose();
  });

  it('evicts inactive bytes across many maximum-size images while keeping the current project artwork usable', async () => {
    const { backend } = fixture();
    let nextUrl = 0;
    vi.mocked(URL.createObjectURL).mockImplementation(
      () => `blob:artwork-${nextUrl++}`,
    );
    const bytes = new Uint8Array(10 * 1024 * 1024);
    fetchMock.mockImplementation(
      async () =>
        new Response(bytes, { headers: { 'content-type': 'image/jpeg' } }),
    );
    const selectedAddress = '/v1/files/assets/asset_selected';
    const selected = await backend.resolveArtwork(selectedAddress);
    for (let index = 0; index < 20; index += 1) {
      const address = `/v1/files/assets/asset_${index}`;
      const url = await backend.resolveArtwork(address);
      backend.releaseArtwork(address, url);
    }
    expect(fetchMock).toHaveBeenCalledTimes(21);
    expect(URL.revokeObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(selected);
    expect(await backend.resolveArtwork(selectedAddress)).toBe(selected);
    expect(fetchMock).toHaveBeenCalledTimes(21);
    backend.releaseArtwork(selectedAddress, selected);
    backend.releaseArtwork(selectedAddress, selected);
    backend.dispose();
  });

  it('deduplicates concurrent delivery but balances one active lease per caller', async () => {
    const { backend } = fixture();
    let nextUrl = 0;
    vi.mocked(URL.createObjectURL).mockImplementation(
      () => `blob:lease-${nextUrl++}`,
    );
    fetchMock.mockImplementation(
      async () =>
        new Response(new Uint8Array([1]), {
          headers: { 'content-type': 'image/jpeg' },
        }),
    );
    const selectedAddress = '/v1/files/assets/asset_selected';
    const [first, second] = await Promise.all([
      backend.resolveArtwork(selectedAddress),
      backend.resolveArtwork(selectedAddress),
    ]);
    expect(first).toBe(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    backend.releaseArtwork(selectedAddress, first);
    for (let index = 0; index < 40; index += 1) {
      const address = `/v1/files/assets/asset_${index}`;
      const url = await backend.resolveArtwork(address);
      backend.releaseArtwork(address, url);
    }
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(first);
    backend.releaseArtwork(selectedAddress, second);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(first);
    backend.dispose();
  });

  it('does not retain failed leases or release a new account lease with an old object URL', async () => {
    const { backend, switchAccount } = fixture();
    let nextUrl = 0;
    vi.mocked(URL.createObjectURL).mockImplementation(
      () => `blob:scope-${nextUrl++}`,
    );
    fetchMock.mockResolvedValueOnce(new Response('error', { status: 503 }));
    const address = '/v1/files/assets/asset_selected';
    await expect(backend.resolveArtwork(address)).rejects.toThrow(/failed/u);
    fetchMock.mockImplementation(
      async () =>
        new Response(new Uint8Array([1]), {
          headers: { 'content-type': 'image/jpeg' },
        }),
    );
    const oldUrl = await backend.resolveArtwork(address);
    switchAccount();
    const newUrl = await backend.resolveArtwork(address);
    backend.releaseArtwork(address, oldUrl);
    for (let index = 0; index < 40; index += 1) {
      const otherAddress = `/v1/files/assets/asset_${index}`;
      const url = await backend.resolveArtwork(otherAddress);
      backend.releaseArtwork(otherAddress, url);
    }
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(oldUrl);
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(newUrl);
    backend.releaseArtwork(address, newUrl);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(newUrl);
    backend.dispose();
  });
});
