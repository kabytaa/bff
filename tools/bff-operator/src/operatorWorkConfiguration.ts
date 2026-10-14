import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import {
  operatorWorkConfigurationSchema,
  operatorWorkSeedSchema,
} from '@bff/contracts';
import { CliError } from './cli';

const overridesSchema = z
  .object({
    enabled: z.boolean().optional(),
    presentation: z
      .object({
        helpUrl: z.string().optional(),
        contactEmail: z.string().optional(),
      })
      .strict()
      .optional(),
    support: z
      .object({
        fromEmail: z.string().optional(),
        fromName: z.string().optional(),
        receivingAddress: z.string().optional(),
        replyDomain: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
function option(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index < 0 ? undefined : argv[index + 1];
}
function without(argv: readonly string[], name: string): string[] {
  const index = argv.indexOf(name);
  return index < 0
    ? [...argv]
    : [...argv.slice(0, index), ...argv.slice(index + 2)];
}
export type ModuleLoader = (path: string) => Promise<Record<string, unknown>>;
export const loadOperatorModule: ModuleLoader = async (path) =>
  (await import(pathToFileURL(resolve(path)).href)) as Record<string, unknown>;

/** Compose Business-owned content with non-secret deployment mailbox overrides. */
export async function resolveOperatorWorkArgs(
  argv: readonly string[],
  load: ModuleLoader = loadOperatorModule,
): Promise<string[]> {
  const modulePath = option(argv, '--operator-defaults-module');
  const seedPath = option(argv, '--seed-module');
  const overrides = option(argv, '--configuration-overrides-json');
  const name = argv[0] === '--' ? argv[1] : argv[0];
  if (!modulePath && !seedPath && !overrides) return [...argv];
  try {
    if (modulePath || overrides) {
      if (
        !modulePath ||
        !['preview-operator-work', 'configure-operator-work'].includes(
          name ?? '',
        ) ||
        seedPath ||
        argv.includes('--configuration-json')
      )
        throw new Error('Invalid module options');
      const loaded = await load(modulePath);
      const defaults = operatorWorkConfigurationSchema.parse(
        loaded.default ?? loaded.operatorWorkDefaults,
      );
      const deployment = overridesSchema.parse(
        overrides ? JSON.parse(overrides) : {},
      );
      const configuration = operatorWorkConfigurationSchema.parse({
        ...defaults,
        ...deployment,
        presentation: { ...defaults.presentation, ...deployment.presentation },
        support: { ...defaults.support, ...deployment.support },
      });
      return [
        ...without(
          without(argv, '--operator-defaults-module'),
          '--configuration-overrides-json',
        ),
        '--configuration-json',
        JSON.stringify(configuration),
      ];
    }
    if (
      !seedPath ||
      name !== 'seed-operator-work' ||
      argv.includes('--seed-json')
    )
      throw new Error('Invalid seed options');
    const loaded = await load(seedPath);
    const seed = operatorWorkSeedSchema.parse(
      loaded.default ?? loaded.operatorWorkSeed,
    );
    return [
      ...without(argv, '--seed-module'),
      '--seed-json',
      JSON.stringify(seed),
    ];
  } catch {
    throw new CliError(
      'Unable to load validated Business Operator defaults/seed; deployment overrides may contain only enabled, presentation URLs/contact and mailbox settings',
    );
  }
}
