import { HEALTH_SERVICE_NAME, parseHealthResponse } from '@bff/contracts';
import { httpRouter } from 'convex/server';

import { httpAction } from './_generated/server';
import { getServiceVersion } from './lib/serviceMetadata';
import {
  publicCustomerJwks,
  readCustomerSigningConfiguration,
} from './lib/customerCrypto';
import {
  acceptInvitationHandler,
  changeMembershipRoleHandler,
  completeDevelopmentLoginHandler,
  completeOwnershipTransferHandler,
  completeGoogleLoginHandler,
  createAccountHandler,
  createInvitationHandler,
  customerApiOptionsHandler,
  currentCustomerHandler,
  customerAuthOptionsHandler,
  exchangeLoginHandler,
  issueContextHandler,
  inspectInvitationHandler,
  listAccountInvitationsHandler,
  listAccountMembersHandler,
  logoutHandler,
  readLoginChallengeHandler,
  removeMembershipHandler,
  renameAccountHandler,
  revokeInvitationHandler,
  startLoginHandler,
  startOwnershipTransferHandler,
  exchangeOwnershipTransferHandler,
  updateAccountPolicyHandler,
} from './lib/customerHttp';
import { customerDevelopmentAutomationRouteEnabled } from './lib/customerCrypto';
import { developmentProductAccessRouteEnabled } from './developmentProductAccess';
import {
  commitUnitsHandler,
  currentProductAccessHandler,
  currentUnitBalanceHandler,
  ensureDefaultProductAccessHandler,
  releaseUnitsHandler,
  reserveUnitsHandler,
  setDevelopmentProductAccessHandler,
} from './lib/productAccessHttp';
import {
  cancelCheckoutHandler,
  checkoutOptionsHandler,
  completeCheckoutHandler,
  createCheckoutHandler,
  readCheckoutHandler,
} from './lib/checkoutHttp';

const http = httpRouter();

http.route({
  path: '/v1/health',
  method: 'GET',
  handler: httpAction(async () => {
    const body = parseHealthResponse({
      status: 'ok',
      service: HEALTH_SERVICE_NAME,
      version: getServiceVersion(),
    });

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
        'content-type': 'application/json; charset=utf-8',
      },
    });
  }),
});

if (customerDevelopmentAutomationRouteEnabled()) {
  http.route({
    path: '/v1/auth/transactions/development',
    method: 'POST',
    handler: httpAction(completeDevelopmentLoginHandler),
  });

  http.route({
    path: '/v1/auth/transactions/development',
    method: 'OPTIONS',
    handler: httpAction(async (_ctx, request) =>
      customerAuthOptionsHandler(request),
    ),
  });
}

http.route({
  path: '/v1/auth/transactions',
  method: 'POST',
  handler: httpAction(startLoginHandler),
});

http.route({
  path: '/v1/auth/transactions',
  method: 'GET',
  handler: httpAction(readLoginChallengeHandler),
});

http.route({
  path: '/v1/auth/transactions/google',
  method: 'POST',
  handler: httpAction(completeGoogleLoginHandler),
});

http.route({
  path: '/v1/auth/transactions/google',
  method: 'OPTIONS',
  handler: httpAction(async (_ctx, request) =>
    customerAuthOptionsHandler(request),
  ),
});

http.route({
  path: '/v1/auth/exchange',
  method: 'POST',
  handler: httpAction(exchangeLoginHandler),
});

http.route({
  path: '/v1/auth/session/context',
  method: 'POST',
  handler: httpAction(issueContextHandler),
});

http.route({
  path: '/v1/auth/session/logout',
  method: 'POST',
  handler: httpAction(logoutHandler),
});

http.route({
  path: '/v1/me',
  method: 'GET',
  handler: httpAction(currentCustomerHandler),
});

http.route({
  path: '/v1/product-access',
  method: 'GET',
  handler: httpAction(currentProductAccessHandler),
});

http.route({
  path: '/v1/product-access/default',
  method: 'POST',
  handler: httpAction(ensureDefaultProductAccessHandler),
});

http.route({
  path: '/v1/checkouts',
  method: 'POST',
  handler: httpAction(createCheckoutHandler),
});

http.route({
  path: '/v1/checkouts',
  method: 'GET',
  handler: httpAction(readCheckoutHandler),
});

http.route({
  path: '/v1/checkouts/complete',
  method: 'POST',
  handler: httpAction(completeCheckoutHandler),
});

http.route({
  path: '/v1/checkouts/cancel',
  method: 'POST',
  handler: httpAction(cancelCheckoutHandler),
});

