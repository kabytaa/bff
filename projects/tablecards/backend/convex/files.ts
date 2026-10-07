import { imageSize } from 'image-size';
import { makeFunctionReference } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import {
  withBffAccountHttpAction,
  type BffConvexAccountContext,
} from '@tofler/bff-auth/convex/server';
import {
  BffProductAccessError,
  createBffProductAccessClient,
} from '@tofler/bff-auth/server';
import type { Id } from './_generated/dataModel';
import { httpAction, internalQuery, type ActionCtx } from './_generated/server';
import {
  tablecardsCustomerAuth,
  tablecardsCustomerSession,
} from './environment';
import { fail } from './lib/productErrors';
import {
  MAX_ARTWORK_PIXELS,
  validateArtworkPixels,
} from './lib/validateArtwork';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
// Convex HTTP responses are bounded at 20 MiB. Leave room for transport overhead.
const MAX_DOWNLOAD_BYTES = 19 * 1024 * 1024;
const client = createBffProductAccessClient({
  bffBaseUrl: tablecardsCustomerSession.bffBaseUrl,
  environmentKey: tablecardsCustomerAuth.environmentKey,
});
const fileDescriptor = v.object({
  storageId: v.id('_storage'),
  mimeType: v.union(
    v.literal('image/png'),
    v.literal('image/jpeg'),
    v.literal('application/pdf'),
  ),
});
const lookupReference = makeFunctionReference<
  'query',
  {
    accountId: string;
    kind: 'assets' | 'exports';
    publicId: string;
  },
  {
    storageId: Id<'_storage'>;
    mimeType: 'image/png' | 'image/jpeg' | 'application/pdf';
  } | null
>('files:lookup');
const checkProjectReference = makeFunctionReference<
  'query',
  {
    accountId: string;
    projectId: string;
  },
  null
>('files:checkUploadProject');
const recordReference = makeFunctionReference<
  'mutation',
  {
    accountId: string;
    userId: string;
    storageId: Id<'_storage'>;
    projectId?: string;
    mimeType: 'image/png' | 'image/jpeg';
    width: number;
    height: number;
    source: 'uploaded';
  },
  {
    publicId: string;
    mimeType: 'image/png' | 'image/jpeg';
    width: number;
    height: number;
  }
>('assets:recordValidated');
const cleanupReference = makeFunctionReference<
  'mutation',
  { storageId: Id<'_storage'> },
  boolean
>('assets:cleanupUnattached');

export const lookup = internalQuery({
  args: {
    accountId: v.string(),
    kind: v.union(v.literal('assets'), v.literal('exports')),
    publicId: v.string(),
  },
  returns: v.union(v.null(), fileDescriptor),
  handler: async (ctx, args) => {
    if (args.kind === 'assets') {
      const asset = await ctx.db
        .query('designAssets')
        .withIndex('by_account_public_id', (q) =>
          q.eq('accountId', args.accountId).eq('publicId', args.publicId),
        )
        .unique();
      if (!asset) return null;
      if (asset.projectId) {
        const project = await ctx.db.get(asset.projectId);
        if (!project || project.accountId !== args.accountId) return null;
      }
      return { storageId: asset.storageId, mimeType: asset.mimeType };
    }
    const job = await ctx.db
      .query('projectExports')
      .withIndex('by_account_public_id', (q) =>
        q.eq('accountId', args.accountId).eq('publicId', args.publicId),
      )
      .unique();
    if (!job?.storageId || job.status !== 'ready') return null;
    const project = await ctx.db.get(job.projectId);
    if (!project || project.accountId !== args.accountId) return null;
    return { storageId: job.storageId, mimeType: 'application/pdf' as const };
  },
});

export const checkUploadProject = internalQuery({
  args: { accountId: v.string(), projectId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query('projects')
      .withIndex('by_account_public_id', (q) =>
        q.eq('accountId', args.accountId).eq('publicId', args.projectId),
      )
      .unique();
    if (!project || project.state !== 'active')
      fail('NOT_FOUND', 'The active project was not found');
    return null;
  },
});

