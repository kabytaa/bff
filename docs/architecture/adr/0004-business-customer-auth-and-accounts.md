# ADR 0004 — Business customer authentication and accounts

- **Status:** Accepted
- **Date:** 2026-09-27
- **Decision owner:** Andrew
- **Implementation owner:** Codex
- **Scope:** Shared Business customer authentication, account authority, SDK boundaries and retained example deployment
- **Source:** [Build 2 Shared MVP brainstorm](../../../.agent/brainstorms/260926-build-2-shared-mvp.md)
- **Implementation plan:** [Build 2 Shared MVP](../../../.agent/plans/260926-build-2-shared-mvp.md)

## Context

Business Factory needs one customer authentication and account model that can be reused by many products without sharing operator authority, exposing provider credentials to products or making every Business implement session security. Most initial products use TypeScript and Convex, while later products may use ordinary Node.js backends or sibling Swift, Kotlin, Go or Rust SDKs.

The browser must support separate account contexts in separate tabs, a durable sign-in without keeping credentials in JavaScript, and shared BFF APIs such as future feedback or payments. BFF must remain authoritative for generic users, accounts and memberships, while each Business owns its product records and chooses whether those records are user- or account-scoped.

## Decision

### Authority and isolation

- Operator authentication remains a separate Google audience and allowlist.
- Each Business environment has its own customer configuration, environment-local users, accounts, memberships, sessions and policy limits.
- BFF owns the generic identity/account model and signs the current-context credential. A Business stores only its product data and does not mirror the BFF session table.
- Provider identity uses issuer and subject. Matching email never merges identities.
- Production supports Google only. Development may enable the separately keyed dummy provider; production has no dummy verifier or route.

### Login and durable session

The Business server SDK starts a browser-bound transaction using state, S256 PKCE and a provider nonce. BFF sends a one-minute, single-use handoff code only to the exact callback derived from the registered session-adapter origin. The Business callback exchanges it server-to-server and sets a host-only `Secure`, `HttpOnly`, `SameSite=None` cookie.

That cookie contains only one stable 256-bit opaque session handle. BFF stores only its hash. The handle is created at login, shared safely by tabs, and remains stable during ordinary renewal; logout, expiry or operator revocation invalidates it centrally.

The browser never receives the handle, Google credential, PKCE verifier or callback code. The callback finishes at a clean product URL.

### One short current-context token

The Business server SDK presents the durable handle to BFF and requests one ES256 JWT for the requesting tab. BFF signs it for at most ten minutes after checking the current session and selected membership.

- Before membership, it is onboarding-scoped and cannot call product APIs.
- After selection, it includes the environment-local user, session, account, membership, fixed role and compact permissions.
- The same JWT is accepted by that Business backend, native Convex authentication and explicitly allowed shared BFF APIs.
- It is held only in tab memory. Account selection is tab-local; logout/session replacement is broadcast across tabs.
- Ordinary consumers verify signature, issuer, scalar audience, algorithm, expiry and context schema locally. High-risk account mutations reread authoritative BFF state.

Already-issued JWTs may remain usable until expiry after revocation. Revocation immediately prevents new issuance; the accepted maximum stale window is ten minutes.

### Environment transport configuration

Each environment registers:

- a bounded exact set of HTTPS `webOrigins`;
- one canonical HTTPS `sessionAdapterBaseUrl`; and
- one same-application relative `defaultPostLoginPath`.

The SDK callback is always `/_tofler/auth/callback` on the adapter origin and is derived rather than separately editable. BFF never infers environment identity from `Origin`, `Referer` or callback host. Cookie-backed JSON routes require exact Origin, credentialed CORS and the non-simple `X-Tofler-CSRF` header.

Deployment-invariant Business behavior is defined in code with
`defineCustomerAuthDefaults`: enabled providers, bounded sign-in presentation,
default post-login path, session/account policy and account defaults. A
deployment contributes only its exact web origins, adapter origin and whether
development automation is enabled. The operator CLI composes both inputs,
records the definition revision and deterministic source fingerprint, and
previews/applies one effective versioned snapshot. BFF stores and enforces that
snapshot; it never imports or executes Business code at request time. Legacy
version-1 snapshots stay readable during the additive migration.

The central sign-in transaction also carries a presentation-only intent
(`login`, `signup` or `continue`) plus validated product name,
light/dark/system theme and accent color. Login and signup have identical
identity behavior. Businesses may render explicit login/signup links or use
`BffRequireAuth` for protected pages; provider selection always happens on the
Business-aware Tofler page, not in Business UI copy.

The initial generated `*.convex.site` adapter worked in hosted Chromium and
Playwright WebKit, but real iPhone Safari returned from login without sending a
usable cross-site cookie. The retained example therefore exposes the same
adapter through a narrow Cloudflare Worker on `api.<business-domain>`. The
Worker forwards only the fixed `/_tofler/auth/*` routes to one configured
Convex origin and passes request/response headers unchanged; it does not parse,
validate, issue or revoke cookies or tokens. Product `/v1/*` and native Convex
traffic remain direct. This makes the cookie same-site while preserving the SDK
and allowing a later direct Convex custom domain by configuration alone.

