import { describe, expect, it } from 'vitest';

import {
  buildConvexInvocation,
  classifyConvexFailure,
  CliError,
  parseCommand,
} from './cli';
import { run } from './main';

const customerAuthConfiguration = JSON.stringify({
  version: 1,
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
        configuration: { version: 1, enabledProviders: ['google'] },
      },
    });
    expect(buildConvexInvocation(preview).args[2]).toBe(
      'businessEnvironments:previewCustomerAuth',
    );

    const configure = parseCommand([
      'configure-customer-auth',
      '--deployment',
      'local',
      '--key',
      'sample-development',
      '--expected-revision',
      '3',
      '--configuration-json',
      customerAuthConfiguration,
    ]);
    expect(configure).toMatchObject({
      name: 'configure-customer-auth',
      args: { expectedRevision: 3 },
    });
    expect(buildConvexInvocation(configure).args[2]).toBe(
      'businessEnvironments:configureCustomerAuth',
    );
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
    'refuses the production deployment reference %s',
    (deployment) => {
      expect(() =>
        parseCommand(['list', '--deployment', deployment, '--confirm-cloud']),
      ).toThrow(/reviewed production delivery workflow/);
    },
  );

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
