import { parseArgs } from 'node:util';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import type { Value } from 'convex/values';
import { z } from 'zod';

import { publicIdentifierSchema } from '@bff/contracts';

const commands = {
  'support-queue': ['query', 'operations:cases'],
  'support-case': ['query', 'operations:caseDetail'],
  'support-runs': ['query', 'operations:runs'],
  'support-save-draft': ['mutation', 'operations:saveDraft'],
  'support-preview-reply': ['mutation', 'operations:prepareReply'],
  'support-send-reply': ['mutation', 'operations:sendReply'],
  'support-note': ['mutation', 'operations:addNote'],
  'support-status': ['mutation', 'operations:setStatus'],
} as const;
type SupportCommandName = keyof typeof commands;
export interface SupportInvocation {
  url: string;
  kind: 'query' | 'mutation';
  functionName: string;
  args: Record<string, Value>;
}
export const SUPPORT_HELP = `Authenticated support commands:
  support-queue --url <convex-url> [--key <business-environment>] [--status <open|waiting_for_customer|resolved>] [--limit <1-50>] [--cursor <cursor>]
  support-case --url <convex-url> --key <key> --case-id <id>
  support-runs --url <convex-url> [--key <key>] [--limit <1-50>] [--cursor <cursor>]
  support-save-draft --url <convex-url> --key <key> --case-id <id> [--pending-id <current-id>] --text <text>
  support-preview-reply --url <convex-url> --key <key> --case-id <id> --pending-id <id> [--closing]
  support-send-reply --url <convex-url> --key <key> --case-id <id> --pending-id <exact-preview-id> [--closing] --confirm-send
  support-note --url <convex-url> --key <key> --case-id <id> --text <text>
  support-status --url <convex-url> --key <key> --case-id <id> --status <open|waiting_for_customer|resolved>
Set BFF_OPERATOR_TOKEN in the process environment using an admitted operator identity, never an admin/deploy key. Cloud commands require --confirm-cloud; production mutations require --confirm-production <exact-url>.`;

export function isSupportCommand(
  name: string | undefined,
): name is SupportCommandName {
  return Boolean(name && Object.hasOwn(commands, name));
}

/** Uses the public operator guard, not the administrative Convex CLI. */
export function parseSupportInvocation(argv: string[]): SupportInvocation {
  const name = argv[0];
  if (!isSupportCommand(name)) throw new Error('Unknown support command');
  const { values, positionals } = parseArgs({
    args: argv.slice(1),
    strict: true,
    allowPositionals: false,
    options: {
      url: { type: 'string' },
      key: { type: 'string' },
      'case-id': { type: 'string' },
      'pending-id': { type: 'string' },
      text: { type: 'string' },
      status: { type: 'string' },
      limit: { type: 'string' },
      cursor: { type: 'string' },
      closing: { type: 'boolean' },
      'confirm-send': { type: 'boolean' },
      'confirm-cloud': { type: 'boolean' },
      'confirm-production': { type: 'string' },
    },
  });
  if (positionals.length) throw new Error('Unexpected arguments');
  const target = new URL(values.url ?? '');
  const local = ['localhost', '127.0.0.1'].includes(target.hostname);
  if (
    (!local &&
      (target.protocol !== 'https:' ||
        !target.hostname.endsWith('.convex.cloud'))) ||
    (local && target.protocol !== 'http:') ||
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    target.pathname !== '/'
  )
    throw new Error('Use a canonical Convex deployment URL');
  if (!local && !values['confirm-cloud'])
    throw new Error('Cloud access needs --confirm-cloud');
  const [kind, functionName] = commands[name];
  const development =
    target.hostname === 'compassionate-buffalo-689.convex.cloud';
  if (
    kind === 'mutation' &&
    !local &&
    !development &&
    values['confirm-production'] !== target.origin
  )
    throw new Error(
      'Non-development mutations need --confirm-production <exact-url>',
    );
  const args: Record<string, Value> = {};
  if (values.key)
    args.environmentKey = z
      .string()
      .regex(/^[a-z][a-z0-9-]{2,63}$/u)
      .parse(values.key);
  if (name === 'support-queue' || name === 'support-runs') {
    const numItems = z
      .number()
      .int()
      .min(1)
      .max(50)
      .parse(Number(values.limit ?? '25'));
    args.paginationOpts = { numItems, cursor: values.cursor ?? null };
    if (name === 'support-queue' && values.status)
      args.status = z
        .enum(['open', 'waiting_for_customer', 'resolved'])
        .parse(values.status);
  } else {
    if (!args.environmentKey)
      throw new Error('An exact business environment is required');
    args.conversationId = publicIdentifierSchema.parse(values['case-id']);
    if (name === 'support-save-draft' || name === 'support-note') {
      args.text = z
        .string()
        .trim()
        .min(1)
        .max(name === 'support-note' ? 4000 : 12000)
        .parse(values.text);
      if (name === 'support-save-draft' && values['pending-id'])
        args.pendingId = publicIdentifierSchema.parse(values['pending-id']);
    }
    if (name === 'support-preview-reply' || name === 'support-send-reply') {
      args.pendingId = publicIdentifierSchema.parse(values['pending-id']);
      args.closing = values.closing ?? false;
      if (name === 'support-send-reply' && !values['confirm-send'])
        throw new Error('Exact Send requires --confirm-send');
    }
    if (name === 'support-status')
      args.status = z
        .enum(['open', 'waiting_for_customer', 'resolved'])
        .parse(values.status);
  }
  return { url: target.origin, kind, functionName, args };
}

export type SupportRunner = (
  invocation: SupportInvocation,
  token: string,
) => Promise<unknown>;
export const invokeSupport: SupportRunner = async (invocation, token) => {
  const client = new ConvexHttpClient(invocation.url);
  client.setAuth(token);
  return invocation.kind === 'query'
    ? await client.query(
        makeFunctionReference<'query'>(invocation.functionName),
        invocation.args,
      )
    : await client.mutation(
        makeFunctionReference<'mutation'>(invocation.functionName),
        invocation.args,
      );
};

export async function runSupportCommand(
  argv: string[],
  invoke: SupportRunner = invokeSupport,
): Promise<number> {
  try {
    const invocation = parseSupportInvocation(argv);
    const token = process.env.BFF_OPERATOR_TOKEN;
    if (!token || token.length < 32 || token.length > 16384)
      throw new Error('Operator token missing');
    console.info(JSON.stringify(await invoke(invocation, token), null, 2));
    return 0;
  } catch {
    console.error(
      'Support operation refused or failed. Check admitted identity, exact Business/draft IDs and confirmation flags; no credential or private provider error was printed.',
    );
    return 2;
  }
}
