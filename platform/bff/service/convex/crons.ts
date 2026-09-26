import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

crons.hourly(
  'expire pending customer invitations',
  { minuteUTC: 17 },
  internal.authCleanup.expirePendingInvitations,
  {},
);
crons.daily(
  'delete expired customer auth protocol state',
  { hourUTC: 3, minuteUTC: 23 },
  internal.authCleanup.deleteExpiredProtocolState,
  {},
);

export default crons;
