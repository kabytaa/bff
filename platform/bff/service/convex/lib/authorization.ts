import type { GenericQueryCtx } from 'convex/server';

import type { DataModel } from '../_generated/dataModel';
import { fail } from './errors';

export interface OperatorIdentity {
  issuer: string;
  subject: string;
}

function isOperatorIdentity(value: unknown): value is OperatorIdentity {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const fields = Object.keys(candidate).sort();
  return (
    fields.length === 2 &&
    fields[0] === 'issuer' &&
    fields[1] === 'subject' &&
    typeof candidate.issuer === 'string' &&
    candidate.issuer.trim() === candidate.issuer &&
    candidate.issuer.length > 0 &&
    typeof candidate.subject === 'string' &&
    candidate.subject.trim() === candidate.subject &&
    candidate.subject.length > 0
  );
}

export function parseOperatorIdentities(
  raw: string | undefined,
): OperatorIdentity[] {
  if (!raw?.trim()) {
    return [];
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return fail('CONFIGURATION_ERROR', 'Operator allowlist is malformed');
  }

  if (!Array.isArray(value) || !value.every(isOperatorIdentity)) {
    return fail('CONFIGURATION_ERROR', 'Operator allowlist is malformed');
  }

  const keys = value.map(({ issuer, subject }) => `${issuer}\u0000${subject}`);
  if (new Set(keys).size !== keys.length) {
    return fail(
      'CONFIGURATION_ERROR',
      'Operator allowlist contains duplicates',
    );
  }

  return value;
}

export function isAllowedOperator(identity: OperatorIdentity): boolean {
  let allowlist: OperatorIdentity[];
  try {
    allowlist = parseOperatorIdentities(process.env.BFF_OPERATOR_IDENTITIES);
  } catch {
    return false;
  }

  return allowlist.some(
    (allowed) =>
      allowed.issuer === identity.issuer &&
      allowed.subject === identity.subject,
  );
}

export async function requireOperator(ctx: GenericQueryCtx<DataModel>) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return fail('UNAUTHENTICATED', 'Authentication is required');
  }

  if (
    !isAllowedOperator({ issuer: identity.issuer, subject: identity.subject })
  ) {
    return fail('FORBIDDEN', 'Operator access is required');
  }

  return identity;
}
