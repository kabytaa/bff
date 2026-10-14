import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseSupportInvocation, runSupportCommand } from './supportOperations';

const base = [
  '--url',
  'https://compassionate-buffalo-689.convex.cloud',
  '--confirm-cloud',
  '--key',
  'example-development',
];
const scope = [...base, '--case-id', 'conversation_synthetic001'];
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('identity-attributed support CLI', () => {
  it('uses guarded public contracts and exact Send confirmation', () => {
    expect(parseSupportInvocation(['support-queue', ...base])).toMatchObject({
      kind: 'query',
      functionName: 'operations:cases',
      args: {
        environmentKey: 'example-development',
        paginationOpts: { numItems: 25, cursor: null },
      },
    });
    expect(
      parseSupportInvocation([
        'support-save-draft',
        ...scope,
        '--pending-id',
        'pending_synthetic001',
        '--text',
        'Reviewed answer',
      ]),
    ).toMatchObject({
      kind: 'mutation',
      functionName: 'operations:saveDraft',
      args: { pendingId: 'pending_synthetic001', text: 'Reviewed answer' },
    });
    expect(
      parseSupportInvocation([
        'support-preview-reply',
        ...scope,
        '--pending-id',
        'pending_synthetic001',
        '--closing',
      ]).args,
    ).toMatchObject({ pendingId: 'pending_synthetic001', closing: true });
    expect(() =>
      parseSupportInvocation([
        'support-send-reply',
        ...scope,
        '--pending-id',
        'pending_synthetic001',
      ]),
    ).toThrow('confirm-send');
    expect(
      parseSupportInvocation([
        'support-send-reply',
        ...scope,
        '--pending-id',
        'pending_synthetic001',
        '--confirm-send',
      ]),
    ).toMatchObject({ functionName: 'operations:sendReply' });
  });
  it('rejects arbitrary credential destinations, oversized pages and unconfirmed production mutation', () => {
    expect(() =>
      parseSupportInvocation([
        'support-queue',
        '--url',
        'https://attacker.invalid/',
        '--confirm-cloud',
      ]),
    ).toThrow('Convex deployment');
    expect(() =>
      parseSupportInvocation(['support-queue', ...base, '--limit', '51']),
    ).toThrow();
    expect(() =>
      parseSupportInvocation([
        'support-note',
        '--url',
        'https://production-example.convex.cloud',
        '--confirm-cloud',
        '--key',
        'example-production',
        '--case-id',
        'conversation_synthetic001',
        '--text',
        'Note',
      ]),
    ).toThrow('confirm-production');
  });
  it('requires a process-held admitted token and sanitizes backend errors', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const runner = vi.fn(async () => ({ page: [] }));
    vi.stubEnv('BFF_OPERATOR_TOKEN', '');
    expect(await runSupportCommand(['support-queue', ...base], runner)).toBe(2);
    expect(runner).not.toHaveBeenCalled();
    vi.stubEnv('BFF_OPERATOR_TOKEN', 'synthetic-operator-token-held-in-memory');
    expect(await runSupportCommand(['support-queue', ...base], runner)).toBe(0);
    expect(runner).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'operations:cases' }),
      'synthetic-operator-token-held-in-memory',
    );
    expect(
      await runSupportCommand(['support-queue', ...base], async () => {
        throw new Error('SECRET-provider-body');
      }),
    ).toBe(2);
    expect(error.mock.calls.flat().join(' ')).not.toContain(
      'SECRET-provider-body',
    );
    expect(info.mock.calls.flat().join(' ')).not.toContain(
      'synthetic-operator-token',
    );
  });
});
