import type { AccountMemberView, InvitationView } from '@tofler/bff-auth/core';
import { useBffAuth } from '@tofler/bff-auth/react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

import type { CurrentProductAccess } from '../backend';
import { useTableCardsBackend } from '../use-tablecards-backend';
import { safeProductMessage } from '../product-error';

function safeMessage(error: unknown) {
  return safeProductMessage(
    error,
    'The team action could not be completed. Please try again.',
  );
}

export function Component() {
  const { client, state, snapshot } = useBffAuth();
  const backend = useTableCardsBackend();
  const [access, setAccess] = useState<CurrentProductAccess | null>(null);
  const [members, setMembers] = useState<readonly AccountMemberView[]>([]);
  const [invitations, setInvitations] = useState<readonly InvitationView[]>([]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeKind, setNoticeKind] = useState<'info' | 'error'>('info');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const account =
    state.status === 'authenticated'
      ? state.customer.accounts.find(
          (candidate) => candidate.id === state.accountId,
        )
      : undefined;
  const ownRole = account?.membership.role ?? 'member';
  const ownMembershipId = account?.membership.id;
  const canInvite =
    ownRole !== 'member' && account?.policy.values.memberInvitationsEnabled;
  const seatsFull =
    members.length + invitations.length >=
    (account?.policy.values.seatLimit ?? 1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextAccess = await backend.getCurrentAccess();
      setAccess(nextAccess);
      if (!nextAccess.teamAccessEnabled) {
        setMembers([]);
        setInvitations([]);
        return;
      }
      const [memberPage, invitationPage] = await Promise.all([
        client.listAccountMembers({ limit: 50 }),
        ownRole === 'member'
          ? Promise.resolve({ page: [] as InvitationView[] })
          : client.listAccountInvitations({ limit: 50 }),
      ]);
      setMembers(memberPage.page);
      setInvitations(invitationPage.page);
    } finally {
      setLoading(false);
    }
  }, [backend, client, ownRole]);

  useEffect(() => {
    void load().catch((error: unknown) => {
      setNotice(safeMessage(error));
      setNoticeKind('error');
    });
  }, [load, snapshot.generation]);

  const mutate = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setNotice(null);
    setNoticeKind('info');
    try {
      await action();
      await load();
      setNotice(success);
    } catch (error) {
      setNotice(safeMessage(error));
      setNoticeKind('error');
    } finally {
      setBusy(false);
    }
  };

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setNoticeKind('info');
    try {
      const created = await client.createInvitation(recipientEmail);
      setInvitationLink(
        `${window.location.origin}/invite/${encodeURIComponent(created.invitationToken)}`,
      );
      setRecipientEmail('');
      await load();
      setNotice(
        'Invitation created. Copy the link now; the secret is shown only here.',
      );
    } catch (error) {
      setNotice(safeMessage(error));
      setNoticeKind('error');
    } finally {
      setBusy(false);
    }
  };

  const reissue = async (invitation: InvitationView) => {
    setBusy(true);
    setNotice(null);
    setNoticeKind('info');
    let revoked = false;
    try {
      await client.revokeInvitation(invitation.id);
      revoked = true;
      setInvitationLink(null);
      const created = await client.createInvitation(invitation.recipientEmail);
      setInvitationLink(
        `${window.location.origin}/invite/${encodeURIComponent(created.invitationToken)}`,
      );
      await load();
      setNotice(
        'Invitation reissued. Copy the new link now; the previous link no longer works.',
      );
    } catch (error) {
      setNotice(
        `${revoked ? 'The previous link was revoked, but no replacement was created. Create a new invitation to retry. ' : ''}${safeMessage(error)}`,
      );
      setNoticeKind('error');
      await load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const copyInvitationLink = async () => {
    if (!invitationLink) return;
    setNotice(null);
    setNoticeKind('info');
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable');
      }
      await navigator.clipboard.writeText(invitationLink);
      setNotice('Invitation link copied.');
    } catch {
      const input =
        document.querySelector<HTMLInputElement>('#invitation-link');
      input?.focus();
      input?.select();
      setNotice(
        'Automatic copying is unavailable. The invitation link is selected so you can copy it manually.',
      );
    }
  };

  const canManage = (member: AccountMemberView) => {
    if (
      member.membership.id === ownMembershipId ||
      member.membership.role === 'owner'
    )
      return false;
    if (ownRole === 'owner') return true;
    return ownRole === 'admin' && member.membership.role === 'member';
  };

  return (
    <section className="app-page" aria-labelledby="team-title">
      <header className="page-header">
        <div>
          <p className="eyebrow">Studio workspace</p>
          <h1 id="team-title">Team</h1>
          <p>
            {members.length + invitations.length} of{' '}
            {account?.policy.values.seatLimit ?? '—'} seats used or reserved.
          </p>
        </div>
      </header>
      {notice ? (
        <p
          className={`notice ${noticeKind}`}
          role={noticeKind === 'error' ? 'alert' : 'status'}
        >
          {notice}
          {noticeKind === 'error' ? (
            <button
              className="secondary-button"
              type="button"
              disabled={busy || loading}
              onClick={() =>
                void load().catch((caught: unknown) => {
                  setNotice(safeMessage(caught));
                  setNoticeKind('error');
                })
              }
            >
              Retry team
            </button>
          ) : null}
        </p>
      ) : null}
      {loading ? <p role="status">Loading team and invitations…</p> : null}
      {busy ? <p role="status">Updating your team…</p> : null}

      {access && !access.teamAccessEnabled ? (
        <section className="page-section entitlement-callout">
          <h2>Studio is required for team collaboration</h2>
          <p>
            Your current offer keeps this workspace single-member. Team roles,
            invitations and shared seats are included with Studio.
          </p>
        </section>
      ) : null}

      {access?.teamAccessEnabled && canInvite ? (
        <section className="page-section">
          <h2>Invite a member</h2>
          <form
            className="invite-form"
            onSubmit={(event) => void invite(event)}
          >
            <label htmlFor="invite-email">Verified email</label>
            <input
              id="invite-email"
              type="email"
              required
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
            />
            <button
              className="button"
              type="submit"
              disabled={busy || loading || seatsFull}
            >
              Create invitation
            </button>
          </form>
          {seatsFull ? (
            <p className="entitlement-callout">
              All seats are used or reserved. Revoke an invitation or remove an
              ordinary member before inviting someone else.
            </p>
          ) : null}
          {invitationLink ? (
            <div className="copy-link">
              <label htmlFor="invitation-link">One-time invitation link</label>
              <input id="invitation-link" readOnly value={invitationLink} />
              <button
                className="secondary-button"
                type="button"
                onClick={() => void copyInvitationLink()}
              >
                Copy link
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {access?.teamAccessEnabled ? (
        <section className="page-section">
          <h2>Members</h2>
          <div className="member-list">
            {members.map((member) => (
              <article className="member-row" key={member.membership.id}>
                <div>
                  <strong>{member.displayName}</strong>
                  <span>{member.verifiedEmail}</span>
                </div>
                <span className="role-badge">{member.membership.role}</span>
                {canManage(member) ? (
                  <div className="inline-actions">
                    {ownRole === 'owner' ? (
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void mutate(
                            () =>
                              client.changeMembershipRole(
                                member.membership.id,
                                member.membership.role === 'admin'
                                  ? 'member'
                                  : 'admin',
                              ),
                            'Member role updated.',
                          )
                        }
                      >
                        {member.membership.role === 'admin'
                          ? 'Make member'
                          : 'Make admin'}
                      </button>
                    ) : null}
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove ${member.displayName} from this account?`,
                          )
                        )
                          void mutate(
                            () => client.removeMembership(member.membership.id),
                            'Member removed.',
                          );
                      }}
                    >
                      Remove
                    </button>
                    {ownRole === 'owner' ? (
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Transfer ownership to ${member.displayName}? Completing the fresh sign-in immediately transfers ownership. You will become an Admin and lose Owner-only controls. This cannot be undone by you.`,
                            )
                          ) {
                            setBusy(true);
                            setNoticeKind('info');
                            setNotice(
                              'Opening fresh sign-in. Completing it will transfer ownership immediately.',
                            );
                            void client
                              .startOwnershipTransfer(
                                member.membership.id,
                                '/settings/team',
                              )
                              .then(({ authorizationUrl }) =>
                                window.location.assign(authorizationUrl),
                              )
                              .catch((error: unknown) => {
                                setNotice(safeMessage(error));
                                setNoticeKind('error');
                                setBusy(false);
                              });
                          }
                        }}
                      >
                        Transfer ownership
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {access?.teamAccessEnabled && ownRole !== 'member' ? (
        <section className="page-section">
          <h2>Pending invitations</h2>
          {invitations.length === 0 ? (
            <p className="muted">No pending invitations.</p>
          ) : (
            <div className="member-list">
              {invitations.map((invitation) => (
                <article className="member-row" key={invitation.id}>
                  <div>
                    <strong>{invitation.recipientEmail}</strong>
                    <span>
                      Expires{' '}
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="role-badge">pending</span>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void mutate(
                        () => client.revokeInvitation(invitation.id),
                        'Invitation revoked.',
                      )
                    }
                  >
                    Revoke
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={busy}
                    onClick={() => void reissue(invitation)}
                  >
                    Reissue
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