function errorResponse(error: unknown): Response {
  if (error instanceof BffProductAccessError) {
    const denied =
      error.code === 'UNAUTHENTICATED' ||
      error.code === 'FORBIDDEN' ||
      error.code === 'ONBOARDING_REQUIRED';
    return Response.json(
      {
        error: {
          code: denied ? error.code : 'PROVIDER_UNAVAILABLE',
          message: denied
            ? 'Sign in and select an available account to continue.'
            : 'File access is temporarily unavailable. Try again.',
        },
      },
      { status: denied ? (error.code === 'UNAUTHENTICATED' ? 401 : 403) : 503 },
    );
  }
  if (
    error instanceof ConvexError &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'code' in error.data &&
    'message' in error.data
  ) {
    const code = String(error.data.code);
    const status =
      code === 'NOT_FOUND'
        ? 404
        : code === 'FORBIDDEN' || code === 'ENTITLEMENT_REQUIRED'
          ? 403
          : 400;
    return Response.json(
      { error: { code, message: String(error.data.message) } },
      { status },
    );
  }
  return Response.json(
    {
      error: {
        code: 'PROVIDER_UNAVAILABLE',
        message: 'File transfer failed. Try again.',
      },
    },
    { status: 503 },
  );
}

function protectedAction(
  method: 'GET' | 'POST',
  handler: (
    ctx: ActionCtx,
    request: Request,
    auth: BffConvexAccountContext,
  ) => Promise<Response>,
) {
  const guarded = withBffAccountHttpAction<ActionCtx>(
    {
      ...tablecardsCustomerAuth,
      webOrigins: tablecardsCustomerSession.transport.webOrigins,
      allowedMethods: [method],
    },
    async (ctx, request, auth) => {
      try {
        return await handler(ctx, request, auth);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
  return httpAction(async (ctx, request) => {
    const response = await guarded(ctx, request);
    if (request.method === 'OPTIONS' && response.status === 204) {
      const headers = new Headers(response.headers);
      headers.set(
        'access-control-allow-headers',
        'Authorization, Content-Type',
      );
      return new Response(null, { status: 204, headers });
    }
    return response;
  });
}

async function currentAccess(request: Request, auth: BffConvexAccountContext) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ') || authorization.length > 16 * 1024)
    fail('FORBIDDEN', 'Authentication is required');
  // BFF validates live membership and session. A still-valid JWT alone does
  // not authorize delivery after removal, logout or session expiration.
  const access = await client.getAccess({
    contextToken: authorization.slice(7),
  });
  if (access.accountId !== auth.accountId)
    fail('FORBIDDEN', 'The account context does not match');
  return access;
}

async function boundedBytes(request: Request): Promise<Uint8Array> {
  const declared = request.headers.get('content-length');
  if (
    declared !== null &&
    (!/^\d+$/u.test(declared) || Number(declared) > MAX_UPLOAD_BYTES)
  )
    fail('INVALID_INPUT', 'Artwork must be 10 MiB or smaller');
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_UPLOAD_BYTES) {
        await reader.cancel();
        fail('INVALID_INPUT', 'Artwork must be 10 MiB or smaller');
      }
      chunks.push(value);
    }
  }
  if (length === 0) fail('INVALID_INPUT', 'Choose a PNG or JPEG image');
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export const upload = protectedAction('POST', async (ctx, request, auth) => {
  const url = new URL(request.url);
  if (
    [...url.searchParams.keys()].some((key) => key !== 'projectId') ||
    url.searchParams.getAll('projectId').length > 1
  )
    fail('INVALID_INPUT', 'Invalid upload request');
  const projectId = url.searchParams.get('projectId') ?? undefined;
  if (projectId !== undefined && !/^[a-z0-9_]{1,128}$/iu.test(projectId))
    fail('INVALID_INPUT', 'Invalid project');
  const access = await currentAccess(request, auth);
  const enabled = (key: string) =>
    access.featureFlags.some((flag) => flag.key === key && flag.enabled);
  if (!enabled('custom_artwork'))
    fail('ENTITLEMENT_REQUIRED', 'Uploaded artwork requires a paid offer');
  if (!enabled('reusable_presets') && !projectId)
    fail(
      'INVALID_INPUT',
      'Open a saved event before uploading event-only artwork',
    );
  if (projectId)
    await ctx.runQuery(checkProjectReference, {
      accountId: auth.accountId,
      projectId,
    });
  const mimeType = request.headers.get('content-type');
  if (mimeType !== 'image/png' && mimeType !== 'image/jpeg')
    fail('INVALID_INPUT', 'Only PNG and JPEG artwork is supported');
  const bytes = await boundedBytes(request);
  let dimensions: ReturnType<typeof imageSize>;
  try {
    dimensions = imageSize(bytes);
  } catch {
    fail('INVALID_INPUT', 'Choose a valid PNG or JPEG image');
  }
  if (
    dimensions.type !== (mimeType === 'image/png' ? 'png' : 'jpg') ||
    dimensions.width < 1050 ||
    dimensions.height < 600 ||
    dimensions.width * 4 !== dimensions.height * 7 ||
    (dimensions.orientation !== undefined && dimensions.orientation !== 1)
  )
    fail(
      'INVALID_INPUT',
      'Artwork must be an unrotated 7:4 image at least 1050 by 600 pixels',
    );
  if (dimensions.width * dimensions.height > MAX_ARTWORK_PIXELS)
    fail('INVALID_INPUT', 'Artwork must be 2 megapixels or smaller');
  try {
    validateArtworkPixels(bytes, mimeType, dimensions.width, dimensions.height);
  } catch {
    fail('INVALID_INPUT', 'Choose a complete, valid PNG or JPEG image');
  }
  const storageId = await ctx.storage.store(
    new Blob([Uint8Array.from(bytes).buffer], { type: mimeType }),
  );
  try {
    // Recheck authoritative authorization after reading/storing a slow body.
    const finalAccess = await currentAccess(request, auth);
    if (
      !finalAccess.featureFlags.some(
        (flag) => flag.key === 'custom_artwork' && flag.enabled,
      )
    )
      fail('ENTITLEMENT_REQUIRED', 'Uploaded artwork requires a paid offer');
    const asset = await ctx.runMutation(recordReference, {
      accountId: auth.accountId,
      userId: auth.userId,
      storageId,
      ...(projectId === undefined ? {} : { projectId }),
      mimeType,
      width: dimensions.width,
      height: dimensions.height,
      source: 'uploaded',
    });
    return Response.json(asset, { status: 201 });
  } catch (error) {
    // This ID was created by this handler; caller-selected IDs never enter it.
    await ctx.runMutation(cleanupReference, { storageId });
    throw error;
  }
});

export const download = protectedAction('GET', async (ctx, request, auth) => {
  const url = new URL(request.url);
  const match = /^\/v1\/files\/(assets|exports)\/([a-z0-9_]{1,128})$/iu.exec(
    url.pathname,
  );
  if (!match || !match[2] || url.search)
    fail('NOT_FOUND', 'The file was not found');
  await currentAccess(request, auth);
  const descriptor = await ctx.runQuery(lookupReference, {
    accountId: auth.accountId,
    kind: match[1] as 'assets' | 'exports',
    publicId: match[2],
  });
  if (!descriptor) fail('NOT_FOUND', 'The file was not found');
  const blob = await ctx.storage.get(descriptor.storageId);
  if (!blob) fail('NOT_FOUND', 'The file was not found');
  if (blob.size > MAX_DOWNLOAD_BYTES)
    fail('LIMIT_EXCEEDED', 'The file is too large to download');
  return new Response(blob, {
    headers: {
      'content-type': descriptor.mimeType,
      'content-length': String(blob.size),
      'content-disposition':
        descriptor.mimeType === 'application/pdf'
          ? 'attachment; filename="tablecards.pdf"'
          : 'inline',
    },
  });
});
