import { describe, expect, it } from 'vitest';

import {
  buildConvexInvocation,
  classifyConvexFailure,
  CliError,
  parseCommand,
} from './cli';
import { run } from './main';

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
      ).toThrow(/Production targets are not supported/);
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
      message: 'Business environment already exists.',
    });
  });
});
