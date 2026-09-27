import { describe, expect, it } from 'vitest';

import {
  buildConvexInvocation,
  classifyConvexFailure,
  CliError,
  parseCommand,
} from './cli';
import { run } from './main';

const customerAuthConfiguration = JSON.stringify({
  version: 2,
  definitionRevision: 1,
  definitionFingerprint: 'fnv1a64:0000000000000000',
  presentation: {
    productName: 'Example',
    theme: 'system',
    accentColor: '#314EC6',
  },
  enabledProviders: ['google'],
  developmentAutomationEnabled: false,
  transport: {
    webOrigins: ['https://example.tofler.app'],
    sessionAdapterBaseUrl: 'https://example-backend.convex.site',
    defaultPostLoginPath: '/',
  },
  sessionPolicy: { idleSeconds: 604_800, absoluteSeconds: 2_592_000 },
  accountPolicy: {
    createAccountOnFirstSignIn: true,
    userAccountCreationEnabled: false,
    maxAccountMembershipsPerUser: 1,
    maxOwnedAccountsPerUser: 1,
    ownershipTransferEnabled: false,
  },
  accountDefaults: {
    seatLimit: 1,
    adminRoleEnabled: false,
    memberInvitationsEnabled: false,
  },
});

describe('parseCommand', () => {
  it('parses a local create command', () => {
    expect(
      parseCommand([
        'create',
        '--deployment',
        'local',
        '--key',
        'sample-development',
        '--business-name',
        'Sample',
        '--environment-name',
        'Development',
      ]),
    ).toEqual({
      name: 'create',
      deployment: 'local',
      confirmCloud: false,
      args: {
        key: 'sample-development',
        businessName: 'Sample',
        environmentName: 'Development',
      },
    });
  });

  it('builds a shell-free Convex invocation', () => {
    const invocation = buildConvexInvocation(
      parseCommand(['list', '--deployment', 'local']),
    );

    expect(invocation).toEqual({
      executable: process.execPath,
      args: [
        'node_modules/convex/bin/main.js',
        'run',
        'businessEnvironments:list',
        '{}',
        '--deployment',
        'local',
      ],
    });
  });

  it('previews and applies validated customer auth configuration', () => {
    const preview = parseCommand([
      'preview-customer-auth',
      '--deployment',
      'local',
      '--key',
      'sample-development',
      '--configuration-json',
      customerAuthConfiguration,
    ]);
    expect(preview).toMatchObject({
      name: 'preview-customer-auth',
      args: {
        key: 'sample-development',
        configuration: { version: 2, enabledProviders: ['google'] },
      },
    });
    expect(buildConvexInvocation(preview).args[2]).toBe(
      'customerOperations:previewCustomerConfiguration',
    );

    const configure = parseCommand([
      'configure-customer-auth',
      '--deployment',
      'local',
      '--key',
      'sample-development',
      '--expected-revision',
      '3',
      '--expected-account-policy-revision',
      '7',
      '--preflight-id',
      'preflight_0123456789abc',
      '--configuration-json',
      customerAuthConfiguration,
    ]);
    expect(configure).toMatchObject({
      name: 'configure-customer-auth',
      args: {
        expectedRevision: 3,
        expectedAccountPolicyStateRevision: 7,
        preflightId: 'preflight_0123456789abc',
      },
    });
    expect(buildConvexInvocation(configure).args[2]).toBe(
      'businessEnvironments:configureCustomerAuth',
    );
  });

  it('validates the guided one-workspace and create-or-join scenarios', () => {
    const oneWorkspace = parseCommand([
      'preview-customer-auth',
      '--deployment',
      'local',
      '--key',
      'sample-development',
      '--configuration-json',
      customerAuthConfiguration,
    ]);
    const createOrJoinConfiguration = JSON.stringify({
      ...JSON.parse(customerAuthConfiguration),
      accountPolicy: {
        ...JSON.parse(customerAuthConfiguration).accountPolicy,
        createAccountOnFirstSignIn: false,
        userAccountCreationEnabled: true,
      },
    });
    const createOrJoin = parseCommand([
      'preview-customer-auth',
      '--deployment',
      'local',
      '--key',
      'sample-development',
      '--configuration-json',
      createOrJoinConfiguration,
    ]);

    expect(oneWorkspace).toMatchObject({
      args: {
        configuration: {
          accountPolicy: { createAccountOnFirstSignIn: true },
        },
      },
    });
    expect(createOrJoin).toMatchObject({
      args: {
        configuration: {
          accountPolicy: {
            createAccountOnFirstSignIn: false,
            userAccountCreationEnabled: true,
          },
        },
      },
    });
  });

  it('rejects invalid customer config and revisions before Convex', () => {
    expect(() =>
      parseCommand([
        'preview-customer-auth',
        '--deployment',
        'local',
        '--key',
        'sample-development',
        '--configuration-json',
        '{"enabledProviders":["github"]}',
      ]),
    ).toThrow(/valid customer auth configuration JSON/);
    expect(() =>
      parseCommand([
        'configure-customer-auth',
        '--deployment',
        'local',
        '--key',
        'sample-development',
        '--expected-revision=-1',
        '--configuration-json',
        customerAuthConfiguration,
      ]),
    ).toThrow(/non-negative integer/);
  });

  it('refuses cloud targets without explicit confirmation', () => {
    expect(() => parseCommand(['list', '--deployment', 'dev'])).toThrowError(
      CliError,
    );
    expect(() => parseCommand(['list', '--deployment', 'dev'])).toThrow(
      /--confirm-cloud/,
    );
  });

  it('accepts an explicitly confirmed cloud target', () => {
    expect(
      parseCommand([
        'inspect',
        '--deployment',
        'dev',
        '--confirm-cloud',
        '--key',
        'sample-development',
      ]),
    ).toMatchObject({
      name: 'inspect',
      deployment: 'dev',
      confirmCloud: true,
    });
  });

  it.each(['prod', 'production', 'team:project:prod'])(
    'requires exact confirmation for production writes to %s',
    (deployment) => {
      expect(() =>
        parseCommand([
          'create',
          '--deployment',
          deployment,
          '--confirm-cloud',
          '--key',
          'sample-production',
          '--business-name',
          'Sample',
          '--environment-name',
          'Production',
        ]),
      ).toThrow(/--confirm-production/);
      expect(
        parseCommand([
          'create',
          '--deployment',
          deployment,
          '--confirm-cloud',
          '--confirm-production',
          deployment,
          '--key',
          'sample-production',
          '--business-name',
          'Sample',
          '--environment-name',
          'Production',
        ]),
      ).toMatchObject({ deployment, confirmProduction: deployment });
    },
  );

  it('permits confirmed production reads without write confirmation', () => {
    expect(
      parseCommand([
        'list-customer-users',
        '--deployment',
        'prod',
        '--confirm-cloud',
        '--key',
        'sample-production',
      ]),
    ).toMatchObject({ name: 'list-customer-users', deployment: 'prod' });
  });

  it('never permits development fixture provisioning in production', () => {
    expect(() =>
      parseCommand([
        'provision-development-account',
        '--deployment',
        'prod',
        '--confirm-cloud',
        '--confirm-production',
        'prod',
        '--key',
        'sample-production',
        '--user-id',
        'user_0123456789abcdef',
      ]),
    ).toThrow(/cannot target production/);
  });

  it('builds bounded customer view invocations', () => {
    const command = parseCommand([
      'list-customer-security-events',
      '--deployment',
      'local',
      '--key',
      'sample-development',
      '--limit',
      '12',
      '--cursor',
      'next-page',
    ]);
    expect(command).toMatchObject({
      args: {
        environmentKey: 'sample-development',
        paginationOpts: { cursor: 'next-page', numItems: 12 },
      },
    });
    expect(buildConvexInvocation(command).args[2]).toBe(
      'customerOperations:listSecurityEvents',
    );
  });

  it('builds explicit lifecycle mutations and keeps dev fixtures distinct', () => {
    const managed = buildConvexInvocation(
      parseCommand([
        'provision-managed-account',
        '--deployment',
        'local',
        '--key',
        'sample-development',
        '--user-id',
        'user_0123456789abcdef',
      ]),
    );
    expect(managed.args[2]).toBe('customerOperations:provisionManagedAccount');
    expect(JSON.parse(managed.args[3] ?? '{}')).toMatchObject({
      environmentKey: 'sample-development',
      userPublicId: 'user_0123456789abcdef',
    });

    const fixture = buildConvexInvocation(
      parseCommand([
        'provision-development-account',
        '--deployment',
        'local',
        '--key',
        'sample-development',
        '--user-id',
        'user_0123456789abcdef',
      ]),
    );
    expect(fixture.args[2]).toBe(
      'customerOperations:provisionDevelopmentFixtureAccount',
    );
  });

  it('validates account policy and session identifiers before invocation', () => {
    const policy = buildConvexInvocation(
      parseCommand([
        'set-account-policy',
        '--deployment',
        'local',
        '--key',
        'sample-development',
        '--account-id',
        'account_0123456789abcdef',
        '--policy-overrides-json',
        '{"seatLimit":4,"memberInvitationsEnabled":true}',
      ]),
    );
    expect(policy.args[2]).toBe('customerOperations:updateAccountPolicy');

    const revoke = buildConvexInvocation(
      parseCommand([
        'revoke-customer-session',
        '--deployment',
        'local',
        '--key',
        'sample-development',
        '--session-id',
        'session_0123456789abcdef',
      ]),
    );
    expect(revoke.args[2]).toBe('customerOperations:revokeSession');
  });

  it('normalizes surrounding deployment whitespace', () => {
    expect(parseCommand(['list', '--deployment', ' local '])).toMatchObject({
      deployment: 'local',
      confirmCloud: false,
    });
  });

  it('requires an update field and never accepts a new key field', () => {
    expect(() =>
      parseCommand([
        'update',
        '--deployment',
        'local',
        '--key',
        'sample-development',
      ]),
    ).toThrow(/requires --business-name or --environment-name/);
    expect(() =>
      parseCommand([
        'update',
        '--deployment',
        'local',
        '--key',
        'sample-development',
        '--new-key',
        'other',
      ]),
    ).toThrow();
  });

  it('rejects invalid keys and labels before invoking Convex', () => {
    expect(() =>
      parseCommand([
        'create',
        '--deployment',
        'local',
        '--key',
        'Not Valid',
        '--business-name',
        'Sample',
        '--environment-name',
        'Development',
      ]),
    ).toThrow(/kebab-case/);
    expect(() =>
      parseCommand([
        'update',
        '--deployment',
        'local',
        '--key',
        'sample-development',
        '--environment-name',
        '   ',
      ]),
    ).toThrow(/between 1 and 80/);
  });

  it('runs through an injected shell-free invocation port', async () => {
    const invocations: unknown[] = [];
    const exitCode = await run(
      ['list', '--deployment', 'local'],
      async (invocation) => {
        invocations.push(invocation);
        return { stdout: '[]' };
      },
    );

    expect(exitCode).toBe(0);
    expect(invocations).toHaveLength(1);
  });

  it('maps backend failures without exposing raw stderr', () => {
    expect(
      classifyConvexFailure({
        stderr: 'ConvexError: CONFLICT private-value-must-not-be-printed',
      }),
    ).toEqual({
      exitCode: 3,
      message: 'Operation conflicts with current state.',
    });
  });
});
