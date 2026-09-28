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
}

export interface SavedProject extends ProjectSummary {
  readonly guests?: readonly GuestRow[];
}

export interface CurrentProductAccess {
  readonly offerKey: OfferId;
  readonly offerName?: string;
  readonly maxCardsPerProject?: number;
  readonly maxActiveProjects?: number;
  readonly artworkUploadEnabled?: boolean;
  readonly aiBackgroundBatchesRemaining?: number;
}

interface BackendProjectSummary {
  readonly publicId: string;
  readonly title: string;
  readonly guestCount: number;
  readonly designReference: string;
  readonly designKind: 'predefined' | 'uploaded' | 'ai';
  readonly updatedAt: number;
  readonly guests?: readonly GuestRow[];
}

interface BackendOfferView {
  readonly id: OfferId;
  readonly name: string;
  readonly maximumCardsPerProject: number;
  readonly maximumActiveProjects: number;
  readonly customArtwork: boolean;
  readonly aiAllowance: number;
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

const listProjectsRef = makeFunctionReference<
  'query',
  Record<string, never>,
  readonly BackendProjectSummary[]
>('projects:list');
const getProjectRef = makeFunctionReference<
  'query',
  { projectId: string },
  BackendProjectSummary | null
>('projects:get');
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
    };
  },
  BackendProjectSummary
>('productAccess:saveProject');
const currentProductAccessRef = makeFunctionReference<
  'action',
  { accessToken: string },
  BackendOfferView
>('productAccess:current');
const selectDevelopmentOfferRef = makeFunctionReference<
  'action',
  { accessToken: string; offerKey: OfferId },
  BackendOfferView
>('productAccess:selectDevelopmentOffer');
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

function projectView(project: BackendProjectSummary): SavedProject {
  return {
    id: project.publicId,
    title: project.title,
    guestCount: project.guestCount,
    designId: project.designReference,
    designKind: project.designKind,
    updatedAt: project.updatedAt,
    ...(project.guests === undefined ? {} : { guests: project.guests }),
  };
}

function accessView(access: BackendOfferView): CurrentProductAccess {
  return {
    offerKey: access.id,
    offerName: access.name,
    maxCardsPerProject: access.maximumCardsPerProject,
    maxActiveProjects: access.maximumActiveProjects,
    artworkUploadEnabled: access.customArtwork,
    aiBackgroundBatchesRemaining: access.aiAllowance,
  };
}

async function requireToken(auth: BffAuthBrowserClient) {
  const token = await auth.getAccessToken(false);
  if (!token) throw new Error('Sign in and select an account to continue.');
  return token;
}

export interface TableCardsBackend {
  listProjects(): Promise<readonly ProjectSummary[]>;
  getProject(projectId: string): Promise<SavedProject | null>;
  getCurrentAccess(): Promise<CurrentProductAccess>;
  saveProject(input: {
    readonly projectId?: string;
    readonly title: string;
    readonly guests: readonly GuestRow[];
    readonly design: {
      readonly kind: 'predefined' | 'uploaded' | 'ai';
      readonly reference: string;
    };
  }): Promise<SavedProject>;
  selectDevelopmentOffer(offerKey: OfferId): Promise<CurrentProductAccess>;
  requestExport(
    projectId: string,
    layoutId: PrintLayoutId,
  ): Promise<{ readonly exportId: string }>;
  getExport(exportId: string): Promise<ExportStatus | null>;
  generateAi(input: {
    readonly prompt: string;
    readonly idempotencyKey: string;
    readonly projectId?: string;
  }): Promise<AiBatch>;
  uploadArtwork(
    file: File,
    projectId?: string,
  ): Promise<{ readonly publicId: string }>;
}

export function createTableCardsBackend(
  convex: ConvexReactClient,
  auth: BffAuthBrowserClient,
): TableCardsBackend {
  return {
    async listProjects() {
      return (await convex.query(listProjectsRef, {})).map(projectView);
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
    async selectDevelopmentOffer(offerKey) {
      return accessView(
        await convex.action(selectDevelopmentOfferRef, {
          accessToken: await requireToken(auth),
          offerKey,
        }),
      );
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
  };
}
