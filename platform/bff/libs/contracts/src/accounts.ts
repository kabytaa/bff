import { z } from 'zod';

import {
  accountRoleSchema,
  effectiveAccountPolicySchema,
} from './accountPolicy';
import { publicIdentifierSchema } from './auth';

export const businessUserViewSchema = z
  .object({
    id: publicIdentifierSchema,
    environmentKey: z.string().min(3).max(64),
    verifiedEmail: z.string().email(),
    displayName: z.string().min(1).max(120),
    pictureUrl: z.string().url().optional(),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

export type BusinessUserView = z.infer<typeof businessUserViewSchema>;

export const membershipViewSchema = z
  .object({
    id: publicIdentifierSchema,
    accountId: publicIdentifierSchema,
    userId: publicIdentifierSchema,
    role: accountRoleSchema,
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

export type MembershipView = z.infer<typeof membershipViewSchema>;

export const accountSummarySchema = z
  .object({
    id: publicIdentifierSchema,
    displayName: z.string().min(1).max(120).optional(),
    membership: membershipViewSchema,
    policy: effectiveAccountPolicySchema,
    activeMemberCount: z.number().int().nonnegative(),
    reservedInvitationCount: z.number().int().nonnegative(),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

export type AccountSummary = z.infer<typeof accountSummarySchema>;

export const currentCustomerViewSchema = z
  .object({
    user: businessUserViewSchema,
    accounts: z.array(accountSummarySchema),
  })
  .strict();

export type CurrentCustomerView = z.infer<typeof currentCustomerViewSchema>;

export const createAccountRequestSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export const createInvitationRequestSchema = z
  .object({
    accountId: publicIdentifierSchema,
    recipientEmail: z.string().trim().toLowerCase().email(),
  })
  .strict();

export const invitationStateSchema = z.enum([
  'pending',
  'accepted',
  'revoked',
  'expired',
]);

export const invitationViewSchema = z
  .object({
    id: publicIdentifierSchema,
    accountId: publicIdentifierSchema,
    recipientEmail: z.string().email(),
    state: invitationStateSchema,
    expiresAt: z.number().int().positive(),
    createdAt: z.number().int().nonnegative(),
  })
  .strict();

export const selectAccountRequestSchema = z
  .object({ accountId: publicIdentifierSchema })
  .strict();

export const ownershipTransferRequestSchema = z
  .object({
    accountId: publicIdentifierSchema,
    targetMembershipId: publicIdentifierSchema,
  })
  .strict();
