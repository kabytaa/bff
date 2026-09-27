import { parseArgs } from 'node:util';
import { randomBytes } from 'node:crypto';

import {
  accountPolicyOverridesSchema,
  customerAuthConfigurationSchema,
  publicIdentifierSchema,
  type AccountPolicyOverrides,
  type CustomerAuthConfiguration,
} from '@bff/contracts';

interface CommandTarget {
  deployment: string;
  confirmCloud: boolean;
  confirmProduction?: string;
}

export type OperatorCommand =
  | (CommandTarget & {
      name: 'create';
      args: {
        key: string;
        businessName: string;
        environmentName: string;
      };
    })
  | (CommandTarget & {
      name: 'inspect';
      args: { key: string };
    })
  | (CommandTarget & {
      name: 'list';
      args: Record<string, never>;
    })
  | (CommandTarget & {
      name: 'update';
      args: {
        key: string;
        businessName?: string;
        environmentName?: string;
      };
    })
  | (CommandTarget & {
      name: 'preview-customer-auth';
      args: {
        key: string;
        configuration: CustomerAuthConfiguration;
      };
    })
  | (CommandTarget & {
      name: 'configure-customer-auth';
      args: {
        key: string;
        expectedRevision: number;
        expectedAccountPolicyStateRevision: number;
        preflightId: string;
        configuration: CustomerAuthConfiguration;
      };
    })
  | (CommandTarget & {
      name:
        | 'list-customer-users'
        | 'list-customer-accounts'
        | 'list-customer-memberships'
        | 'list-customer-sessions'
        | 'list-customer-security-events';
      args: {
        environmentKey: string;
        paginationOpts: { cursor: string | null; numItems: number };
      };
    })
  | (CommandTarget & {
      name: 'provision-managed-account' | 'provision-development-account';
      args: {
        environmentKey: string;
        userPublicId: string;
        displayName?: string;
      };
    })
  | (CommandTarget & {
      name: 'set-account-policy';
      args: {
        environmentKey: string;
        accountPublicId: string;
        policyOverrides: AccountPolicyOverrides;
      };
    })
  | (CommandTarget & {
      name: 'revoke-customer-session';
      args: {
        environmentKey: string;
        sessionPublicId: string;
      };
    });

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
  pnpm bff:environment -- preview-customer-auth --deployment <local|reference> --key <key> (--configuration-json <json> | --defaults-module <path> --environment-json <json>) [--confirm-cloud]
  pnpm bff:environment -- configure-customer-auth --deployment <local|reference> --key <key> --expected-revision <revision> --expected-account-policy-revision <revision> --preflight-id <id> (--configuration-json <json> | --defaults-module <path> --environment-json <json>) [--confirm-cloud]
  pnpm bff:environment -- list-customer-<users|accounts|memberships|sessions|security-events> --deployment <local|reference> --key <key> [--limit <1-50>] [--cursor <cursor>] [--confirm-cloud]
  pnpm bff:environment -- provision-managed-account --deployment <local|reference> --key <key> --user-id <id> [--display-name <name>] [--confirm-cloud]
  pnpm bff:environment -- provision-development-account --deployment <local|reference> --key <key> --user-id <id> [--display-name <name>] [--confirm-cloud]
  pnpm bff:environment -- set-account-policy --deployment <local|reference> --key <key> --account-id <id> --policy-overrides-json <json> [--confirm-cloud]
  pnpm bff:environment -- revoke-customer-session --deployment <local|reference> --key <key> --session-id <id> [--confirm-cloud]

