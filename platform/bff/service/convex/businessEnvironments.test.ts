import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { parseHealthResponse } from '@bff/contracts';
import { BACKOFFICE_OPERATOR_EMAILS } from '@bff/static-config';
import { api, internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const operatorIdentity = {
  issuer: 'https://accounts.google.com',
  subject: 'operator-123',
  tokenIdentifier: 'https://accounts.google.com|operator-123',
  email: BACKOFFICE_OPERATOR_EMAILS[0],
  emailVerified: true,
};

const otherIdentity = {
  issuer: 'https://accounts.google.com',
  subject: 'other-456',
  tokenIdentifier: 'https://accounts.google.com|other-456',
  email: 'other@example.com',
  emailVerified: true,
};

describe('businessEnvironments', () => {
  it('creates, lists, inspects, and updates independent environments', async () => {
    const t = convexTest(schema, modules);

    const development = await t.mutation(internal.businessEnvironments.create, {
      key: 'tablecards-development',
      businessName: ' TableCards ',
      environmentName: ' Development ',
    });
    await t.mutation(internal.businessEnvironments.create, {
      key: 'tablecards-qa',
      businessName: 'TableCards',
      environmentName: 'QA',
    });

    expect(development).toMatchObject({
      key: 'tablecards-development',
      businessName: 'TableCards',
      environmentName: 'Development',
    });

    const beforeUpdate = await t.query(internal.businessEnvironments.inspect, {
      key: 'tablecards-development',
    });
    const updated = await t.mutation(internal.businessEnvironments.update, {
      key: 'tablecards-development',
      environmentName: 'Local',
    });
    const qa = await t.query(internal.businessEnvironments.inspect, {
      key: 'tablecards-qa',
    });

    expect(updated.environmentName).toBe('Local');
    expect(updated.updatedAt).toBeGreaterThan(beforeUpdate.updatedAt);
    expect(qa.environmentName).toBe('QA');
    expect(
      (await t.query(internal.businessEnvironments.list, {})).map(
        ({ key }) => key,
      ),
    ).toEqual(['tablecards-development', 'tablecards-qa']);
  });

  it('rejects duplicate, invalid, missing, and empty updates', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.businessEnvironments.create, {
      key: 'sample-development',
      businessName: 'Sample',
      environmentName: 'Development',
    });

    await expect(
      t.mutation(internal.businessEnvironments.create, {
        key: 'sample-development',
        businessName: 'Sample',
        environmentName: 'Duplicate',
      }),
    ).rejects.toThrow(/CONFLICT|already exists/);
    await expect(
      t.mutation(internal.businessEnvironments.create, {
        key: 'Not Valid',
        businessName: 'Sample',
        environmentName: 'Development',
      }),
    ).rejects.toThrow(/VALIDATION_ERROR|kebab-case/);
    await expect(
      t.query(internal.businessEnvironments.inspect, { key: 'missing-key' }),
    ).rejects.toThrow(/NOT_FOUND|not found/);
    await expect(
      t.mutation(internal.businessEnvironments.update, {
        key: 'sample-development',
      }),
    ).rejects.toThrow(/VALIDATION_ERROR|At least one/);
  });
});

describe('operator authorization', () => {
  it('denies unauthenticated and unlisted callers', async () => {
    const t = convexTest(schema, modules);

    expect(await t.query(api.backoffice.currentOperator, {})).toEqual({
      authenticated: false,
    });
    await expect(t.query(api.backoffice.overview, {})).rejects.toThrow(
      /UNAUTHENTICATED|Authentication is required/,
    );

    const other = t.withIdentity(otherIdentity);
    expect(await other.query(api.backoffice.currentOperator, {})).toEqual({
      authenticated: true,
      email: otherIdentity.email,
      emailVerified: true,
      authorized: false,
    });
    await expect(other.query(api.backoffice.overview, {})).rejects.toThrow(
      /FORBIDDEN|Operator access is required/,
    );
  });

  it('allows only the configured operator and returns a bounded projection', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.businessEnvironments.create, {
      key: 'sample-development',
      businessName: 'Sample',
      environmentName: 'Development',
    });

    const operator = t.withIdentity(operatorIdentity);
    expect(await operator.query(api.backoffice.currentOperator, {})).toEqual({
      authenticated: true,
      email: operatorIdentity.email,
      emailVerified: true,
      authorized: true,
    });

    const overview = await operator.query(api.backoffice.overview, {});
    expect(overview).toMatchObject({
      service: 'business-factory-bff',
      version: 'development',
    });
    expect(overview.businessEnvironments).toHaveLength(1);
    expect(overview.businessEnvironments[0]).toMatchObject({
      key: 'sample-development',
      businessName: 'Sample',
      environmentName: 'Development',
    });
    expect(overview.businessEnvironments[0]).not.toHaveProperty('_id');
    expect(overview.businessEnvironments[0]).not.toHaveProperty(
      '_creationTime',
    );
  });

  it('rejects an unverified email even when the address is allowlisted', async () => {
    const t = convexTest(schema, modules).withIdentity({
      ...operatorIdentity,
      emailVerified: false,
    });

    expect(await t.query(api.backoffice.currentOperator, {})).toMatchObject({
      authenticated: true,
      email: operatorIdentity.email,
      emailVerified: false,
      authorized: false,
    });
    await expect(t.query(api.backoffice.overview, {})).rejects.toThrow(
      /FORBIDDEN|Operator access is required/,
    );
  });
});

describe('health endpoint', () => {
  it('returns the public health contract without authentication', async () => {
    const t = convexTest(schema, modules);
    const response = await t.fetch('/v1/health');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(parseHealthResponse(await response.json())).toEqual({
      status: 'ok',
      service: 'business-factory-bff',
      version: 'development',
    });
  });
});
