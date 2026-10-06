import type { GuestRow, OfferId, PrintLayoutId } from '@tablecards/core';
import type { BffAuthBrowserClient } from '@tofler/bff-auth/browser';
import type { ConvexReactClient } from 'convex/react';
import { makeFunctionReference } from 'convex/server';

export interface ProjectSummary {
  readonly id: string;
  readonly title: string;
  readonly guestCount: number;
  readonly designId: string;
  readonly designKind: 'predefined' | 'uploaded' | 'ai';
  readonly updatedAt: number;
  readonly state: 'active' | 'archived';
  readonly nameStyle?: ProjectNameStyle;
}

export interface ProjectNameStyle {
  readonly color: string;
  readonly position: 'top' | 'center' | 'bottom';
  readonly font: 'sans' | 'serif';
  readonly size: 'small' | 'medium' | 'large';
}

export interface SavedProject extends ProjectSummary {
  readonly guests?: readonly GuestRow[];
}

export interface CurrentProductAccess {
  readonly offerKey: OfferId;
  readonly offerName?: string;
  readonly source?: 'default' | 'development_mock' | 'provider';
  readonly maxCardsPerProject?: number;
  readonly maxActiveProjects?: number;
  readonly artworkUploadEnabled?: boolean;
  readonly premiumDesignsEnabled?: boolean;
  readonly reusablePresetsEnabled?: boolean;
  readonly teamAccessEnabled?: boolean;
  readonly collaborationSeats?: number;
  readonly aiBackgroundBatchesRemaining?: number;
  readonly aiAllocationLabel?: 'lifetime' | 'event' | 'current_billing_cycle';
}

interface BackendProjectSummary {
  readonly publicId: string;
  readonly title: string;
  readonly guestCount: number;
  readonly designReference: string;
  readonly designKind: 'predefined' | 'uploaded' | 'ai';
  readonly updatedAt: number;
  readonly state: 'active' | 'archived';
  readonly nameStyle?: ProjectNameStyle;
  readonly guests?: readonly GuestRow[];
}

interface BackendOfferView {
  readonly id: OfferId;
  readonly name: string;
  readonly maximumCardsPerProject: number;
  readonly maximumActiveProjects: number;
  readonly customArtwork: boolean;
  readonly premiumDesigns: boolean;
  readonly reusablePresets: boolean;
  readonly teamAccess: boolean;
  readonly collaborationSeats: number;
  readonly aiBatchesRemaining: number;
  readonly aiAllocationLabel: 'lifetime' | 'event' | 'current_billing_cycle';
  readonly source: 'default' | 'development_mock' | 'provider';
}

export interface ExportStatus {
  readonly exportId: string;
  readonly status: 'queued' | 'rendering' | 'ready' | 'failed';
  readonly storageUrl?: string;
  readonly errorMessage?: string;
}

export interface AiAsset {
  readonly id: string;
  /** Protected HTTP address. Resolve only when displaying the artwork. */
  readonly url: string;
}

export interface AiBatch {
  readonly batchId: string;
  readonly status: 'queued' | 'generating' | 'ready' | 'failed';
  readonly assets?: readonly AiAsset[];
  readonly errorMessage?: string;
}

export interface DesignAsset {
  readonly id: string;
  readonly source: 'uploaded' | 'ai';
  /** Protected HTTP address, not a browser image source. */
  readonly url: string | null;
  readonly reusable: boolean;
  readonly createdAt: number;
}

export interface DesignPreset {
  readonly id: string;
  readonly assetId: string;
  readonly assetSource: 'uploaded' | 'ai';
  /** Protected HTTP address, not a browser image source. */
  readonly artworkUrl: string | null;
  readonly displayName: string;
  readonly nameColor: string;
  readonly namePosition: 'top' | 'center' | 'bottom';
  readonly nameFont: 'sans' | 'serif';
  readonly nameSize: 'small' | 'medium' | 'large';
  readonly updatedAt: number;
}

export interface MetadataPage<T> {
  readonly items: readonly T[];
  readonly done: boolean;
  readonly cursor: string;
}

