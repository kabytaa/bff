import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

import {
  businessEnvironmentAuthConfigSchema,
  composeCustomerAuthConfiguration,
  customerAuthDefaultsSchema,
} from '@bff/contracts';

import { CliError } from './cli';

function optionValue(
  argv: readonly string[],
  name: string,
): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function removeOption(argv: readonly string[], name: string): string[] {
  const index = argv.indexOf(name);
  if (index === -1) return [...argv];
  return [...argv.slice(0, index), ...argv.slice(index + 2)];
}

export async function resolveCustomerAuthConfigurationArgs(
  argv: readonly string[],
  loadModule: (path: string) => Promise<{
    default?: unknown;
    customerAuthDefaults?: unknown;
  }> = async (path) =>
    (await import(pathToFileURL(resolve(path)).href)) as {
      default?: unknown;
      customerAuthDefaults?: unknown;
    },
): Promise<string[]> {
  const defaultsModule = optionValue(argv, '--defaults-module');
  const environmentJson = optionValue(argv, '--environment-json');
  if (!defaultsModule && !environmentJson) return [...argv];
  if (!defaultsModule || !environmentJson) {
    throw new CliError(
      '--defaults-module and --environment-json must be provided together',
    );
  }
  if (argv.includes('--configuration-json')) {
    throw new CliError(
      '--configuration-json cannot be combined with code-owned defaults',
    );
  }

  try {
    const loaded = await loadModule(defaultsModule);
    const defaults = customerAuthDefaultsSchema.parse(
      loaded.default ?? loaded.customerAuthDefaults,
    );
    const environment = businessEnvironmentAuthConfigSchema.parse(
      JSON.parse(environmentJson),
    );
    let resolved = removeOption(argv, '--defaults-module');
    resolved = removeOption(resolved, '--environment-json');
    return [
      ...resolved,
      '--configuration-json',
      JSON.stringify(composeCustomerAuthConfiguration(defaults, environment)),
    ];
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(
      'Unable to load or validate the customer auth defaults module and environment JSON',
    );
  }
}
