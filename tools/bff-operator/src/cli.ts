import { parseArgs } from 'node:util';

import {
  customerAuthConfigurationSchema,
  type CustomerAuthConfiguration,
} from '@bff/contracts';

export type OperatorCommand =
  | {
      name: 'create';
      deployment: string;
      confirmCloud: boolean;
      args: {
        key: string;
        businessName: string;
        environmentName: string;
      };
    }
  | {
      name: 'inspect';
      deployment: string;
      confirmCloud: boolean;
      args: { key: string };
    }
  | {
      name: 'list';
      deployment: string;
      confirmCloud: boolean;
      args: Record<string, never>;
    }
  | {
      name: 'update';
      deployment: string;
      confirmCloud: boolean;
      args: {
        key: string;
        businessName?: string;
        environmentName?: string;
      };
    }
  | {
      name: 'preview-customer-auth';
      deployment: string;
      confirmCloud: boolean;
      args: {
        key: string;
        configuration: CustomerAuthConfiguration;
      };
    }
  | {
      name: 'configure-customer-auth';
      deployment: string;
      confirmCloud: boolean;
      args: {
        key: string;
        expectedRevision: number;
        configuration: CustomerAuthConfiguration;
      };
    };

export class CliError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

export const HELP = `Usage:
  pnpm bff:environment -- create --deployment <local|reference> --key <key> --business-name <name> --environment-name <name> [--confirm-cloud]
  pnpm bff:environment -- inspect --deployment <local|reference> --key <key> [--confirm-cloud]
  pnpm bff:environment -- list --deployment <local|reference> [--confirm-cloud]
  pnpm bff:environment -- update --deployment <local|reference> --key <key> [--business-name <name>] [--environment-name <name>] [--confirm-cloud]
  pnpm bff:environment -- preview-customer-auth --deployment <local|reference> --key <key> --configuration-json <json> [--confirm-cloud]
  pnpm bff:environment -- configure-customer-auth --deployment <local|reference> --key <key> --expected-revision <revision> --configuration-json <json> [--confirm-cloud]

Customer auth must be previewed before apply. Configuration JSON contains public registration and policy values, never credentials.
Cloud targets are refused unless --confirm-cloud is present. Production has no shortcut.`;

const commandNames = [
  'create',
  'inspect',
  'list',
  'update',
  'preview-customer-auth',
  'configure-customer-auth',
] as const;
type CommandName = (typeof commandNames)[number];
const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isCommandName(value: string): value is CommandName {
  return commandNames.some((candidate) => candidate === value);
}

function required(value: string | undefined, flag: string): string {
  if (!value?.trim()) {
    throw new CliError(`${flag} is required`);
  }
  return value;
}

function validKey(value: string): string {
  const key = value.trim();
  if (key.length < 3 || key.length > 64 || !KEY_PATTERN.test(key)) {
    throw new CliError('--key must be 3-64 lowercase kebab-case characters');
  }
  return key;
}

function validLabel(value: string, flag: string): string {
  const label = value.trim();
  if (label.length === 0 || label.length > 80) {
    throw new CliError(`${flag} must be between 1 and 80 characters`);
  }
  return label;
}

function validRevision(value: string | undefined): number {
  const parsed = Number(required(value, '--expected-revision'));
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new CliError('--expected-revision must be a non-negative integer');
  }
  return parsed;
}

function validCustomerAuthConfiguration(
  value: string | undefined,
): CustomerAuthConfiguration {
  try {
    return customerAuthConfigurationSchema.parse(
      JSON.parse(required(value, '--configuration-json')),
    );
  } catch {
    throw new CliError(
      '--configuration-json must be valid customer auth configuration JSON',
    );
  }
}

function isProductionDeployment(deployment: string): boolean {
  const reference = deployment.toLowerCase().split(':').at(-1);
  return reference === 'prod' || reference === 'production';
}

