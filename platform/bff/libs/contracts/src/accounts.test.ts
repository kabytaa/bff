import { describe, expect, it } from 'vitest';

import {
  accountMemberViewSchema,
  createInvitationResponseSchema,
  invitationPreviewSchema,
  paginatedAccountMembersSchema,
  paginatedInvitationsSchema,
} from './accounts';

const membership = {
  id: 'membership_abcdefghijklmnop',
  accountId: 'account_abcdefghijklmnop',
  userId: 'user_abcdefghijklmnop',
  role: 'owner' as const,
  createdAt: 1,
  updatedAt: 1,
};

describe('account management contracts', () => {
  it('parses display-safe account members and bounded pages', () => {
    const member = accountMemberViewSchema.parse({
      membership,
      displayName: 'Ada Lovelace',
      verifiedEmail: 'ada@example.com',
    });

    expect(
      paginatedAccountMembersSchema.parse({
        page: [member],
        isDone: true,
        continueCursor: '',
      }),
    ).toMatchObject({ page: [{ displayName: 'Ada Lovelace' }] });
  });

  it('keeps inspection minimal and creation secrets out of list views', () => {
    expect(
      invitationPreviewSchema.parse({
        accountDisplayName: 'Studio',
        state: 'pending',
        expiresAt: 10,
      }),
    ).toEqual({
      accountDisplayName: 'Studio',
      state: 'pending',
      expiresAt: 10,
    });

    const invitation = {
      id: 'invitation_abcdefghijklmno',
      accountId: 'account_abcdefghijklmnop',
      recipientEmail: 'grace@example.com',
      state: 'pending' as const,
      expiresAt: 10,
      createdAt: 1,
    };
    expect(
      paginatedInvitationsSchema.parse({
        page: [invitation],
        isDone: true,
        continueCursor: '',
      }),
    ).not.toHaveProperty('invitationToken');
    expect(
      createInvitationResponseSchema.parse({
        invitation,
        invitationToken: 'a'.repeat(43),
      }).invitationToken,
    ).toHaveLength(43);
  });
});
