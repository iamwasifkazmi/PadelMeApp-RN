/** When a guest starts sign-in from an invite, we reopen AcceptInvite after auth mounts. */
export const pendingPostAuthInviteToken: { current: string | null } = { current: null };