interface BackendDesignAsset {
  readonly publicId: string;
  readonly source: 'uploaded' | 'ai';
  readonly reusable: boolean;
  readonly url: string | null;
  readonly createdAt: number;
}

interface BackendDesignPreset {
  readonly publicId: string;
  readonly assetPublicId: string;
  readonly assetSource: 'uploaded' | 'ai';
  readonly artworkUrl: string | null;
  readonly displayName: string;
  readonly nameColor: string;
  readonly namePosition: 'top' | 'center' | 'bottom';
  readonly nameFont: 'sans' | 'serif';
  readonly nameSize: 'small' | 'medium' | 'large';
  readonly updatedAt: number;
}

interface BackendMetadataPage<T> {
  readonly page: readonly T[];
  readonly isDone: boolean;
  readonly continueCursor: string;
}

export interface PresetStyle {
  readonly displayName: string;
  readonly nameColor: string;
  readonly namePosition: 'top' | 'center' | 'bottom';
  readonly nameFont: 'sans' | 'serif';
  readonly nameSize: 'small' | 'medium' | 'large';
}

const listProjectsRef = makeFunctionReference<
  'query',
  { state?: 'active' | 'archived' },
  readonly BackendProjectSummary[]
>('projects:list');
const pageProjectsRef = makeFunctionReference<
  'query',
  {
    state: 'active' | 'archived';
    paginationOpts: { cursor: string | null; numItems: number };
  },
  {
    page: readonly BackendProjectSummary[];
    isDone: boolean;
    continueCursor: string;
  }
>('projects:page');
const getProjectRef = makeFunctionReference<
  'query',
  { projectId: string },
  BackendProjectSummary | null
>('projects:get');
const archiveProjectRef = makeFunctionReference<
  'mutation',
  { projectId: string },
  null
>('projects:archive');
const duplicateProjectRef = makeFunctionReference<
  'action',
  { accessToken: string; projectId: string },
  BackendProjectSummary
>('productAccess:duplicateProject');
const restoreProjectRef = makeFunctionReference<
  'action',
  { accessToken: string; projectId: string },
  BackendProjectSummary
>('productAccess:restoreProject');
const saveProjectRef = makeFunctionReference<
  'action',
  {
    accessToken: string;
    projectId?: string;
    title: string;
    guests: readonly GuestRow[];
    design: {
      kind: 'predefined' | 'uploaded' | 'ai';
      reference: string;
      nameStyle?: ProjectNameStyle;
    };
  },
  BackendProjectSummary
>('productAccess:saveProject');
const currentProductAccessRef = makeFunctionReference<
  'action',
  { accessToken: string },
  BackendOfferView
>('productAccess:current');
const startCheckoutRef = makeFunctionReference<
  'action',
  { accessToken: string; offerKey: OfferId; idempotencyKey: string },
  { provider: 'mock' | 'paddle'; checkoutUrl: string; expiresAt: number }
>('productAccess:startCheckout');
const requestExportRef = makeFunctionReference<
  'action',
  { accessToken: string; projectId: string; layoutId: PrintLayoutId },
  { exportId: string }
>('exports:request');
const getExportRef = makeFunctionReference<
  'query',
  { exportId: string },
  {
    publicId: string;
    status: 'queued' | 'generating' | 'ready' | 'failed';
    downloadUrl: string | null;
    errorCode?: string;
  } | null
>('exportState:get');
const latestExportRef = makeFunctionReference<
  'query',
  { projectId: string },
  {
    publicId: string;
    status: 'queued' | 'generating' | 'ready' | 'failed';
    downloadUrl: string | null;
    errorCode?: string;
  } | null
>('exportState:latestForProject');
const generateAiRef = makeFunctionReference<
  'action',
  {
    accessToken: string;
    prompt: string;
    idempotencyKey: string;
    projectId?: string;
  },
  { batchId: string; status: 'queued' | 'generating' | 'ready' | 'failed' }
>('ai:generate');
const getAiBatchRef = makeFunctionReference<
  'query',
  { batchId: string },
  {
    publicId: string;
    status: 'queued' | 'generating' | 'ready' | 'failed';
    errorCode?: string;
    choices: readonly { publicId: string; url: string | null }[];
  } | null
