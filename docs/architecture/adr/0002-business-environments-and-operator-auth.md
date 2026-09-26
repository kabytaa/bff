# ADR 0002 — Business environments and operator authentication

- **Status:** Accepted
- **Date:** 2026-09-25
- **Last amended:** 2026-09-26
- **Decision owner:** Andrew
- **Implementation owner:** Codex
- **Scope:** Business-environment registry, isolation terminology and Build 1 backoffice authentication
- **Supersedes:** The `projects` registry, Build 1 authentication and global-user assumptions in [ADR 0001](0001-convex-first-bff-stack.md)

## Context

One BFF deployment must support several Businesses and several isolated environments of the same Business without requiring a BFF code release for each registration. The founder also needs a small hosted dashboard that is safe to inspect from a phone, while repeatable configuration remains automatable by Codex.

The earlier architecture used `project` for a commercial idea, repository folder, runtime registration and sometimes an Nx project. It also selected Better Auth before the distinct needs of the tiny operator dashboard and future Business users had been separated.

## Decision

Use these terms:

- **Business** — the commercial initiative, such as TableCards.
- **Business environment** — one hard BFF data and authorization boundary, such as TableCards Development or TableCards Production.
- **BFF deployment** — one running Convex backend/database. A deployment may host several Business environments.
- **Workload** — an executable app, API or worker. It may also technically be an Nx project.

### Build 1 registry

Persist one `businessEnvironments` row per isolated environment. Convex supplies `_id` and `_creationTime`; the application stores:

- immutable, unique `key`
- editable `businessName`
- editable `environmentName`
- server-maintained `updatedAt`

Use a `by_key` index and transactional duplicate rejection. Build 1 has no lifecycle status, deletion, settings, domains or credentials on the row.

Released Businesses never self-register. A repository-owned operator CLI calls validated internal Convex functions to create, inspect, list and update rows against an explicitly selected deployment. The backoffice shows the same rows read-only. Add web mutation controls only for a real human-judgment workflow.

### Isolation invariant

Every future Business-owned record and credential is scoped directly or through an ownership root to exactly one Business environment. Compromise of one Business workload or credential must not grant data or operations in a sibling environment. Cross-environment operator views are explicit backoffice capabilities, not a weakening of ordinary access rules.

Build 1 can prove registry addressing and operator authorization, but it cannot claim user/product-data isolation before those scoped tables exist. Each owning build must add negative cross-environment tests.

### Build 1 operator authentication

The hosted backoffice has at most a few fixed operators. It uses Google Identity Services to obtain a short-lived ID token for a public web client. Convex validates the exact issuer, audience, signature and expiry. Every protected backoffice read then calls one shared guard that requires Google's `email_verified` claim and matches the normalized verified email against a fixed code-owned allowlist shared by every deployment.

The public Google client ID and operator-email identifiers are reviewed together in `@bff/static-config` because they are intentionally identical in every deployment and neither value grants access by itself. Credentials and values that differ by deployment must not enter that module. The production bundle imports only the public client ID, and an automated bundle assertion rejects any operator-address leakage.

Google sign-in alone does not grant access. The browser receives neither the allowlist nor a Convex deployment credential. A bounded bootstrap query may return only the signed-in caller's own email, verification state and authorized flag. Tokens stay in memory and expiry requires refresh or reauthentication.

Public health has no authentication. Registry mutations remain internal deployment operations. Provider webhooks and future Business users/services each use their own boundary-specific authentication guard.

### Development-only automated operator verification

The shared development deployment may additionally accept a custom ES256 JWT provider so Codex can exercise the real hosted protected dashboard without a reusable Google credential. The private signing key remains in ignored mode-`0600` local state. Convex receives only the matching public JWKS plus an exact deployment audience, and every token expires after two minutes.

