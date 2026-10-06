'use node';

import { deflateSync } from 'node:zlib';

import { imageSize } from 'image-size';
import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';

import { withBffAccountAction } from '@tofler/bff-auth/convex/server';
import { createBffProductAccessClient } from '@tofler/bff-auth/server';
import type { Id } from './_generated/dataModel';
import { action } from './_generated/server';
import {
  tablecardsCustomerAuth,
  tablecardsCustomerSession,
  tablecardsDevelopmentMocksEnabled,
} from './environment';
import { fail } from './lib/productErrors';

const UNIT_TYPE = 'ai_background_batch';
const WIDTH = 1344;
const HEIGHT = 768;
const batchState = v.union(
  v.literal('queued'),
  v.literal('generating'),
  v.literal('ready'),
  v.literal('failed'),
);

type BatchState = 'failed' | 'generating' | 'queued' | 'ready';
type GeneratedImage = {
  readonly bytes: Uint8Array;
  readonly mimeType: 'image/jpeg' | 'image/png';
  readonly width: number;
  readonly height: number;
};
type StartedBatch = {
  publicId: string;
  status: BatchState;
  created: boolean;
  reservationId?: string;
  generatedAssetsPersisted: boolean;
  unitCommitConfirmed: boolean;
  unitCommitRejected: boolean;
};

const startReference = makeFunctionReference<
  'mutation',
  {
    accountId: string;
    userId: string;
    projectId?: string;
    prompt: string;
    idempotencyKey: string;
  },
  StartedBatch
>('aiState:start');
const markGeneratingReference = makeFunctionReference<
  'mutation',
  { accountId: string; batchId: string; reservationId: string },
  null
>('aiState:markGenerating');
const recordGeneratedReference = makeFunctionReference<
  'mutation',
  {
    accountId: string;
    batchId: string;
    assets: {
      storageId: Id<'_storage'>;
      mimeType: 'image/png' | 'image/jpeg';
      width: number;
      height: number;
    }[];
  },
  null
>('aiState:recordGenerated');
const confirmUnitCommitReference = makeFunctionReference<
  'mutation',
  { accountId: string; batchId: string },
  null
>('aiState:confirmUnitCommit');
const completeReference = makeFunctionReference<
  'mutation',
  { accountId: string; batchId: string },
  null
>('aiState:complete');
const rejectUnitCommitReference = makeFunctionReference<
  'mutation',
  { accountId: string; batchId: string },
  null
>('aiState:rejectUnitCommit');
const markFailedReference = makeFunctionReference<
  'mutation',
  { accountId: string; batchId: string; errorCode: string },
  null
>('aiState:markFailed');

const client = createBffProductAccessClient({
  bffBaseUrl: tablecardsCustomerSession.bffBaseUrl,
  environmentKey: tablecardsCustomerAuth.environmentKey,
  timeoutMilliseconds: 180_000,
});

function uint32(value: number): Uint8Array {
  const output = new Uint8Array(4);
  new DataView(output.buffer).setUint32(0, value, false);
  return output;
}

function concatenate(parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(
    parts.reduce((total, part) => total + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
    }
  }
  return (value ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const body = concatenate([typeBytes, data]);
  return concatenate([uint32(data.length), body, uint32(crc32(body))]);
}

function solidPng(red: number, green: number, blue: number): Uint8Array {
  const rowLength = 1 + WIDTH * 4;
  const raw = new Uint8Array(rowLength * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    const rowOffset = y * rowLength;
    raw[rowOffset] = 0;
    for (let x = 0; x < WIDTH; x += 1) {
      const offset = rowOffset + 1 + x * 4;
      const shade = Math.round((x / WIDTH) * 18 + (y / HEIGHT) * 12);
      raw[offset] = Math.min(255, red + shade);
      raw[offset + 1] = Math.min(255, green + shade);
      raw[offset + 2] = Math.min(255, blue + shade);
      raw[offset + 3] = 255;
    }
  }
  const header = concatenate([
    uint32(WIDTH),
    uint32(HEIGHT),
    new Uint8Array([8, 6, 0, 0, 0]),
  ]);
  return concatenate([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', new Uint8Array(deflateSync(raw, { level: 9 }))),
    pngChunk('IEND', new Uint8Array()),
  ]);
}

function deterministicImages(): GeneratedImage[] {
  return [
    [198, 218, 205],
    [225, 205, 198],
    [199, 211, 232],
    [228, 221, 191],
  ].map(([red, green, blue]) => ({
    bytes: solidPng(red ?? 0, green ?? 0, blue ?? 0),
    mimeType: 'image/png' as const,
    width: WIDTH,
    height: HEIGHT,
  }));
}

function decodeBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'));
}