>('aiState:get');
const listAssetsRef = makeFunctionReference<
  'query',
  Record<string, never>,
  readonly BackendDesignAsset[]
>('assets:list');
const listPresetsRef = makeFunctionReference<
  'query',
  Record<string, never>,
  readonly BackendDesignPreset[]
>('designPresets:list');
const getAssetRef = makeFunctionReference<
  'query',
  { publicId: string },
  BackendDesignAsset | null
>('assets:get');
const assetPageRef = makeFunctionReference<
  'query',
  { paginationOpts: { cursor: string | null; numItems: number } },
  BackendMetadataPage<BackendDesignAsset>
>('assets:page');
const presetPageRef = makeFunctionReference<
  'query',
  { paginationOpts: { cursor: string | null; numItems: number } },
  BackendMetadataPage<BackendDesignPreset>
>('designPresets:page');
const createPresetRef = makeFunctionReference<
  'action',
  {
    accessToken: string;
    assetPublicId: string;
    displayName: string;
    nameColor: string;
    namePosition: 'top' | 'center' | 'bottom';
    nameFont: 'sans' | 'serif';
    nameSize: 'small' | 'medium' | 'large';
  },
  string
>('productAccess:createPreset');
const updatePresetRef = makeFunctionReference<
  'action',
  {
    accessToken: string;
    presetId: string;
    displayName: string;
    nameColor: string;
    namePosition: 'top' | 'center' | 'bottom';
    nameFont: 'sans' | 'serif';
    nameSize: 'small' | 'medium' | 'large';
  },
  null
>('productAccess:updatePreset');
const deletePresetRef = makeFunctionReference<
  'action',
  { accessToken: string; presetId: string },
  null
>('productAccess:deletePreset');

function projectView(project: BackendProjectSummary): SavedProject {
  return {
    id: project.publicId,
    title: project.title,
    guestCount: project.guestCount,
    designId: project.designReference,
    designKind: project.designKind,
    updatedAt: project.updatedAt,
    state: project.state,
    ...(project.nameStyle === undefined
      ? {}
      : { nameStyle: project.nameStyle }),
    ...(project.guests === undefined ? {} : { guests: project.guests }),
  };
}

function assetView(asset: BackendDesignAsset): DesignAsset {
  return {
    id: asset.publicId,
    source: asset.source,
    url: asset.url,
    reusable: asset.reusable,
    createdAt: asset.createdAt,
  };
}

function presetView(preset: BackendDesignPreset): DesignPreset {
  return {
    id: preset.publicId,
    assetId: preset.assetPublicId,
    assetSource: preset.assetSource,
    artworkUrl: preset.artworkUrl,
    displayName: preset.displayName,
    nameColor: preset.nameColor,
    namePosition: preset.namePosition,
    nameFont: preset.nameFont,
    nameSize: preset.nameSize,
    updatedAt: preset.updatedAt,
  };
}

function accessView(access: BackendOfferView): CurrentProductAccess {
  return {
    offerKey: access.id,
    offerName: access.name,
    source: access.source,
    maxCardsPerProject: access.maximumCardsPerProject,
    maxActiveProjects: access.maximumActiveProjects,
    artworkUploadEnabled: access.customArtwork,
    premiumDesignsEnabled: access.premiumDesigns,
    reusablePresetsEnabled: access.reusablePresets,
    teamAccessEnabled: access.teamAccess,
    collaborationSeats: access.collaborationSeats,
    aiBackgroundBatchesRemaining: access.aiBatchesRemaining,
    aiAllocationLabel: access.aiAllocationLabel,
  };
}

async function requireToken(auth: BffAuthBrowserClient) {
  const token = await auth.getAccessToken(false);
  if (!token) throw new Error('Sign in and select an account to continue.');
  return token;
}

