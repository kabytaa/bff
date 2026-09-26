# Brainstorm: Automated Development Authentication

> **Status**: Accepted — Implementation approved
> **Created**: 2026-09-26
> **Last updated**: 2026-09-26
> **Repository baseline**: `eed726ce95df1f37bda477d521d84228c6a5c228`

## Context Snapshot

- Build 1 is complete and deployed to development and production. Google-only operator authentication, the verified-email operator allowlist and the authenticated read-only overview have been verified manually in both lanes.
- The dashboard keeps Google's short-lived ID token only in React memory and passes it to Convex through `ConvexProviderWithAuth`; it deliberately stores no reusable browser session.
- The current Playwright suite uses a deterministic dashboard fixture. Convex authorization is tested separately with mocked identities, but no automated test enters the hosted development dashboard as an authenticated operator.
- Production deployment already has automated public smoke checks. Andrew accepts that a real production Google sign-in can remain a human acceptance check, but wants Codex to authenticate and exercise the hosted development dashboard without depending on him.
- Consulted `STATUS.md`, ADR 0002, the hosted-verification runbook, the backoffice/auth implementation, official Convex custom OIDC/JWT guidance and official Playwright authentication guidance.

## The Idea

Give Codex a safe, repeatable way to authenticate against the real hosted development dashboard and verify the protected dashboard-to-Convex path. The mechanism must exercise real JWT signature, issuer, audience and operator authorization checks, remain isolated from production, require no human Google interaction and avoid storing a reusable user credential in git or browser storage.

This does not replace Google authentication for people. It is an automated development-test identity for the part of the system we own.

## Codebase Context

### What We Have

- A Google OIDC provider in `convex/auth.config.ts` and one shared authorization guard for all protected backoffice reads.
- An auth-provider adapter around `ConvexProviderWithAuth`, so another development-only token source can use the same Convex client contract.
- A hosted development lane at `ops-dev.tofler.tech` backed by a separate Convex development deployment.
- A production-bundle assertion that already rejects test fixture markers and operator-identity leakage.
- Playwright desktop/phone coverage and Convex integration tests with positive and negative identities.

### Constraints

- Automating the Google account UI would require a reusable Google account session or credential and can be interrupted by MFA, consent prompts, CAPTCHA or provider UI changes.
- The current Google token lives only in React memory, so Playwright's normal persisted-cookie/local-storage approach cannot reuse it.
- A fake identity passed directly to a Convex function would not prove that the hosted client passes a token or that Convex validates its signature, issuer and audience.
- Any automated signer is a credential. Its private key must remain outside git and browser bundles, and tokens should be short-lived and scoped to the development audience.
- Production must have no test issuer, signing key, token injection path or automated-test operator identity.

### Opportunities

- Convex supports multiple auth providers and a custom JWT provider with an exact issuer, audience, algorithm and JWKS. A public JWKS can be embedded as a data URI, avoiding a new hosted identity service.
- Convex auth configuration can vary by deployment, so development can accept a test issuer while production continues to accept only Google.
- Playwright can provide a freshly minted token to the browser at test startup without saving it to repository files or long-lived browser storage.
- The existing operator guard can authorize one exact automation issuer-and-subject pair after Convex validates it, while human operators continue to require verified allowlisted email addresses.

## Options

### Option A: Automate a dedicated Google test account

**Approach**: Create a Google account for automation, perform the real Google login in Playwright and reuse its browser authentication state.

**Leverages**: The existing Google-only UI and Convex configuration without adding another issuer.

**Constraints**: Requires a reusable Google credential/session and depends on provider-controlled MFA, consent, CAPTCHA and UI. The current in-memory ID token also makes ordinary Playwright storage-state reuse insufficient.

**Effort**: Medium

**Risk**: Brittle tests, account lockout and a high-value Google credential stored for automation. This is not recommended.

### Option B: Development-only signed test identity in shared development

**Approach**: Keep Google for humans, but configure the existing Convex development deployment to accept a second, tightly defined JWT issuer. Playwright mints a short-lived, development-audience token with a private key stored outside the repository and supplies it through a development-only dashboard auth adapter. Convex validates the signature, issuer, audience and expiry before the normal operator guard and overview query run.

**Leverages**: The existing development deployment, `ConvexProviderWithAuth`, operator guard, Playwright project and production-bundle assertion. Convex supports multiple providers and an embedded public JWKS.

**Constraints**: Shared development deliberately contains a second auth provider. The signer key becomes a development credential and must be kept in local/GitHub secret storage. The test proves our auth integration, not Google's popup itself.

**Effort**: Medium

**Risk**: A leaked signer key could impersonate the automated operator in development until rotated. Exact audience binding, very short token life, development-only configuration and an assertion that production has no test provider contain the impact.