Customer auth must be previewed before apply. Code-owned defaults plus environment JSON are composed into the same validated effective snapshot. Neither form contains credentials.
Cloud targets are refused unless --confirm-cloud is present. Production writes additionally require --confirm-production with the exact deployment reference.`;

const commandNames = [
  'create',
  'inspect',
  'list',
  'update',
  'preview-customer-auth',
  'configure-customer-auth',
  'list-customer-users',
  'list-customer-accounts',
  'list-customer-memberships',
  'list-customer-sessions',
  'list-customer-security-events',
  'provision-managed-account',
  'provision-development-account',
  'set-account-policy',
  'revoke-customer-session',
] as const;
type CommandName = (typeof commandNames)[number];
type CustomerListCommandName = Extract<CommandName, `list-customer-${string}`>;
const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isCommandName(value: string): value is CommandName {
  return commandNames.some((candidate) => candidate === value);
}

function isCustomerListCommand(
  value: CommandName,
): value is CustomerListCommandName {
  return value.startsWith('list-customer-');
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

function validRevision(value: string | undefined, flag: string): number {
  const parsed = Number(required(value, flag));
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new CliError(`${flag} must be a non-negative integer`);
  }
  return parsed;
}

function validPublicIdentifier(
  value: string | undefined,
  flag: string,
): string {
  const parsed = publicIdentifierSchema.safeParse(required(value, flag).trim());
  if (!parsed.success) {
    throw new CliError(`${flag} must be a valid public identifier`);
  }
  return parsed.data;
}

function validPolicyOverrides(
  value: string | undefined,
): AccountPolicyOverrides {
  try {
    return accountPolicyOverridesSchema.parse(
      JSON.parse(required(value, '--policy-overrides-json')),
    );
  } catch {
    throw new CliError(
      '--policy-overrides-json must be valid account policy override JSON',
    );
  }
}

function validPageSize(value: string | undefined): number {
  if (value === undefined) return 25;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 50) {
    throw new CliError('--limit must be an integer between 1 and 50');
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

const productionWriteCommands = new Set<CommandName>([
  'create',
  'update',
  'preview-customer-auth',
  'configure-customer-auth',
  'provision-managed-account',
  'provision-development-account',
  'set-account-policy',
  'revoke-customer-session',
]);

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
      'account-id': { type: 'string' },
      'confirm-cloud': { type: 'boolean', default: false },
      'confirm-production': { type: 'string' },
      'configuration-json': { type: 'string' },
      cursor: { type: 'string' },
      deployment: { type: 'string' },
      'display-name': { type: 'string' },
      'environment-name': { type: 'string' },
      'expected-account-policy-revision': { type: 'string' },
      'expected-revision': { type: 'string' },
      key: { type: 'string' },
      limit: { type: 'string' },
      'policy-overrides-json': { type: 'string' },
      'preflight-id': { type: 'string' },
      'session-id': { type: 'string' },
      'user-id': { type: 'string' },
    },
  });

  if (positionals.length > 0) {
    throw new CliError(`Unexpected positional argument: ${positionals[0]}`);
  }

  const deployment = required(values.deployment, '--deployment').trim();
  const confirmCloud = values['confirm-cloud'] ?? false;
  if (deployment !== 'local' && !confirmCloud) {
    throw new CliError(
      `Cloud target ${deployment} requires the explicit --confirm-cloud flag`,
    );
  }
  const confirmProduction = values['confirm-production']?.trim();
  if (
    isProductionDeployment(deployment) &&
    name === 'provision-development-account'
  ) {
    throw new CliError(
      'Development fixture provisioning cannot target production',
    );
  }
  if (
    isProductionDeployment(deployment) &&
    productionWriteCommands.has(name) &&
    confirmProduction !== deployment
  ) {
    throw new CliError(
      `Production write requires --confirm-production ${deployment}`,
    );
  }
  const target = {
    deployment,
    confirmCloud,
    ...(confirmProduction === undefined ? {} : { confirmProduction }),
  };

  if (name === 'list') {
    return { name, ...target, args: {} };
  }

  const key = validKey(required(values.key, '--key'));
  if (name === 'inspect') {
    return { name, ...target, args: { key } };
  }

  if (isCustomerListCommand(name)) {
    return {
      name,
      ...target,
      args: {
        environmentKey: key,
        paginationOpts: {
          cursor: values.cursor?.trim() || null,
          numItems: validPageSize(values.limit),
        },
      },
    };
  }

  if (name === 'preview-customer-auth') {
    return {
      name,
      ...target,
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
      ...target,
      args: {
        key,
        expectedRevision: validRevision(
          values['expected-revision'],
          '--expected-revision',
        ),
        expectedAccountPolicyStateRevision: validRevision(
          values['expected-account-policy-revision'],
          '--expected-account-policy-revision',
        ),
        preflightId: validPublicIdentifier(
          values['preflight-id'],
          '--preflight-id',
        ),
        configuration: validCustomerAuthConfiguration(
          values['configuration-json'],
        ),
      },
    };
  }

  if (
    name === 'provision-managed-account' ||
    name === 'provision-development-account'
  ) {
    const displayName = values['display-name'];
    return {
      name,
      ...target,
      args: {
        environmentKey: key,
        userPublicId: validPublicIdentifier(values['user-id'], '--user-id'),
        ...(displayName === undefined
          ? {}
          : { displayName: validLabel(displayName, '--display-name') }),
      },
    };
  }

  if (name === 'set-account-policy') {
    return {
      name,
      ...target,
      args: {
        environmentKey: key,
        accountPublicId: validPublicIdentifier(
          values['account-id'],
          '--account-id',
        ),
        policyOverrides: validPolicyOverrides(values['policy-overrides-json']),
      },
    };
  }

  if (name === 'revoke-customer-session') {
    return {
      name,
      ...target,
      args: {
        environmentKey: key,
        sessionPublicId: validPublicIdentifier(
          values['session-id'],
          '--session-id',
        ),
      },
    };
  }

  if (name === 'create') {
    return {
      name,
      ...target,
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
    ...target,
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
  const identifier = (prefix: string) =>
    `${prefix}_${randomBytes(18).toString('base64url')}`;
  let functionReference: string;
  let args: Record<string, unknown> = command.args;
  switch (command.name) {
    case 'preview-customer-auth':
      functionReference = 'customerOperations:previewCustomerConfiguration';
      break;
    case 'configure-customer-auth':
      functionReference = 'businessEnvironments:configureCustomerAuth';
      break;
    case 'list-customer-users':
      functionReference = 'customerOperations:listUsers';
      break;
    case 'list-customer-accounts':
      functionReference = 'customerOperations:listAccounts';
      break;
    case 'list-customer-memberships':
      functionReference = 'customerOperations:listMemberships';
      break;
    case 'list-customer-sessions':
      functionReference = 'customerOperations:listSessions';
      break;
    case 'list-customer-security-events':
      functionReference = 'customerOperations:listSecurityEvents';
      break;
    case 'provision-managed-account':
    case 'provision-development-account':
      functionReference =
        command.name === 'provision-managed-account'
          ? 'customerOperations:provisionManagedAccount'
          : 'customerOperations:provisionDevelopmentFixtureAccount';
      args = {
        ...command.args,
        accountPublicId: identifier('account'),
        membershipPublicId: identifier('membership'),
        now: Date.now(),
      };
      break;
    case 'set-account-policy':
      functionReference = 'customerOperations:updateAccountPolicy';
      args = { ...command.args, now: Date.now() };
      break;
    case 'revoke-customer-session':
      functionReference = 'customerOperations:revokeSession';
      args = { ...command.args, now: Date.now() };
      break;
    default:
      functionReference = `businessEnvironments:${command.name}`;
  }
  return {
    executable: process.execPath,
    args: [
      'node_modules/convex/bin/main.js',
      'run',
      functionReference,
      JSON.stringify(args),
      '--deployment',
      command.deployment,
    ],
  };
}