export interface TableCardsBackend {
  listProjects(
    state?: 'active' | 'archived',
  ): Promise<readonly ProjectSummary[]>;
  getProject(projectId: string): Promise<SavedProject | null>;
  getCurrentAccess(): Promise<CurrentProductAccess>;
  saveProject(input: {
    readonly projectId?: string;
    readonly title: string;
    readonly guests: readonly GuestRow[];
    readonly design: {
      readonly kind: 'predefined' | 'uploaded' | 'ai';
      readonly reference: string;
      readonly nameStyle?: ProjectNameStyle;
    };
  }): Promise<SavedProject>;
  startCheckout(
    offerKey: OfferId,
    idempotencyKey: string,
  ): Promise<{ readonly checkoutUrl: string }>;
  requestExport(
    projectId: string,
    layoutId: PrintLayoutId,
  ): Promise<{ readonly exportId: string }>;
  getExport(exportId: string): Promise<ExportStatus | null>;
  getLatestExport(projectId: string): Promise<ExportStatus | null>;
  getPendingAiBatch(projectId?: string): Promise<{
    readonly batchId: string;
    readonly prompt: string;
    readonly idempotencyKey: string;
  } | null>;
  archiveProject(projectId: string): Promise<void>;
  duplicateProject(projectId: string): Promise<SavedProject>;
  restoreProject(projectId: string): Promise<SavedProject>;
  generateAi(input: {
    readonly prompt: string;
    readonly idempotencyKey: string;
    readonly projectId?: string;
  }): Promise<AiBatch>;
  uploadArtwork(
    file: File,
    projectId?: string,
  ): Promise<{ readonly publicId: string }>;
  listAssets(): Promise<readonly DesignAsset[]>;
  listAssetPage(cursor?: string | null): Promise<MetadataPage<DesignAsset>>;
  getAsset(assetId: string): Promise<DesignAsset | null>;
  listPresets(): Promise<readonly DesignPreset[]>;
  listPresetPage(cursor?: string | null): Promise<MetadataPage<DesignPreset>>;
  listProjectPage(
    state: 'active' | 'archived',
    cursor?: string | null,
  ): Promise<MetadataPage<ProjectSummary>>;
  resolveArtwork(address: string): Promise<string>;
  releaseArtwork(address: string, objectUrl: string): void;
  createPreset(assetId: string, style: PresetStyle): Promise<string>;
  updatePreset(presetId: string, style: PresetStyle): Promise<void>;
  deletePreset(presetId: string): Promise<void>;
}