“Opaque” describes the gateway application contract, not cryptographic
invisibility: Cloudflare terminates TLS and is part of the credential transport
trust path. The generated Convex upstream remains public by design because the
gateway is not an authorization or WAF boundary; the SDK at the origin still
enforces transaction binding, Origin/CSRF, session and token validity.

### Accounts and policy

There is no permanent accountless product mode. A successfully authenticated user without membership is `onboarding_required` until an account is created or joined.

Business-environment policy controls automatic first-account creation, user account creation, total/owned account caps, ownership transfer and session lifetime. Account policy controls seats, invitations and the optional limited Admin role. Owners count toward memberships, ownership and seats.

Accounts have no shared structural “personal” or “team” kind. Plans may later change seats and product entitlements without replacing the account ID. Membership role, account-wide entitlement and future member seat entitlement remain separate concepts.

Build 2 implements active accounts, invitations and protected ownership transfer. Build 4 introduces actual plans/subscriptions, restrictions and downgrade enforcement with the first paid caller. It does not add unused billing state now.

### SDK structure

The first implementation is one `@tofler/bff-auth` TypeScript SDK with hard
public `core`, `routes`, `browser`, `react`, `server`, `convex/client` and
`convex/server` exports. The Convex exports are backed by the internal
`src/adapters/convex/` implementation. Browser imports cannot pull server
cookies, crypto, secrets or BFF generated code.

The server core uses Fetch `Request`/`Response` and Web Crypto. Convex is the first thin runtime adapter. A later Node.js framework adapter belongs in the same TypeScript family. Swift, Kotlin/Android, Go and Rust become sibling technology SDKs implementing the same versioned wire contracts and platform-appropriate secure storage; their folders are not scaffolded until a real caller exists.

### Deployment and release

The BFF and retained example use separate Convex projects/deploy keys, working directories, generated APIs and data. Production publishes:

- `ops.tofler.tech` — operator backoffice;
- `auth.tofler.app` — shared customer sign-in;
- `example.tofler.app` — retained Business UI;
- `api.example.tofler.app` — opaque session-route gateway;
- one BFF Convex deployment; and
- one independent example Convex deployment.

Production delivery preflights every target and bundle before mutation,
deploys/stamps BFF first, configures and deploys/stamps the example second,
publishes the fixed-upstream gateway, then publishes all three static surfaces.
Automated smoke checks both backend SHAs, public-only JWKS, dummy-route absence,
unauthenticated gateway/product denial, asset SHAs, security headers and exact
embedded targets. Real Google/Safari acceptance remains the final completion
gate.

## Consequences

### Benefits

- Business code receives one verified user/account context without handling login secrets.
- Stable cookie handles avoid cross-tab rotation races while retaining central revocation.
- Tab-local account tokens support different accounts in different tabs.
- BFF account invariants and high-risk operations stay authoritative and reusable.
- Code review captures behavior-changing Business defaults while BFF retains one inspectable effective runtime snapshot and revision history.
- Technology-first SDK boundaries allow later runtimes without treating Convex as the protocol.
- Separate deployments and keys prevent an example release from accidentally targeting BFF data.

### Tradeoffs

- BFF token issuance is required approximately once per ten minutes of active use.
- A revoked stateless token has a bounded remaining validity window.
- The gateway adds one network hop and places Cloudflare in the encrypted
  credential transport path, although it owns no session logic.
- The authentication protocol is security-sensitive custom infrastructure and therefore requires layered scenario, browser, hosted and production evidence.
- Environment/account policy is intentionally richer than a single login toggle, though the guided configuration skill hides most field-level complexity.

## Rejected alternatives

- A BFF browser cookie shared by every Business domain: unreliable cross-site behavior and weak isolation.
- Long-lived bearer credentials in browser storage: greater credential theft impact.
- A separate Business-signed account JWT layered over a BFF identity JWT: redundant trust and extended revocation windows.
- Rotating the durable handle on every ten-minute renewal: avoidable cross-tab races and lost-response failure modes.
- Email-based identity merging: email equality does not prove control of an existing identity.
- Business-owned account/session databases: duplicates shared invariants and defeats the reusable platform boundary.
- Cloudflare-managed cookie/auth logic: couples the protocol to hosting and
  makes non-Cloudflare products harder. The accepted example gateway is only an
  opaque transport adapter; non-Cloudflare products can mount the same Fetch
  server SDK directly or use an equivalent fixed proxy.
- Speculative empty SDKs for every future language: false support claims and maintenance drift.

## Verification

- Contract and policy decision tables cover configuration limits, roles and context schemas.
- Convex scenarios cover concurrent bootstrap, sessions, accounts, invitations, transfer, authorization, retention and denial cases.
- Local HTTPS browser tests cover callbacks, cookies, reload, renewal, independent tabs, logout and wrong origins.
- Hosted development passed the full real ten-minute lifecycle in Chromium and WebKit against separate live BFF/example deployments, while the existing operator hosted smoke remained green.
- Real iPhone Safari passed that development lifecycle after the adapter moved to the same-site gateway.
- Production completion additionally requires the expanded release smoke and Andrew's real Google/Safari lifecycle with backoffice evidence.