for (const path of [
  '/v1/checkouts/complete',
  '/v1/checkouts/cancel',
] as const) {
  http.route({
    path,
    method: 'OPTIONS',
    handler: httpAction(async (_ctx, request) =>
      checkoutOptionsHandler(request),
    ),
  });
}

http.route({
  path: '/v1/product-access/units',
  method: 'GET',
  handler: httpAction(currentUnitBalanceHandler),
});

http.route({
  path: '/v1/product-access/units/reserve',
  method: 'POST',
  handler: httpAction(reserveUnitsHandler),
});

http.route({
  path: '/v1/product-access/units/commit',
  method: 'POST',
  handler: httpAction(commitUnitsHandler),
});

http.route({
  path: '/v1/product-access/units/release',
  method: 'POST',
  handler: httpAction(releaseUnitsHandler),
});

if (developmentProductAccessRouteEnabled()) {
  http.route({
    path: '/v1/product-access/development',
    method: 'POST',
    handler: httpAction(setDevelopmentProductAccessHandler),
  });
}

http.route({
  path: '/v1/accounts',
  method: 'POST',
  handler: httpAction(createAccountHandler),
});

http.route({
  path: '/v1/accounts/members',
  method: 'GET',
  handler: httpAction(listAccountMembersHandler),
});

http.route({
  path: '/v1/accounts/name',
  method: 'POST',
  handler: httpAction(renameAccountHandler),
});

http.route({
  path: '/v1/accounts/members/role',
  method: 'POST',
  handler: httpAction(changeMembershipRoleHandler),
});

http.route({
  path: '/v1/accounts/members/remove',
  method: 'POST',
  handler: httpAction(removeMembershipHandler),
});

http.route({
  path: '/v1/accounts/policy',
  method: 'POST',
  handler: httpAction(updateAccountPolicyHandler),
});

http.route({
  path: '/v1/accounts/invitations',
  method: 'POST',
  handler: httpAction(createInvitationHandler),
});

http.route({
  path: '/v1/accounts/invitations',
  method: 'GET',
  handler: httpAction(listAccountInvitationsHandler),
});

http.route({
  path: '/v1/accounts/invitations/inspect',
  method: 'POST',
  handler: httpAction(inspectInvitationHandler),
});

http.route({
  path: '/v1/accounts/invitations/accept',
  method: 'POST',
  handler: httpAction(acceptInvitationHandler),
});

http.route({
  path: '/v1/accounts/invitations/revoke',
  method: 'POST',
  handler: httpAction(revokeInvitationHandler),
});

for (const path of [
  '/v1/me',
  '/v1/accounts',
  '/v1/accounts/members',
  '/v1/accounts/name',
  '/v1/accounts/members/role',
  '/v1/accounts/members/remove',
  '/v1/accounts/policy',
  '/v1/accounts/invitations',
  '/v1/accounts/invitations/inspect',
  '/v1/accounts/invitations/accept',
  '/v1/accounts/invitations/revoke',
  '/v1/product-access',
  '/v1/product-access/units',
  '/v1/product-access/units/reserve',
  '/v1/product-access/units/commit',
  '/v1/product-access/units/release',
] as const) {
  http.route({
    path,
    method: 'OPTIONS',
    handler: httpAction(customerApiOptionsHandler),
  });
}

if (developmentProductAccessRouteEnabled()) {
  http.route({
    path: '/v1/product-access/development',
    method: 'OPTIONS',
    handler: httpAction(customerApiOptionsHandler),
  });
}

http.route({
  path: '/v1/auth/transfer/start',
  method: 'POST',
  handler: httpAction(startOwnershipTransferHandler),
});

http.route({
  path: '/v1/auth/transfer/exchange',
  method: 'POST',
  handler: httpAction(exchangeOwnershipTransferHandler),
});

http.route({
  path: '/v1/auth/transfer/complete',
  method: 'POST',
  handler: httpAction(completeOwnershipTransferHandler),
});

http.route({
  path: '/v1/auth/jwks',
  method: 'GET',
  handler: httpAction(async () => {
    try {
      const body = publicCustomerJwks(readCustomerSigningConfiguration());
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: {
          'access-control-allow-origin': '*',
          'cache-control': 'public, max-age=300, stale-while-revalidate=60',
          'content-type': 'application/json; charset=utf-8',
          'referrer-policy': 'no-referrer',
        },
      });
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: 'RETRYABLE_UNAVAILABLE',
            message: 'Customer authentication is unavailable.',
          },
        }),
        {
          status: 503,
          headers: {
            'cache-control': 'no-store',
            'content-type': 'application/json; charset=utf-8',
            'referrer-policy': 'no-referrer',
          },
        },
      );
    }
  }),
});

export default http;
