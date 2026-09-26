import {
  BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER,
  BACKOFFICE_DEVELOPMENT_AUTOMATION_SUBJECT,
  BACKOFFICE_GOOGLE_ISSUER,
  BACKOFFICE_OPERATOR_EMAILS,
} from '@bff/static-config';
import type { GenericQueryCtx } from 'convex/server';

import type { DataModel } from '../_generated/dataModel';
import { fail } from './errors';

export interface OperatorIdentity {
  email?: string;
  emailVerified?: boolean;
  issuer?: string;
  subject?: string;
}

function normalizeEmail(value: string): string | null {
  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed !== value ||
    !/^[^@\s]+@[^@\s]+$/.test(trimmed)
  ) {
    return null;
  }
  return trimmed.toLowerCase();
}

export function normalizeOperatorEmails(values: readonly unknown[]): string[] {
  if (!values.every((item) => typeof item === 'string')) {
    return fail('CONFIGURATION_ERROR', 'Operator allowlist is malformed');
  }

  const emails = values.map((value) => normalizeEmail(value as string));
  if (emails.some((email) => email === null)) {
    return fail('CONFIGURATION_ERROR', 'Operator allowlist is malformed');
  }

  const normalizedEmails = emails as string[];
  if (new Set(normalizedEmails).size !== normalizedEmails.length) {
    return fail(
      'CONFIGURATION_ERROR',
      'Operator allowlist contains duplicates',
    );
  }

  return normalizedEmails;
}

export function isAllowedOperator(identity: OperatorIdentity): boolean {
  if (identity.issuer === BACKOFFICE_DEVELOPMENT_AUTOMATION_ISSUER) {
    return identity.subject === BACKOFFICE_DEVELOPMENT_AUTOMATION_SUBJECT;
  }

  if (
    identity.issuer !== BACKOFFICE_GOOGLE_ISSUER ||
    identity.emailVerified !== true ||
    typeof identity.email !== 'string'
  ) {
    return false;
  }

  const email = normalizeEmail(identity.email);
  if (email === null) {
    return false;
  }

  let allowlist: string[];
  try {
    allowlist = normalizeOperatorEmails(BACKOFFICE_OPERATOR_EMAILS);
  } catch {
    return false;
  }

  return allowlist.includes(email);
}

export async function requireOperator(ctx: GenericQueryCtx<DataModel>) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return fail('UNAUTHENTICATED', 'Authentication is required');
  }

  if (!isAllowedOperator(identity)) {
    return fail('FORBIDDEN', 'Operator access is required');
  }

  return identity;
}
