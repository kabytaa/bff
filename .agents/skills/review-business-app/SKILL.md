---
name: review-business-app
description: Review a real Business application or feature through its visible journeys, state correctness, navigation, responsive design and accessibility, with dated evidence. Use for hands-on app review; not for product ideation, coding by default or a production-readiness verdict.
---

# Review Business App

Review observed behavior, not the author's completion claim. A green backend
suite does not prove that an advertised capability is discoverable or usable.

## Scope and evidence

Read repository instructions, current STATUS, relevant product/application
contracts and [documentation ownership](../../../docs/factory/business-documentation.md).
Use **full application** mode for a new app, major redesign or whole-app
request. Use **feature/delta** mode for a bounded change: follow its complete
journey and affected shared navigation, authentication/account state,
permissions, components and neighboring flows. State exclusions and why.

Expand when cross-cutting changes or stale evidence make a narrow review
misleading. Reuse valid unchanged evidence after checking relevant code,
configuration and dependencies; do not rerun every unrelated flow by default.
Review an imperfectly documented app anyway, distinguishing accepted
requirements from inferred expectations and consequential documentation gaps.

## Drive the actual product

Use the available browser workflow and existing tests, with synthetic users,
accounts and input only in an authorized environment. Exercise in-scope stories
through visible UI on supported desktop/mobile layouts. Inspect rendered
screens as well as assertions; browser tests alone do not establish visual
quality or full accessibility.

Check applicable paths and states:

- every important control has a meaningful outcome, feedback and recovery;
- login/navigation reflects actual session state; account switches do not
  leave stale data or permissions;
- journeys have coherent entry, exits, back/reload/deep-link behavior and
  auth/payment/invitation return;
- advertised Free/paid/team capability is reachable and corresponds to server
  enforcement, not an operator fixture bypass;
- empty/long/invalid data, limits, roles, expired state and failed operations
  produce understandable outcomes rather than dead buttons or generic silence;
- hierarchy, density, alignment, type, component states and terminology match
  this Business's chosen design, including phone-specific composition;
- overflow, zoom/reflow, touch targets, labels, keyboard/focus and status/error
  announcements have evidence proportionate to the scope.

Run relevant unit/integration/browser gates from verified repository commands.
Identify exactly what a test proves; coverage labels alone are insufficient.
Use screenshot inspection for representative screens where available. If a
browser, environment, role or visual check cannot run, record it as unverified
with its reason and impact, not passed or not applicable.

## Findings and handoff

Store a dated Business-local review with scope, baseline, deployed version when
known, checks, severity-ranked reproducible findings and evidence limitations.
Use `pass`, `fail`, `unverified`, `not-applicable` or `accepted-risk` for
consequential checks. Accepted risk requires an actual authorized decision;
do not invent a waiver. Keep captures synthetic/redacted; do not commit tokens,
cookies, invitation secrets or private customer/guest data in traces/logs.

Audit-only requests permit findings, not silent code fixes or deployment. When
fix-and-verify is authorized, fix only in scope, rerun affected checks and update
the evidence; do not expand to production or paid providers implicitly.
User review is optional by default, not a substitute for Codex's checks.

Report a scoped app-review result, UI/behavior deltas, tested journeys and
residual uncertainty. Do not call the Business production-ready or launched;
the readiness skill evaluates that separate boundary. Update STATUS briefly.