export function createTableCardsBackend(
  convex: ConvexReactClient,
  auth: BffAuthBrowserClient,
  convexSiteUrl = convex.url.replace(/\.convex\.cloud$/u, '.convex.site'),
): TableCardsBackend & { activate(): void; dispose(): void } {
  const fileOrigin = new URL(convexSiteUrl).origin;
  const cache = new Map<string, { url: string; bytes: number }>();
  const references = new Map<string, number>();
  const pending = new Map<string, Promise<string>>();
  const controllers = new Set<AbortController>();
  let totalBytes = 0;
  let latestPdfAddress: string | null = null;
  let scopeGeneration = 0;
  let disposed = false;
  let activeDownloads = 0;
  const downloadWaiters: (() => void)[] = [];
  const scope = () => {
    const state = auth.getSnapshot().state;
    return state.status === 'authenticated'
      ? `${state.customer.user.id}:${state.accountId}`
      : null;
  };
  let currentScope = scope();
  function clearFiles() {
    scopeGeneration += 1;
    for (const controller of controllers) controller.abort();
    controllers.clear();
    for (const entry of cache.values()) URL.revokeObjectURL(entry.url);
    cache.clear();
    references.clear();
    latestPdfAddress = null;
    pending.clear();
    totalBytes = 0;
  }
  function active(address: string): boolean {
    return (references.get(address) ?? 0) > 0 || address === latestPdfAddress;
  }
  function evict(address: string) {
    const entry = cache.get(address);
    if (!entry) return;
    cache.delete(address);
    totalBytes -= entry.bytes;
    URL.revokeObjectURL(entry.url);
  }
  function reserveCache(bytes: number, entries = 1): boolean {
    for (const address of cache.keys()) {
      if (
        totalBytes + bytes <= 128 * 1024 * 1024 &&
        cache.size + entries <= 160
      )
        return true;
      if (!active(address)) evict(address);
    }
    return (
      totalBytes + bytes <= 128 * 1024 * 1024 && cache.size + entries <= 160
    );
  }
  function trimInactive() {
    let bytes = 0;
    let count = 0;
    for (const [address, entry] of cache) {
      if (!active(address)) {
        bytes += entry.bytes;
        count += 1;
      }
    }
    for (const [address, entry] of cache) {
      if (bytes <= 64 * 1024 * 1024 && count <= 32) break;
      if (active(address)) continue;
      bytes -= entry.bytes;
      count -= 1;
      evict(address);
    }
  }
  let unsubscribe: (() => void) | undefined;
  function subscribe() {
    if (unsubscribe) return;
    currentScope = scope();
    unsubscribe = auth.subscribe(() => {
      const nextScope = scope();
      if (nextScope !== currentScope) {
        currentScope = nextScope;
        clearFiles();
      }
    });
  }
  async function fileUrl(
    address: string,
    mime: 'artwork' | 'pdf',
  ): Promise<string> {
    if (disposed) throw new Error('Open TableCards again to access this file.');
    subscribe();
    // Never send an account token to an arbitrary projection URL or a legacy
    // storage bearer link. Only this fixed product HTTP origin/path is valid.
    if (!/^\/v1\/files\/(assets|exports)\/[a-z0-9_]{1,128}$/iu.test(address)) {
      throw new Error('Refresh TableCards to access this file.');
    }
    const tokenGeneration = scopeGeneration;
    const token = await requireToken(auth);
    if (tokenGeneration !== scopeGeneration)
      throw new Error('The selected account changed. Open the file again.');
    if (disposed || scope() === null)
      throw new Error('Sign in and select an account to continue.');
    const cached = cache.get(address);
    if (cached) {
      cache.delete(address);
      cache.set(address, cached);
      if (mime === 'pdf') latestPdfAddress = address;
      return cached.url;
    }
    const existing = pending.get(address);
    if (existing) return await existing;
    const generation = scopeGeneration;
    const controller = new AbortController();
    controllers.add(controller);
    const delivery = (async () => {
      if (activeDownloads >= 4) {
        await new Promise<void>((resolve) => downloadWaiters.push(resolve));
      } else {
        activeDownloads += 1;
      }
      try {
        if (disposed || generation !== scopeGeneration)
          throw new Error('The selected account changed. Open the file again.');
        const response = await fetch(new URL(address, fileOrigin), {
          headers: { authorization: `Bearer ${token}` },
          cache: 'no-store',
          credentials: 'omit',
          signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) clearFiles();
          throw new Error(
            response.status === 401 || response.status === 403
              ? 'Sign in and select an available account to access this file.'
              : 'File download failed. Try again.',
          );
        }
        const contentType = response.headers.get('content-type')?.split(';')[0];
        if (
          mime === 'pdf'
            ? contentType !== 'application/pdf'
            : contentType !== 'image/png' && contentType !== 'image/jpeg'
        )
          throw new Error('File download returned an invalid response.');
        const maximumBytes =
          mime === 'pdf' ? 19 * 1024 * 1024 : 10 * 1024 * 1024;
        const declared = Number(response.headers.get('content-length'));
        if (Number.isFinite(declared) && declared > maximumBytes)
          throw new Error('The file is too large to display.');
        const reader = response.body?.getReader();
        const chunks: ArrayBuffer[] = [];
        let length = 0;
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            length += value.byteLength;
            if (length > maximumBytes) {
              await reader.cancel();
              throw new Error('The file is too large to display.');
            }
            chunks.push(Uint8Array.from(value).buffer);
          }
        }
        if (length === 0)
          throw new Error('File download returned an empty response.');
        if (disposed || generation !== scopeGeneration)
          throw new Error('The selected account changed. Open the file again.');
        // Active previews own leases. Evict only inactive LRU bytes so opening
        // another valid asset does not exhaust a growing account's library.
        if (!reserveCache(length))
          throw new Error(
            'Close another artwork preview before opening this file.',
          );
        const objectUrl = URL.createObjectURL(
          new Blob(chunks, { type: contentType }),
        );
        cache.set(address, { url: objectUrl, bytes: length });
        totalBytes += length;
        if (mime === 'pdf') latestPdfAddress = address;
        return objectUrl;
      } finally {
        const next = downloadWaiters.shift();
        if (next) next();
        else activeDownloads -= 1;
      }
    })();
    pending.set(address, delivery);
    try {
      return await delivery;
    } finally {
      controllers.delete(controller);
      if (pending.get(address) === delivery) pending.delete(address);
    }
  }
  return {
    activate() {
      disposed = false;
      subscribe();
    },
    dispose() {
      disposed = true;
      unsubscribe?.();
      unsubscribe = undefined;
      clearFiles();
    },
    async resolveArtwork(address) {
      if (!/^\/v1\/files\/assets\/[a-z0-9_]{1,128}$/iu.test(address))
        throw new Error('Refresh TableCards to access this artwork.');
      if (disposed)
        throw new Error('Open TableCards again to access this artwork.');
      subscribe();
      const generation = scopeGeneration;
      references.set(address, (references.get(address) ?? 0) + 1);
      try {
        return await fileUrl(address, 'artwork');
      } catch (error) {
        if (generation === scopeGeneration) {
          const count = references.get(address) ?? 0;
          if (count <= 1) references.delete(address);
          else references.set(address, count - 1);
          trimInactive();
        }
        throw error;
      }
    },
    releaseArtwork(address, objectUrl) {
      // A late cleanup from the old account must never release a new scope's
      // lease for the same address. Object URLs are unique per delivered Blob.
      if (cache.get(address)?.url !== objectUrl) return;
      const count = references.get(address) ?? 0;
      if (count <= 1) references.delete(address);
      else references.set(address, count - 1);
      trimInactive();
    },
    async listProjects(state = 'active') {
      return (await convex.query(listProjectsRef, { state })).map(projectView);
    },
    async listProjectPage(state, cursor) {
      const result = await convex.query(pageProjectsRef, {
        state,
        paginationOpts: { cursor: cursor ?? null, numItems: 24 },
      });
      return {
        items: result.page.map(projectView),
        done: result.isDone,
        cursor: result.continueCursor,
      };
    },
    async getPendingAiBatch(projectId) {
      return await convex.query(
        makeFunctionReference<
          'query',
          { projectId?: string },
          { batchId: string; prompt: string; idempotencyKey: string } | null
        >('aiState:pendingForCaller'),
        projectId === undefined ? {} : { projectId },
      );
    },
    async getProject(projectId) {
      const project = await convex.query(getProjectRef, { projectId });
      return project === null ? null : projectView(project);
    },
    async getCurrentAccess() {
      return accessView(
        await convex.action(currentProductAccessRef, {
          accessToken: await requireToken(auth),
        }),
      );
    },
    async saveProject(input) {
      return projectView(
        await convex.action(saveProjectRef, {
          accessToken: await requireToken(auth),
          ...(input.projectId === undefined
            ? {}
            : { projectId: input.projectId }),
          title: input.title,
          guests: input.guests,
          design: input.design,
        }),
      );
    },
    async startCheckout(offerKey, idempotencyKey) {
      const result = await convex.action(startCheckoutRef, {
        accessToken: await requireToken(auth),
        offerKey,
        idempotencyKey,
      });
      return { checkoutUrl: result.checkoutUrl };
    },
    async requestExport(projectId, layoutId) {
      return await convex.action(requestExportRef, {
        accessToken: await requireToken(auth),
        projectId,
        layoutId,
      });
    },
    async getExport(exportId) {
      const result = await convex.query(getExportRef, { exportId });
      if (result === null) return null;
      return {
        exportId: result.publicId,
        status: result.status === 'generating' ? 'rendering' : result.status,
        ...(result.downloadUrl === null
          ? {}
          : { storageUrl: await fileUrl(result.downloadUrl, 'pdf') }),
        ...(result.errorCode === undefined
          ? {}
          : { errorMessage: result.errorCode }),
      };
    },
    async getLatestExport(projectId) {
      const result = await convex.query(latestExportRef, { projectId });
      if (result === null) return null;
      return {
        exportId: result.publicId,
        status: result.status === 'generating' ? 'rendering' : result.status,
        ...(result.downloadUrl === null
          ? {}
          : { storageUrl: await fileUrl(result.downloadUrl, 'pdf') }),
        ...(result.errorCode === undefined
          ? {}
          : { errorMessage: result.errorCode }),
      };
    },
    async archiveProject(projectId) {
      await convex.mutation(archiveProjectRef, { projectId });
    },
    async duplicateProject(projectId) {
      return projectView(
        await convex.action(duplicateProjectRef, {
          accessToken: await requireToken(auth),
          projectId,
        }),
      );
    },
    async restoreProject(projectId) {
      return projectView(
        await convex.action(restoreProjectRef, {
          accessToken: await requireToken(auth),
          projectId,
        }),
      );
    },
    async generateAi(input) {
      const started = await convex.action(generateAiRef, {
        accessToken: await requireToken(auth),
        prompt: input.prompt,
        idempotencyKey: input.idempotencyKey,
        ...(input.projectId === undefined
          ? {}
          : { projectId: input.projectId }),
      });
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const result = await convex.query(getAiBatchRef, {
          batchId: started.batchId,
        });
        if (result?.status === 'ready') {
          return {
            batchId: result.publicId,
            status: 'ready',
            assets: result.choices
              .filter(
                (choice): choice is { publicId: string; url: string } =>
                  choice.url !== null,
              )
              .map((choice) => ({
                id: choice.publicId,
                url: choice.url,
              })),
          };
        }
        if (result?.status === 'failed') {
          return {
            batchId: result.publicId,
            status: 'failed',
            ...(result.errorCode === undefined
              ? {}
              : { errorMessage: result.errorCode }),
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
      return { batchId: started.batchId, status: started.status };
    },
    async uploadArtwork(file, projectId) {
      if (disposed) throw new Error('Open TableCards again to upload artwork.');
      subscribe();
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        throw new Error('Choose a PNG or JPEG image.');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Artwork must be 10 MB or smaller.');
      }
      const generation = scopeGeneration;
      const accessToken = await requireToken(auth);
      if (generation !== scopeGeneration)
        throw new Error('The selected account changed. Upload the file again.');
      const uploadUrl = new URL('/v1/files/artwork', fileOrigin);
      if (projectId !== undefined)
        uploadUrl.searchParams.set('projectId', projectId);
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'content-type': file.type,
          authorization: `Bearer ${accessToken}`,
        },
        body: file,
        cache: 'no-store',
        credentials: 'omit',
      });
      if (!response.ok) throw new Error('Artwork upload failed. Try again.');
      if (disposed || generation !== scopeGeneration)
        throw new Error('The selected account changed. Open the file again.');
      const body = (await response.json()) as { publicId?: unknown };
      if (typeof body.publicId !== 'string') {
        throw new Error('Artwork upload returned an invalid response.');
      }
      return { publicId: body.publicId };
    },
    async listAssets() {
      return (await convex.query(listAssetsRef, {})).map(assetView);
    },
    async listAssetPage(cursor) {
      const result = await convex.query(assetPageRef, {
        paginationOpts: { cursor: cursor ?? null, numItems: 24 },
      });
      return {
        items: result.page.map(assetView),
        done: result.isDone,
        cursor: result.continueCursor,
      };
    },
    async getAsset(assetId) {
      const asset = await convex.query(getAssetRef, { publicId: assetId });
      return asset === null ? null : assetView(asset);
    },
    async listPresets() {
      return (await convex.query(listPresetsRef, {})).map(presetView);
    },
    async listPresetPage(cursor) {
      const result = await convex.query(presetPageRef, {
        paginationOpts: { cursor: cursor ?? null, numItems: 24 },
      });
      return {
        items: result.page.map(presetView),
        done: result.isDone,
        cursor: result.continueCursor,
      };
    },
    async createPreset(assetId, style) {
      return await convex.action(createPresetRef, {
        accessToken: await requireToken(auth),
        assetPublicId: assetId,
        ...style,
      });
    },
    async updatePreset(presetId, style) {
      await convex.action(updatePresetRef, {
        accessToken: await requireToken(auth),
        presetId,
        ...style,
      });
    },
    async deletePreset(presetId) {
      await convex.action(deletePresetRef, {
        accessToken: await requireToken(auth),
        presetId,
      });
    },
  };
}
