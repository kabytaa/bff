import { describe, expect, it } from 'vitest';

import { parseOperatorIdentities } from './authorization';

describe('parseOperatorIdentities', () => {
  it('accepts unique issuer and subject pairs', () => {
    expect(
      parseOperatorIdentities(
        JSON.stringify([
          {
            issuer: 'https://accounts.google.com',
            subject: 'operator-123',
          },
        ]),
      ),
    ).toEqual([
      {
        issuer: 'https://accounts.google.com',
        subject: 'operator-123',
      },
    ]);
  });

  it.each([
    'not-json',
    '{}',
    '[{"issuer":"","subject":"operator"}]',
    '[{"issuer":"issuer","subject":"   "}]',
    '[{"issuer":"issuer"}]',
    '[{"issuer":"issuer","subject":"operator","email":"operator@example.com"}]',
    '[{"issuer":"issuer","subject":"operator"},{"issuer":"issuer","subject":"operator"}]',
  ])('rejects malformed or duplicate configuration', (raw) => {
    expect(() => parseOperatorIdentities(raw)).toThrow(
      /CONFIGURATION_ERROR|allowlist/,
    );
  });
});
