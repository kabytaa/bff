# Future Architecture Ideas

Updated: 2026-09-26.

## Purpose

This is a non-authoritative registry of durable architecture ideas that are intentionally outside current implementation scope. It is not a roadmap, backlog, implementation plan or accepted architecture decision. An entry records enough context for a later brainstorm to recover the idea without treating it as approved work.

When a real caller or requirement triggers an entry:

1. Read the linked source discussion.
2. Start or continue the relevant dated brainstorm in `.agent/brainstorms/`.
3. Re-evaluate the idea against the then-current repository and official provider documentation.
4. Record the accepted outcome in an ADR only after implementation-facing architecture is approved.
5. Update the entry with a link to the successor brainstorm or ADR rather than deleting its history.

## Cross-provider identity linking and recovery

**Status:** Partially adopted by the active Build 2 brainstorm: the private technical principal and separate provider-identity boundary are now selected. Provider linking and recovery remain deferred; Google is still the only production Business-user provider in the current slice.

**Source:** [Build 2 Shared MVP brainstorm](../../.agent/brainstorms/260926-build-2-shared-mvp.md)

**Trigger:** A real Business needs a second identity provider such as Apple or GitHub.

**Idea:**

- Keep one private technical principal with separately linked provider identities; environment-local users materialize from the principal rather than a provider-specific account.
- Never merge identities merely because provider emails match.
- When a newly authenticated provider returns the same verified email as an existing user, create only a short-lived `pending_identity_link` transaction. Do not create a permanent provider identity, principal, Business user, account or membership yet.
- Ask the person to authenticate with the existing sign-in method. After both identities are proven, explicitly confirm and atomically link the new provider identity to the existing principal, then append a security event.
- If the existing-provider proof fails or is cancelled, expire the pending transaction without durable identity changes.
- An existing signed-in session or a separately designed strong recovery method may prove continuity. Matching email, a support conversation or control of only the new provider must never authorize takeover.
- Before enabling a second provider, design recovery for people who permanently lose the original provider: recovery codes, strongly verified operator recovery, delays, notifications, session revocation and immutable audit evidence are candidate controls, not accepted implementation yet.

**Open when triggered:** Define recovery proof, notification and cooldown rules; verify provider-specific email and private-relay behavior; design negative linking and takeover tests. Reuse the already selected principal/identity boundary rather than reopening email-based merging.

## Usage-based billing and account credits

**Status:** Deferred idea; no meter, balance or usage-ledger tables belong in the current authentication/account slice.

**Source:** [Build 2 Shared MVP brainstorm](../../.agent/brainstorms/260926-build-2-shared-mvp.md)

**Trigger:** A real product charges for measurable consumption rather than, or in addition to, a subscription—for example AI tokens or generated images.

**Idea:**

- Keep feature entitlement separate from usage charging: entitlements answer whether an operation is available, while an account-owned ledger answers how much was consumed and whether more spending is permitted.
- Let a Business register bounded named meters and units. Business backends report trusted billable usage server-to-server; browser input never directly creates charges.
- Provide an idempotent reserve/commit/release SDK flow around costly operations. Reserve estimated usage before the external call, commit actual usage afterward and release the reservation on failure.
- Keep balances, spending limits and usage counters authoritative in BFF. Do not place mutable balances in ten-minute JWTs.
- Prefer prepaid credit packs for the first real caller to limit unpaid invoices and runaway provider cost. Re-evaluate postpaid metering only when a concrete Business needs it.
- Preserve optional user, membership and seat attribution for audit/reporting while the account remains the payer.

**Open when triggered:** Select provider capabilities from then-current official documentation; define meter schema, reservation expiry, concurrency, refunds/adjustments, ledger invariants, fraud limits, reconciliation and operator workflows.

## Custom-domain edge protection and operational monitoring

**Status:** Deferred idea; the current MVP uses the generated Convex domain, bounded application-level rate limiting and no DDoS-specific telemetry or alerting.

**Source:** [Build 2 Shared MVP brainstorm](../../.agent/brainstorms/260926-build-2-shared-mvp.md)

**Trigger:** A Business adopts a Convex custom domain, public traffic or abuse becomes material, monitoring cost/error volume becomes operationally relevant, or an observed incident shows the MVP controls are insufficient.

**Idea:**

- Reassess a layered boundary using then-current official provider capabilities: Cloudflare edge DDoS/WAF/rate limiting before origin work, precise Convex application limits keyed to Business semantics and sampled error monitoring such as Sentry.
- Do not assume that attaching a Convex custom domain automatically puts Cloudflare security in the request path. Verify the supported DNS/proxy topology, TLS behavior and Convex custom-domain contract at that time.
- If traffic is intentionally routed through an edge proxy, prevent attackers from bypassing it through the generated Convex origin when the platform provides a supported restriction or origin-authentication mechanism.
- Keep expected authentication denials and rate-limit rejections out of per-request durable audit and error-monitoring streams. Aggregate or sample noisy evidence, redact credentials and personal data, set volume/spend limits and alert only on actionable thresholds.
- Preserve individual immutable audits for meaningful authenticated lifecycle and high-risk account actions; edge/security analytics must not replace the application audit trail.
- Validate the design with bounded, provider-compliant load and failure tests rather than intentionally exposing production to an attack.

**Open when triggered:** Confirm whether Convex custom domains can be safely proxied through Cloudflare; determine origin-bypass prevention; select edge and application rate-limit keys/thresholds; define Sentry sampling, retention, privacy and spend caps; define actionable alert thresholds and incident evidence.
