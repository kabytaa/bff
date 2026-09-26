import { describe, expect, it } from 'vitest';

import { normalizeOperatorEmails } from './authorization';

describe('normalizeOperatorEmails', () => {
  it('accepts unique email addresses and normalizes case', () => {
    expect(normalizeOperatorEmails(['Operator@Example.com'])).toEqual([
      'operator@example.com',
    ]);
  });

  it.each([
    [''],
    [' operator@example.com'],
    ['not-an-email'],
    ['operator@example.com', 'OPERATOR@example.com'],
    [{}],
  ])('rejects malformed or duplicate configuration', (...values) => {
    expect(() => normalizeOperatorEmails(values)).toThrow(
      /CONFIGURATION_ERROR|allowlist/,
    );
  });
});
