import { z } from 'zod';

export const SESSION_IDLE_MIN_SECONDS = 15 * 60;
export const SESSION_IDLE_MAX_SECONDS = 30 * 24 * 60 * 60;
export const SESSION_ABSOLUTE_MIN_SECONDS = 60 * 60;
export const SESSION_ABSOLUTE_MAX_SECONDS = 180 * 24 * 60 * 60;
export const SESSION_IDLE_DEFAULT_SECONDS = 7 * 24 * 60 * 60;
export const SESSION_ABSOLUTE_DEFAULT_SECONDS = 30 * 24 * 60 * 60;
export const CONTEXT_TOKEN_TTL_SECONDS = 10 * 60;
export const HANDOFF_CODE_TTL_SECONDS = 60;
export const AUTOMATION_GRANT_TTL_SECONDS = 2 * 60;
export const OWNERSHIP_TRANSFER_PROOF_TTL_SECONDS = 5 * 60;

export const accountRoleSchema = z.enum(['owner', 'admin', 'member']);
export type AccountRole = z.infer<typeof accountRoleSchema>;

export const accountPermissionSchema = z.enum([
  'account:read',
  'account:update',
  'members:read',
  'members:manage',
  'invitations:manage',
  'ownership:transfer',
]);
export type AccountPermission = z.infer<typeof accountPermissionSchema>;

const ROLE_PERMISSIONS = {
  owner: [
    'account:read',
    'account:update',
    'members:read',
    'members:manage',
    'invitations:manage',
    'ownership:transfer',
  ],
  admin: [
    'account:read',
    'members:read',
    'members:manage',
    'invitations:manage',
  ],
  member: ['account:read', 'members:read'],
} as const satisfies Record<AccountRole, readonly AccountPermission[]>;

export function permissionsForRole(
  role: AccountRole,
): readonly AccountPermission[] {
  return ROLE_PERMISSIONS[role];
}

export const sessionPolicySchema = z
  .object({
    idleSeconds: z
      .number()
      .int()
      .min(SESSION_IDLE_MIN_SECONDS)
      .max(SESSION_IDLE_MAX_SECONDS),
    absoluteSeconds: z
      .number()
      .int()
      .min(SESSION_ABSOLUTE_MIN_SECONDS)
      .max(SESSION_ABSOLUTE_MAX_SECONDS),
  })
  .strict()
  .refine((policy) => policy.idleSeconds <= policy.absoluteSeconds, {
    message: 'idleSeconds must not exceed absoluteSeconds',
    path: ['idleSeconds'],
  });

export type SessionPolicy = z.infer<typeof sessionPolicySchema>;

export const businessAccountPolicySchema = z
  .object({
    createAccountOnFirstSignIn: z.boolean(),
    userAccountCreationEnabled: z.boolean(),
    maxAccountMembershipsPerUser: z.number().int().positive(),
    maxOwnedAccountsPerUser: z.number().int().positive(),
    ownershipTransferEnabled: z.boolean(),
  })
  .strict()
  .refine(
    (policy) =>
      policy.maxOwnedAccountsPerUser <=
      policy.maxAccountMembershipsPerUser,
    {
      message:
        'maxOwnedAccountsPerUser must not exceed maxAccountMembershipsPerUser',
      path: ['maxOwnedAccountsPerUser'],
    },
  );

export type BusinessAccountPolicy = z.infer<
  typeof businessAccountPolicySchema
>;

export const accountPolicyValuesSchema = z
  .object({
    seatLimit: z.number().int().positive(),
    adminRoleEnabled: z.boolean(),
    memberInvitationsEnabled: z.boolean(),
  })
  .strict();

export type AccountPolicyValues = z.infer<typeof accountPolicyValuesSchema>;

export const policySourceSchema = z.enum([
  'business_default',
  'account_override',
]);
export type PolicySource = z.infer<typeof policySourceSchema>;

export const effectiveAccountPolicySchema = z
  .object({
    values: accountPolicyValuesSchema,
    sources: z
      .object({
        seatLimit: policySourceSchema,
        adminRoleEnabled: policySourceSchema,
        memberInvitationsEnabled: policySourceSchema,
      })
      .strict(),
  })
  .strict();

export type EffectiveAccountPolicy = z.infer<
  typeof effectiveAccountPolicySchema
>;

export const DEFAULT_SESSION_POLICY: SessionPolicy = {
  idleSeconds: SESSION_IDLE_DEFAULT_SECONDS,
  absoluteSeconds: SESSION_ABSOLUTE_DEFAULT_SECONDS,
};

export const DEFAULT_BUSINESS_ACCOUNT_POLICY: BusinessAccountPolicy = {
  createAccountOnFirstSignIn: true,
  userAccountCreationEnabled: false,
  maxAccountMembershipsPerUser: 1,
  maxOwnedAccountsPerUser: 1,
  ownershipTransferEnabled: false,
};

export const DEFAULT_ACCOUNT_POLICY: AccountPolicyValues = {
  seatLimit: 1,
  adminRoleEnabled: false,
  memberInvitationsEnabled: false,
};