The token represents one dedicated automation subject, not either human operator. The shared guard accepts that subject only with the exact reviewed automation issuer after Convex has validated its signature, issuer, audience and expiry. Human email authorization explicitly requires Google's issuer, so a development token cannot impersonate an allowlisted human by copying email claims. Convex requires every environment variable referenced by `auth.config.ts` to exist in every deployment, so production uses the exact non-secret value `disabled` for both automation settings; the fail-closed builder emits only Google for that pair and rejects partial or mixed values. The production dashboard build also excludes the automation entry, issuer, subject and token transport marker. The same signer may be reused for the current solo developer's development deployments, but each deployment must configure a distinct audience; use separate keys when independent revocation by developer or machine becomes valuable.

### Future Business-user identity

Build 1 does not select or scaffold Better Auth, Convex Auth or another Business-user authentication library. Build 2 chooses the current supported mechanism when a real Business login flow exists.

The invariant is already fixed: technical provider identities remain private to the BFF, while the same person receives a distinct local user row and public user ID in every Business environment they access. Browser/user credentials are short-lived and bound to one Business environment. Optional service credentials are created only for a backend that needs them and are also bound to one environment.

## Consequences

### Benefits

- New Business environments are data operations rather than BFF code releases.
- One development deployment can host several isolated environments.
- The small operator surface avoids coupling future Business auth to backoffice needs.
- CLI-first changes are repeatable while essential state remains visible from a phone.
- Terminology no longer confuses a Business, its runtime environment, its workloads and an Nx project.

### Tradeoffs

- Every future data access path must preserve Business-environment scope.
- The direct Google operator token may require reauthentication when it expires.
- A fixed code-owned allowlist is intentionally unsuitable for large operator teams and exposes the operator addresses to repository readers.
- Adding or removing an operator requires a reviewed code change and service deployment. Andrew accepts that tradeoff because the same two people administer every environment.
- Email is a deliberate operator-facing identifier for this two-person backoffice. If the operators move to managed Workspace identities or the team grows, migrate the allowlist to stable provider subjects or a dedicated operator table.
- The exact Business-user auth library remains a Build 2 decision.

## Build 1 exclusions

- TableCards or other Business workload code
- public registry CRUD or self-registration
- registry status, deletion, settings or secret storage
- Business users, accounts, memberships and service credentials
- billing, analytics and support tables
- a public SDK
- production/staging deployments and production domains

## Verification

- Contract/unit tests cover validation and error shapes.
- `convex-test` covers registry invariants plus authenticated, forbidden and unauthenticated dashboard reads.
- Authorization tests prove that an allowlisted but unverified email still fails closed.
- A deterministic Playwright entry tests the dashboard without a live Google dependency and is excluded from production output.
- Live Google/origin wiring is a separate hosted development smoke check after local completion.
- An on-demand hosted Playwright check mints a fresh development-only token in process memory, injects it before the automation page starts and proves the real protected overview loads. Deterministic browser tests remain provider-independent, and production bundle checks reject every automation artifact.

## Historical relationship

ADR 0001 remains authoritative for Convex, Nx/pnpm/TypeScript, the technology-neutral public boundary, React/Vite/Tailwind, Cloudflare, Paddle, GitHub Actions and incremental capability-sized delivery. This ADR supersedes only the older registry, Build 1 auth and global-user wording described above.

## Amendment history

- **2026-09-26:** The original accepted operator rule used Google's stable `(issuer, subject)` pair. Andrew deliberately simplified this tiny, manually administered backoffice to a verified-email allowlist for himself and his wife. He also chose to keep the list in source because it is intentionally identical across deployments; changing it requires a code release. Convex still performs cryptographic issuer/audience/signature/expiry validation, the guard requires `email_verified: true`, and no browser-supplied address is trusted. This amendment does not apply to future Business-user identity.
- **2026-09-26:** Added a development-only ES256 automation identity for on-demand hosted dashboard verification. It is a separate exact issuer/subject accepted only after Convex authentication; production remains Google-only and ships no automation browser entry.
- **2026-09-26:** Replaced the intended absent production automation values with an exact `disabled` pair after the first source release exposed Convex's requirement that every auth-config environment-variable reference exist in every deployment. This is a platform compatibility adjustment: production still emits only the Google provider, and mixed disabled/enabled values fail deployment.