async function openAiImages(prompt: string): Promise<GeneratedImage[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) fail('PROVIDER_UNAVAILABLE', 'Image generation is unavailable');
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt: `Create a print-safe place-card background with no words, letters, names, numbers, logos, or watermarks. Style request: ${prompt}`,
      n: 4,
      size: '1344x768',
      quality: 'low',
      output_format: 'jpeg',
      output_compression: 85,
      moderation: 'auto',
    }),
  });
  if (!response.ok) {
    fail('PROVIDER_UNAVAILABLE', 'Image generation is temporarily unavailable');
  }
  const body = (await response.json()) as {
    data?: { b64_json?: string }[];
  };
  if (!body.data || body.data.length !== 4) {
    fail(
      'PROVIDER_UNAVAILABLE',
      'The image provider returned an incomplete batch',
    );
  }
  return body.data.map((entry) => {
    if (!entry.b64_json) {
      fail('PROVIDER_UNAVAILABLE', 'The image provider response was invalid');
    }
    const bytes = decodeBase64(entry.b64_json);
    const dimensions = imageSize(bytes);
    if (
      dimensions.type !== 'jpg' ||
      dimensions.width !== WIDTH ||
      dimensions.height !== HEIGHT
    ) {
      fail(
        'PROVIDER_UNAVAILABLE',
        'The image provider dimensions were invalid',
      );
    }
    return {
      bytes,
      mimeType: 'image/jpeg' as const,
      width: WIDTH,
      height: HEIGHT,
    };
  });
}

async function generateImages(prompt: string): Promise<GeneratedImage[]> {
  const provider = process.env.TABLECARDS_AI_PROVIDER?.trim();
  if (provider === 'openai') return await openAiImages(prompt);
  if (provider === 'development' && tablecardsDevelopmentMocksEnabled()) {
    if (prompt.toLowerCase().includes('[fail]')) {
      fail(
        'PROVIDER_UNAVAILABLE',
        'The development provider failed as requested',
      );
    }
    return deterministicImages();
  }
  fail('PROVIDER_UNAVAILABLE', 'Image generation is unavailable');
}

