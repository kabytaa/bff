import { describe, expect, it, vi, afterEach } from 'vitest';
import { AI_BATCH_BUDGET_MICRO_USD, dailyAiBatchLimit } from './aiBudget';

afterEach(() => vi.unstubAllEnvs());

describe('deployment AI budget', () => {
  it.each([
    ['0', 0],
    ['0.01', 1],
    ['0.06', 8],
    ['1', 138],
    ['1.00', 138],
    [' 1.00 ', 138],
    ['2.50', 347],
    ['7.20', 1_000],
  ])('converts $%s into %s conservatively priced starts', (value, limit) => {
    expect(dailyAiBatchLimit(value)).toBe(limit);
    expect(limit * AI_BATCH_BUDGET_MICRO_USD).toBeLessThanOrEqual(
      Number(value) * 1_000_000,
    );
    expect((limit + 1) * AI_BATCH_BUDGET_MICRO_USD).toBeGreaterThan(
      Number(value) * 1_000_000,
    );
  });

  it.each([
    '',
    'NaN',
    'Infinity',
    '-1',
    '1e2',
    '1.001',
    '7.21',
    '1000000000000000000',
  ])('fails closed for invalid or oversized budget %s', (value) =>
    expect(dailyAiBatchLimit(value)).toBe(0),
  );

  it('reads only deployment configuration and defaults to disabled', () => {
    vi.stubEnv('TABLECARDS_AI_DAILY_BUDGET_USD', undefined);
    expect(dailyAiBatchLimit()).toBe(0);
    vi.stubEnv('TABLECARDS_AI_DAILY_BUDGET_USD', '1');
    expect(dailyAiBatchLimit()).toBe(138);
    vi.stubEnv('TABLECARDS_AI_DAILY_BUDGET_USD', '0.06');
    expect(dailyAiBatchLimit()).toBe(8);
  });
});