### Option C: Separate hosted automation lane

**Approach**: Create a separate dashboard and Convex test deployment that accept the signed test identity. Keep both shared development and production Google-only.

**Leverages**: The same custom-JWT and Playwright mechanism as Option B while providing a smaller blast radius and deterministic test data.

**Constraints**: Adds another permanent deployment, hostname, provider configuration and delivery path. It can drift from the shared development lane that Codex is meant to verify.

**Effort**: High

**Risk**: Operational overhead and false confidence if the isolated lane diverges from development. It is stronger isolation than the current solo project appears to need.

### Option D: Keep deterministic fixture and mocked identities only

**Approach**: Retain the current Playwright fixture and Convex integration tests, with human Google sign-in as the only hosted authenticated check.

**Leverages**: Everything already implemented; no credentials or new provider.

**Constraints**: Does not test the hosted dashboard, real Convex connection or authenticated read path together.

**Effort**: Low

**Risk**: The exact gap Andrew identified remains. This does not satisfy the goal.

## Open Questions

- None for the initial direction. Automatic post-development-deploy execution and a separate automation lane are deferred until their added complexity solves a demonstrated problem.

## Current Direction

Option B is selected for the current solo-development phase. It closes the real hosted-auth gap without automating a Google password, creating a third deployment lane or weakening the Convex function boundary. The automated JWT is useful only against the existing shared development deployment, lasts only minutes and passes through Convex's real cryptographic validation and the existing operator guard.

Keep the first version deliberately small. Codex runs the hosted authenticated check on demand rather than adding development CI/CD. Its success boundary is that the real `ops-dev` dashboard authenticates the automation identity and loads the protected overview from the real development backend. Existing unit and integration tests retain the detailed unauthenticated, unauthorized and unverified-email denial coverage; additional hosted negative cases wait for a demonstrated need.

The design must fail closed: production continues to configure only Google; a production build must contain no test-auth adapter; the public key alone cannot mint tokens; and missing development signer material should skip or fail the authenticated hosted check rather than introduce an unsigned bypass. The token represents a dedicated development-automation identity, not Andrew or another human operator. The normal operator guard may recognize that exact issuer-and-subject pair only after Convex has authenticated it; production cannot produce such an identity because it does not configure the provider.

No auth provider, credential, deployment or application code is changed during this brainstorm.

## Decision Log

| Date | Decision | Context |
| --- | --- | --- |
| 2026-09-26 | Production may keep the real operator sign-in as a human acceptance check, but development needs a Codex-runnable authenticated hosted check. | Public production smoke is already automated; Andrew wants Codex to verify authenticated development behavior without requiring his participation. |
| 2026-09-26 | Do not treat the existing fixture and mocked Convex identity tests as sufficient for this goal. | They cover UI states and authorization logic separately but do not authenticate the hosted dashboard against the real development backend. |
| 2026-09-26 | Choose the simplest safe option throughout: use shared `ops-dev`, run the authenticated check on demand and initially require only the real protected overview to load. | Andrew explicitly preferred the easy option over an extra automation deployment, automatic development workflow or broader hosted test matrix. Existing deterministic tests continue to cover detailed denial behavior. |
| 2026-09-26 | Accepted the complete direction and approved implementation planning. | Andrew confirmed the deliberately small shared-development design and asked to proceed. |
| 2026-09-26 | Use a dedicated development-automation identity rather than impersonating an allowlisted human email. | Andrew asked who the hosted check would sign in as and accepted a dummy identity isolated to development. |
| 2026-09-26 | One local signer may be reused across the current solo developer's development deployments; every token remains audience-bound to one target. | This keeps setup small now. Separate keys per developer or machine remain the later revocation boundary. |
| 2026-09-26 | Approved the implementation plan and authorized implementation plus deployment to the existing development lane. | Production remains Google-only and still requires the normal reviewed main release flow. |

## Notes

- Convex can accept multiple OIDC providers and selects the first matching issuer/audience: <https://docs.convex.dev/auth/advanced/custom-auth>.
- Convex custom JWT providers validate an exact issuer, optional-but-security-critical audience, RS256/ES256 signature and JWKS; the JWKS may be a data URI: <https://docs.convex.dev/auth/advanced/custom-jwt>.
- Convex maps the standard `iss` and `sub` JWT claims to the authenticated identity fields used by the exact development-automation guard: <https://docs.convex.dev/api/interfaces/server.UserIdentity>.
- Playwright recommends keeping authenticated artifacts out of source control and supports setting up authentication before tests; our in-memory token model favors an ephemeral per-run token rather than a persisted auth file: <https://playwright.dev/docs/auth>.
