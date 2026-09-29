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
  readonly url: string | null;
  readonly reusable: boolean;
  readonly createdAt: number;
}

export interface DesignPreset {
  readonly id: string;
  readonly assetId: string;
  readonly assetSource: 'uploaded' | 'ai';
  readonly artworkUrl: string | null;
  readonly displayName: string;
  readonly nameColor: string;
  readonly namePosition: 'top' | 'center' | 'bottom';
  readonly nameFont: 'sans' | 'serif';
  readonly nameSize: 'small' | 'medium' | 'large';
  readonly updatedAt: number;
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
const generateUploadUrlRef = makeFunctionReference<
  'action',
  { accessToken: string },
  string
>('assets:generateUploadUrl');
const finalizeAssetRef = makeFunctionReference<
  'action',
  { accessToken: string; storageId: string; projectId?: string },
  { publicId: string }
>('assets:finalize');
const listAssetsRef = makeFunctionReference<
  'query',
  Record<string, never>,
  readonly {
    publicId: string;
    source: 'uploaded' | 'ai';
    reusable: boolean;
    url: string | null;
    createdAt: number;
  }[]
>('assets:list');
const listPresetsRef = makeFunctionReference<
  'query',
  Record<string, never>,
  readonly {
    publicId: string;
    assetPublicId: string;
    assetSource: 'uploaded' | 'ai';
    artworkUrl: string | null;
    displayName: string;
    nameColor: string;
    namePosition: 'top' | 'center' | 'bottom';
    nameFont: 'sans' | 'serif';
    nameSize: 'small' | 'medium' | 'large';
    updatedAt: number;
  }[]
>('designPresets:list');
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
  listPresets(): Promise<readonly DesignPreset[]>;
  createPreset(assetId: string, style: PresetStyle): Promise<string>;
  updatePreset(presetId: string, style: PresetStyle): Promise<void>;
  deletePreset(presetId: string): Promise<void>;
}

export function createTableCardsBackend(
  convex: ConvexReactClient,
  auth: BffAuthBrowserClient,
): TableCardsBackend {
  return {
    async listProjects(state = 'active') {
      return (await convex.query(listProjectsRef, { state })).map(projectView);
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
          : { storageUrl: result.downloadUrl }),
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
          : { storageUrl: result.downloadUrl }),
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
              .map((choice) => ({ id: choice.publicId, url: choice.url })),
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
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        throw new Error('Choose a PNG or JPEG image.');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Artwork must be 10 MB or smaller.');
      }
      const accessToken = await requireToken(auth);
      const uploadUrl = await convex.action(generateUploadUrlRef, {
        accessToken,
      });
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'content-type': file.type },
        body: file,
      });
      if (!response.ok) throw new Error('Artwork upload failed. Try again.');
      const body = (await response.json()) as { storageId?: unknown };
      if (typeof body.storageId !== 'string') {
        throw new Error('Artwork upload returned an invalid response.');
      }
      return await convex.action(finalizeAssetRef, {
        accessToken,
        storageId: body.storageId,
        ...(projectId === undefined ? {} : { projectId }),
      });
    },
    async listAssets() {
      return (await convex.query(listAssetsRef, {})).map((asset) => ({
        id: asset.publicId,
        source: asset.source,
        url: asset.url,
        reusable: asset.reusable,
        createdAt: asset.createdAt,
      }));
    },
    async listPresets() {
      return (await convex.query(listPresetsRef, {})).map((preset) => ({
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
      }));
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