export const generate = action({
  args: {
    accessToken: v.string(),
    prompt: v.string(),
    idempotencyKey: v.string(),
    projectId: v.optional(v.string()),
  },
  returns: v.object({ batchId: v.string(), status: batchState }),
  handler: withBffAccountAction(
    tablecardsCustomerAuth,
    async (
      ctx,
      args: {
        accessToken: string;
        prompt: string;
        idempotencyKey: string;
        projectId?: string;
      },
      auth,
    ): Promise<{ batchId: string; status: BatchState }> => {
      const prompt = args.prompt.trim();
      if (prompt.length < 3 || prompt.length > 400) {
        fail('INVALID_INPUT', 'Describe the background in 3 to 400 characters');
      }
      const access = await client.getAccess({ contextToken: args.accessToken });
      if (access.accountId !== auth.accountId) {
        fail('FORBIDDEN', 'The account context does not match');
      }
      const unitGrant = access.unitGrants.find(
        (grant) => grant.unitType === UNIT_TYPE,
      );
      if (!unitGrant || unitGrant.allowance < 1) {
        fail('ENTITLEMENT_REQUIRED', 'No AI background batches are available');
      }
      const reusableAssetsEnabled = access.featureFlags.some(
        (feature) => feature.key === 'reusable_presets' && feature.enabled,
      );
      if (!reusableAssetsEnabled && args.projectId === undefined) {
        fail(
          'INVALID_INPUT',
          'Open a saved event before generating event-only backgrounds',
        );
      }
      const startInput = {
        accountId: auth.accountId,
        userId: auth.userId,
        projectId: args.projectId,
        prompt,
        idempotencyKey: args.idempotencyKey,
      };
      const started = await ctx.runMutation(startReference, startInput);
      const batchInput = {
        accountId: auth.accountId,
        batchId: started.publicId,
      };
      const finishGeneratedBatch = async (
        reservationId: string,
        unitCommitConfirmed: boolean,
      ) => {
        if (!unitCommitConfirmed) {
          const committed = await client.commitUnits(
            { contextToken: args.accessToken },
            { reservationId, idempotencyKey: args.idempotencyKey },
          );
          if (
            committed.reservation.state === 'expired' ||
            committed.reservation.state === 'released'
          ) {
            await ctx.runMutation(rejectUnitCommitReference, batchInput);
            return { batchId: started.publicId, status: 'failed' as const };
          }
          if (committed.reservation.state !== 'committed') {
            fail('CONFLICT', 'The AI unit reservation could not be completed');
          }
          await ctx.runMutation(confirmUnitCommitReference, batchInput);
        }
        await ctx.runMutation(completeReference, batchInput);
        return { batchId: started.publicId, status: 'ready' as const };
      };
      const keepCompletionPending = async () => {
        try {
          const durableBatch = await ctx.runMutation(
            startReference,
            startInput,
          );
          if (
            durableBatch.status === 'ready' ||
            durableBatch.unitCommitRejected
          ) {
            return { batchId: started.publicId, status: durableBatch.status };
          }
          await ctx.runMutation(markFailedReference, {
            ...batchInput,
            errorCode: 'AI_COMPLETION_PENDING',
          });
        } catch {
          // Durable outputs and the same idempotency key remain retryable even
          // when recording the recovery notice is itself interrupted.
        }
        return { batchId: started.publicId, status: 'generating' as const };
      };
      if (!started.created) {
        if (
          started.status !== 'ready' &&
          !started.unitCommitRejected &&
          started.generatedAssetsPersisted &&
          started.reservationId
        ) {
          try {
            return await finishGeneratedBatch(
              started.reservationId,
              started.unitCommitConfirmed,
            );
          } catch {
            return await keepCompletionPending();
          }
        }
        return { batchId: started.publicId, status: started.status };
      }

      let reservationId: string | undefined;
      let outputsPersistenceStarted = false;
      const stored: Id<'_storage'>[] = [];
      try {
        const reservation = await client.reserveUnits(
          { contextToken: args.accessToken },
          {
            unitType: UNIT_TYPE,
            amount: 1,
            idempotencyKey: args.idempotencyKey,
          },
        );
        reservationId = reservation.reservation.id;
        await ctx.runMutation(markGeneratingReference, {
          accountId: auth.accountId,
          batchId: started.publicId,
          reservationId,
        });
        const images = await generateImages(prompt);
        if (images.length !== 4) {
          fail(
            'PROVIDER_UNAVAILABLE',
            'The provider returned an incomplete batch',
          );
        }
        const assets = [];
        for (const image of images) {
          const storageId = await ctx.storage.store(
            new Blob([Uint8Array.from(image.bytes).buffer], {
              type: image.mimeType,
            }),
          );
          stored.push(storageId);
          assets.push({
            storageId,
            mimeType: image.mimeType,
            width: image.width,
            height: image.height,
          });
        }
        outputsPersistenceStarted = true;
        await ctx.runMutation(recordGeneratedReference, {
          ...batchInput,
          assets,
        });
        return await finishGeneratedBatch(reservationId, false);
      } catch {
        if (outputsPersistenceStarted) {
          // A mutation/commit can succeed remotely even if its response is lost.
          // Re-read durable state before choosing cleanup; an unavailable read
          // must preserve the potentially charged outputs for the next retry.
          let durableBatch: StartedBatch | undefined;
          try {
            durableBatch = await ctx.runMutation(startReference, startInput);
          } catch {
            // The next identical request will reconcile the durable batch.
          }
          if (durableBatch?.status === 'ready') {
            return { batchId: started.publicId, status: 'ready' };
          }
          if (
            durableBatch === undefined ||
            durableBatch.generatedAssetsPersisted
          ) {
            return await keepCompletionPending();
          }
        }
        for (const storageId of stored) await ctx.storage.delete(storageId);
        if (reservationId) {
          try {
            await client.releaseUnits(
              { contextToken: args.accessToken },
              {
                reservationId,
                idempotencyKey: args.idempotencyKey,
              },
            );
          } catch {
            // Reservation expiry is the final safety net if BFF is unavailable.
          }
        }
        await ctx.runMutation(markFailedReference, {
          accountId: auth.accountId,
          batchId: started.publicId,
          errorCode: 'PROVIDER_UNAVAILABLE',
        });
        // A definitive, persisted failure is part of the operation protocol.
        // Returning its ID lets clients distinguish a fresh-attempt retry from
        // an uncertain network/commit response which must reuse the old key.
        return { batchId: started.publicId, status: 'failed' as const };
      }
    },
  ),
});
