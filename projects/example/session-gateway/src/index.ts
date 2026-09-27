interface SessionGatewayEnvironment {
  readonly BUILD_VERSION?: string;
  readonly UPSTREAM_ORIGIN?: string;
}

type GatewayFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const SESSION_ROUTES = new Map<string, ReadonlySet<string>>([
  ['/_tofler/auth/login', new Set(['GET'])],
  ['/_tofler/auth/callback', new Set(['GET'])],
  ['/_tofler/auth/context', new Set(['OPTIONS', 'POST'])],
  ['/_tofler/auth/logout', new Set(['OPTIONS', 'POST'])],
  ['/_tofler/auth/transfer/start', new Set(['OPTIONS', 'POST'])],
]);

function gatewayError(status: number, message: string): Response {
  return Response.json(
    { error: { code: 'SESSION_GATEWAY_ERROR', message } },
    {
      status,
      headers: {
        'cache-control': 'no-store',
        'referrer-policy': 'no-referrer',
        'x-content-type-options': 'nosniff',
      },
    },
  );
}

function upstreamOrigin(value: string | undefined): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    url.protocol !== 'https:' ||
    url.origin !== value ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    !url.hostname.endsWith('.convex.site')
  ) {
    return null;
  }
  return url.origin;
}

export async function handleSessionGatewayRequest(
  request: Request,
  environment: SessionGatewayEnvironment,
  fetcher: GatewayFetch = fetch,
): Promise<Response> {
  const requestUrl = new URL(request.url);
  if (
    requestUrl.pathname === '/_tofler/session-gateway/health' &&
    request.method === 'GET'
  ) {
    return Response.json(
      {
        status: 'ok',
        service: 'business-factory-example-session-gateway',
        version: environment.BUILD_VERSION?.trim() || 'development',
      },
      {
        headers: {
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      },
    );
  }
  const methods = SESSION_ROUTES.get(requestUrl.pathname);
  if (!methods) {
    return gatewayError(404, 'Route not found.');
  }
  if (!methods.has(request.method)) {
    const response = gatewayError(405, 'Method not allowed.');
    response.headers.set('allow', [...methods].join(', '));
    return response;
  }

  const origin = upstreamOrigin(environment.UPSTREAM_ORIGIN);
  if (!origin) {
    return gatewayError(503, 'Session gateway is unavailable.');
  }

  const upstreamUrl = new URL(requestUrl.pathname + requestUrl.search, origin);
  const upstreamRequest = new Request(upstreamUrl, request);
  try {
    return await fetcher(upstreamRequest, {
      cache: 'no-store',
      redirect: 'manual',
    });
  } catch {
    return gatewayError(502, 'Session adapter is unavailable.');
  }
}

export default {
  async fetch(request: Request, environment: SessionGatewayEnvironment) {
    return await handleSessionGatewayRequest(request, environment);
  },
};
