import { describe, expect, it } from 'vitest';

import { createBffProductAccessClient } from './productAccess';
import type { BffProductAccessError } from './productAccess';

const baseUrl = 'https://bff-dev.tofler.tech';
const environmentKey = 'tablecards-development';
const context = { contextToken: 'header.payload.signature' };

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function access() {
  return {
    version: 1,
    accountId: 'account_1234567890123456',
    offerKey: 'free',
    offerRevision: 1,
    source: 'default',
    featureFlags: [],
    numericLimits: [],
    unitGrants: [],
    effectiveAt: 1,
    updatedAt: 1,
  };
}

describe('createBffProductAccessClient', () => {
  it('initializes default access only with a bounded server credential, never sending it on ordinary reads', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const client = createBffProductAccessClient({
      bffBaseUrl: baseUrl,
      environmentKey,
      fetch: async (input, init) => {
        calls.push({ url: String(input), init });
        return response(access());
      },
    });
    const input = {
      offerKey: 'free',
      offerRevision: 1,
      featureFlags: [],
      numericLimits: [],
      unitGrants: [
        {
          unitType: 'ai_background_batch',
          periodKey: 'welcome-lifetime-v1',
          allowance: 1,
        },
      ],
    };
    for (const serviceToken of [
      '',
      'too-short',
      's'.repeat(257),
      's'.repeat(32) + '\n',
    ]) {
      await expect(
        client.ensureDefaultAccess({ ...context, serviceToken }, input),
      ).rejects.toThrow('serviceToken');
    }
    expect(calls).toEqual([]);
    const serviceToken = 'synthetic_default_service_token_001';
    await client.ensureDefaultAccess({ ...context, serviceToken }, input);
    expect(calls[0]?.url).toBe(`${baseUrl}/v1/product-access/default`);
    expect(calls[0]?.init?.method).toBe('POST');
    expect(
      new Headers(calls[0]?.init?.headers).get(
        'x-tofler-service-authorization',
      ),
    ).toBe(`Bearer ${serviceToken}`);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual(input);
    await client.getAccess(context);
    expect(
      new Headers(calls[1]?.init?.headers).has(
        'x-tofler-service-authorization',
      ),
    ).toBe(false);
    expect(calls.every(({ url }) => !url.includes(serviceToken))).toBe(true);
  });
  it('forwards only the short context and environment to the BFF', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const client = createBffProductAccessClient({
      bffBaseUrl: baseUrl,
      environmentKey,
      fetch: async (input, init) => {
        calls.push({ url: String(input), init });
        return response(access());
      },
    });

    await expect(client.getAccess(context)).resolves.toMatchObject({
      offerKey: 'free',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${baseUrl}/v1/product-access`);
    expect(new Headers(calls[0]?.init?.headers).get('authorization')).toBe(
      `Bearer ${context.contextToken}`,
    );
    expect(
      new Headers(calls[0]?.init?.headers).get('x-tofler-environment'),
    ).toBe(environmentKey);
    expect(calls[0]?.init?.cache).toBe('no-store');
  });

  it('validates inputs before sending and encodes balance keys safely', async () => {
    const urls: string[] = [];
    const bodies: unknown[] = [];
    const client = createBffProductAccessClient({
      bffBaseUrl: baseUrl,
      environmentKey,
      fetch: async (input, init) => {
        urls.push(String(input));
        if (init?.body) bodies.push(JSON.parse(String(init.body)));
        if (String(input).endsWith('/units/reserve')) {
          return response({
            reservation: {
              id: 'unit_reservation_1234567890',
              unitType: 'ai_background_batch',
              periodKey: 'billing-cycle:1:2',
              amount: 1,
              state: 'reserved',
              expiresAt: 2,
              createdAt: 1,
              updatedAt: 1,
            },
            balance: {
              accountId: 'account_1234567890123456',
              unitType: 'ai_background_batch',
              periodKey: 'billing-cycle:1:2',
              allowance: 1,
              reserved: 1,
              consumed: 0,
              available: 0,
              updatedAt: 1,
            },
          });
        }
        return response({
          accountId: 'account_1234567890123456',
          unitType: 'ai_background_batch',
          periodKey: 'month:2026-09',
          allowance: 1,
          reserved: 0,
          consumed: 0,
          available: 1,
          updatedAt: 1,
        });
      },
    });

    await client.getUnitBalance(context, {
      unitType: 'ai_background_batch',
    });
    expect(urls[0]).toBe(
      `${baseUrl}/v1/product-access/units?unitType=ai_background_batch`,
    );
    await client.reserveUnits(context, {
      unitType: 'ai_background_batch',
      amount: 1,
      idempotencyKey: 'request_1234567890123456',
    });
    expect(bodies).toEqual([
      {
        unitType: 'ai_background_batch',
        amount: 1,
        idempotencyKey: 'request_1234567890123456',
      },
    ]);
    await expect(
      client.reserveUnits(context, {
        unitType: 'invalid unit',
        amount: 1,
        idempotencyKey: 'request_1234567890123456',
      }),
    ).rejects.toThrow();
    expect(urls).toHaveLength(2);
  });

  it('throws typed safe errors and rejects malformed success responses', async () => {
    const exhausted = createBffProductAccessClient({
      bffBaseUrl: baseUrl,
      environmentKey,
      fetch: async () =>
        response(
          {
            error: {
              code: 'UNIT_EXHAUSTED',
              message: 'No units remain.',
              correlationId: 'error_1234567890123456',
            },
          },
          409,
        ),
    });
    await expect(exhausted.getAccess(context)).rejects.toMatchObject({
      code: 'UNIT_EXHAUSTED',
      status: 409,
      correlationId: 'error_1234567890123456',
    } satisfies Partial<BffProductAccessError>);

    const malformed = createBffProductAccessClient({
      bffBaseUrl: baseUrl,
      environmentKey,
      fetch: async () => response({ token: 'secret' }),
    });
    await expect(malformed.getAccess(context)).rejects.toMatchObject({
      code: 'RETRYABLE_UNAVAILABLE',
      status: 503,
    });
  });

  it('requires a canonical HTTPS BFF origin', () => {
    expect(() =>
      createBffProductAccessClient({
        bffBaseUrl: 'http://bff.invalid',
        environmentKey,
      }),
    ).toThrow('canonical HTTPS origin');
  });
});
