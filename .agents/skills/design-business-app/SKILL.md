---
name: design-business-app
description: Translate accepted Business promises into maintained screens, navigation, states, interactions, responsive behavior and design choices. Use to design an app or reconcile its application documentation; not for changing pricing, writing code or auditing release readiness.
---

# Design Business App

Describe how this Business delivers its accepted outcomes. Choose a fitting
experience, not a universal dashboard, login flow or page template.

## Establish the chosen experience

Read repository instructions, current STATUS, the relevant product contract
and [documentation ownership](../../../docs/factory/business-documentation.md).
Inspect existing routes, components, tokens and tests before documenting a
delivered app. Preserve accepted product constraints and distinguish intended
behavior from what current code actually does.

For a new design, recommend suitable composition options and record the
Business's choice. For an existing app, reconcile documentation without
pretending a missing workflow already exists. A small feature updates the
affected sections; it does not require a replacement application PRD.

## Make journeys buildable and reviewable

Document applicable content proportionately:

- surfaces/routes and their purpose, entry conditions and exits;
- navigation, deep links, back/reload and authentication return;
- primary customer journeys and consequential actions, including purchase,
  submissions, destructive operations and permission changes;
- meaningful loading, empty, validation, denied, limited, expired and
  provider/network-error states, with feedback and a useful next action;
- session/account/role/plan visibility and enabled conditions, including
  correct signed-in navigation and onboarding/account-selection states;
- desktop/mobile composition and supported widths; responsive transformation
  rather than simply shrinking desktop content;
- accessibility, keyboard/focus, status/error communication and task latency;
- mapping of promises/stories to visible workflow, server enforcement and tests.

Explain which concerns belong together, on distinct routes, in steps or in
bounded supporting panels only where that decision matters. Use small flow
diagrams/wireframes when they clarify a composition or state transition. Do
not require diagrams, control IDs or eight-field records for every ordinary
button. Inspect important actions even when no documentation ID exists.

## Preserve design consistency

Record the Business's visual and interaction choices: semantic color roles,
typography responsibilities, density/layout priorities, reusable components,
feedback/confirmation patterns, terminology, artwork and justified exceptions.
Link executable tokens/components for exact values instead of maintaining a
second CSS-token catalog. Keep this as an application section until a separate
design-system document actually helps.

Required outcomes do not imply a fixed mechanism: correct authentication state
does not require one provider, redirect, modal or session implementation.
Do not force a saved-work dashboard on a one-shot utility or expose future
billing/support links as inert placeholders.

## Handoff

Maintain the canonical Business-local application document and link product,
architecture and evidence. Record gaps explicitly; do not weaken accepted
pricing promises to match an incomplete build without user direction.
Technical table/API explanations remain in architecture, maintained by
implementation/documentation work; operations describes deployment/recovery.

Report the concrete page/state/flow changes and remaining product choices.
This skill does not implement, deploy or claim that the UI was tested merely
because its expected behavior is now written down.