export function parseCommand(argv: string[]): OperatorCommand {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv;
  const [name, ...rest] = normalizedArgv;
  if (name === undefined || name === '--help' || name === '-h') {
    throw new CliError(HELP);
  }
  if (!isCommandName(name)) {
    throw new CliError(`Unknown command: ${name}\n\n${HELP}`);
  }

  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    strict: true,
    options: {
      'business-name': { type: 'string' },
      'confirm-cloud': { type: 'boolean', default: false },
      'configuration-json': { type: 'string' },
      deployment: { type: 'string' },
      'environment-name': { type: 'string' },
      'expected-revision': { type: 'string' },
      key: { type: 'string' },
    },
  });

  if (positionals.length > 0) {
    throw new CliError(`Unexpected positional argument: ${positionals[0]}`);
  }

  const deployment = required(values.deployment, '--deployment').trim();
  const confirmCloud = values['confirm-cloud'] ?? false;
  if (isProductionDeployment(deployment)) {
    throw new CliError(
      'Production targets must use the reviewed production delivery workflow',
    );
  }
  if (deployment !== 'local' && !confirmCloud) {
    throw new CliError(
      `Cloud target ${deployment} requires the explicit --confirm-cloud flag`,
    );
  }

  if (name === 'list') {
    return { name, deployment, confirmCloud, args: {} };
  }

  const key = validKey(required(values.key, '--key'));
  if (name === 'inspect') {
    return { name, deployment, confirmCloud, args: { key } };
  }

  if (name === 'preview-customer-auth') {
    return {
      name,
      deployment,
      confirmCloud,
      args: {
        key,
        configuration: validCustomerAuthConfiguration(
          values['configuration-json'],
        ),
      },
    };
  }

  if (name === 'configure-customer-auth') {
    return {
      name,
      deployment,
      confirmCloud,
      args: {
        key,
        expectedRevision: validRevision(values['expected-revision']),
        configuration: validCustomerAuthConfiguration(
          values['configuration-json'],
        ),
      },
    };
  }

  if (name === 'create') {
    return {
      name,
      deployment,
      confirmCloud,
      args: {
        key,
        businessName: validLabel(
          required(values['business-name'], '--business-name'),
          '--business-name',
        ),
        environmentName: validLabel(
          required(values['environment-name'], '--environment-name'),
          '--environment-name',
        ),
      },
    };
  }

  const businessName = values['business-name'];
  const environmentName = values['environment-name'];
  if (businessName === undefined && environmentName === undefined) {
    throw new CliError('update requires --business-name or --environment-name');
  }

  return {
    name,
    deployment,
    confirmCloud,
    args: {
      key,
      ...(businessName === undefined
        ? {}
        : { businessName: validLabel(businessName, '--business-name') }),
      ...(environmentName === undefined
        ? {}
        : {
            environmentName: validLabel(environmentName, '--environment-name'),
          }),
    },
  };
}

export interface ConvexInvocation {
  executable: string;
  args: string[];
}

export interface CliFailure {
  exitCode: number;
  message: string;
}

export function classifyConvexFailure(error: unknown): CliFailure {
  const stderr =
    typeof error === 'object' && error !== null && 'stderr' in error
      ? String(error.stderr)
      : '';
  const code = stderr.match(
    /\b(CONFLICT|NOT_FOUND|VALIDATION_ERROR|UNAUTHENTICATED|FORBIDDEN)\b/,
  )?.[1];

  switch (code) {
    case 'VALIDATION_ERROR':
      return {
        exitCode: 2,
        message: 'Backend validation rejected the request.',
      };
    case 'CONFLICT':
      return {
        exitCode: 3,
        message: 'Operation conflicts with current state.',
      };
    case 'NOT_FOUND':
      return { exitCode: 4, message: 'Business environment was not found.' };
    case 'UNAUTHENTICATED':
    case 'FORBIDDEN':
      return { exitCode: 5, message: 'Deployment access was denied.' };
    default:
      return {
        exitCode: 1,
        message:
          'Convex command failed. No credential or raw environment output was printed; inspect the selected deployment logs for details.',
      };
  }
}

export function buildConvexInvocation(
  command: OperatorCommand,
): ConvexInvocation {
  const functionName =
    command.name === 'preview-customer-auth'
      ? 'previewCustomerAuth'
      : command.name === 'configure-customer-auth'
        ? 'configureCustomerAuth'
        : command.name;
  return {
    executable: process.execPath,
    args: [
      'node_modules/convex/bin/main.js',
      'run',
      `businessEnvironments:${functionName}`,
      JSON.stringify(command.args),
      '--deployment',
      command.deployment,
    ],
  };
}
