---
name: review-business-readiness
description: Assess a Business against its requested development, production or customer-launch boundary using product promises, app evidence and applicable safety, commercial and operational checks. Use for release readiness; not for a routine UI review or permission to deploy.
---

# Review Business Readiness

Decide readiness for a declared boundary, not an opaque checklist score.
Development proof, production deployment and a paying-customer launch are
different claims. A no-charge demo can meet its accepted scope without proving
real subscription billing.

## Establish applicability

Read repository instructions, STATUS, the Business's product/application,
architecture and operations docs, relevant dated evidence and
[documentation ownership](../../../docs/factory/business-documentation.md).
Identify the requested target, commit/deployments, supported environments and
accepted requirements. If unspecified, infer only a safe review scope and say
so; do not infer production deployment authority.

Assess actual exposure: customers/markets, seller/entity, money flow, data
classes, uploads/AI, vendors, availability and applicable regulations. Read
[readiness lenses](references/readiness-lenses.md) for the relevant checks.
Every lens needs an applicability decision; not every Business needs payments,
teams, marketing analytics or enterprise operations.

## Reconcile promises with evidence

Trace in-scope promises to UI, server enforcement and current test/operational
evidence. Verify that mocks, missing features and later-stage dependencies are
truthfully presented. Check canonical docs against actual routes, schema/API
ownership, deployment configuration and commands; preserve one source of truth.
Architecture explains components/tables/APIs; operations explains how to deploy,
monitor, troubleshoot and recover. Missing explanations are a material gap when
they prevent safe maintenance, not a demand for a fixed document pack.

Consume current app-review findings, but inspect underlying evidence instead
of treating another agent's verdict as proof. Run outstanding safe authorized
checks yourself when feasible. Fresh agents may independently examine complex
or risky areas when delegation is authorized; they are not a requirement for
every small change. Do not stop by default awaiting user usability review.

## Verdict and record

Create/update a dated Business-local evidence report. For material items use
`pass`, `fail`, `unverified`, `not-applicable` or `accepted-risk`, with reason,
version/date, evidence and next remediation where needed. Unknown is not N/A.
Accepted material risk needs the authorized decision-maker, rationale,
compensating controls where applicable and review date; do not make optional
human review into a universal approval requirement.

Report **ready for the declared boundary**, **not ready**, or **not established**
when unavailable evidence prevents a reliable verdict. Explain which findings
block this boundary and which belong to later stages. Production completion
still requires the repository's intended deploy and live smoke; no local result
or review grants authority to mutate production.

The handoff states behavior/UI changes, checks actually performed, unresolved
risks and why anything could not be verified. Suggest only irreducible human or
physical checks, and label optional review separately from genuine authority
or explicitly required acceptance. Update STATUS with the short outcome.

This is an audit unless fixes are separately authorized. Do not send outreach,
buy services, create provider accounts, commit, deploy or silently waive gates.
Legal/commercial review records evidence and unanswered questions, not a
guarantee of compliance; research does not prove market demand.
