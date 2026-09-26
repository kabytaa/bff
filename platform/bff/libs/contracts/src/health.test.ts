import { describe, expect, it } from 'vitest';

import {
  HEALTH_SERVICE_NAME,
  healthResponseSchema,
  parseHealthResponse,
} from './health';

describe('healthResponseSchema', () => {
  it('accepts the public health contract', () => {
    expect(
      parseHealthResponse({
        status: 'ok',
        service: HEALTH_SERVICE_NAME,
        version: '73608e446538',
      }),
    ).toEqual({
      status: 'ok',
      service: HEALTH_SERVICE_NAME,
      version: '73608e446538',
    });
  });

  it.each([
    {},
    { status: 'down', service: HEALTH_SERVICE_NAME, version: '1' },
    { status: 'ok', service: 'another-service', version: '1' },
    { status: 'ok', service: HEALTH_SERVICE_NAME, version: '   ' },
  ])('rejects an invalid response: %j', (value) => {
    expect(healthResponseSchema.safeParse(value).success).toBe(false);
  });
});
