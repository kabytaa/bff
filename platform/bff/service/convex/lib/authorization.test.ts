import { describe, expect, it } from 'vitest';

import {
  BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER,
  BACKOFFICE_DEVELOPMENT_AUTOMATION_SUBJECT,
  BACKOFFICE_OPERATOR_EMAILS,
} from '@bff/static-config';
import { isAllowedOperator, normalizeOperatorEmails } from './authorization';

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

describe('isAllowedOperator', () => {
  it('allows only the exact authenticated development automation identity', () => {
    expect(
      isAllowedOperator({
        issuer: BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER,
        subject: BACKOFFICE_DEVELOPMENT_AUTOMATION_SUBJECT,
      }),
    ).toBe(true);

    expect(
      isAllowedOperator({
        issuer: `${BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER}/other`,
        subject: BACKOFFICE_DEVELOPMENT_AUTOMATION_SUBJECT,
      }),
    ).toBe(false);
    expect(
      isAllowedOperator({
        issuer: BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER,
        subject: `${BACKOFFICE_DEVELOPMENT_AUTOMATION_SUBJECT}-other`,
        email: BACKOFFICE_OPERATOR_EMAILS[0],
        emailVerified: true,
      }),
    ).toBe(false);
  });
});
