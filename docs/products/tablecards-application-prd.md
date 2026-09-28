# TableCards Application PRD

Created: 2026-09-28
Updated: 2026-09-28
Status: Accepted — implemented in development

This document defines the customer-facing TableCards application experience:
its pages, navigation, responsive behavior, user stories and the visible
workflows behind every launch-pricing promise. The canonical product scope
remains [`tablecards-mvp.md`](tablecards-mvp.md); the factory delivery stages
remain [`mvp-delivery-plan.md`](../factory/mvp-delivery-plan.md).

## Repository baseline

The PRD was proposed from the Build 3 review tree based on `f6344be` and
accepted for implementation on 2026-09-28. The implementation branch is based
on the preserved Build 3 checkpoint `beb4440`; its routed application,
TableCards backend additions and shared BFF account-management additions are
deployed to development and exercised in Chromium and WebKit. Production is
unchanged.

Build 3 baseline capabilities:

- public pasted-line/grid, CSV and XLSX import;
- complete card/sheet preview and deterministic PDF export;
- authenticated account-scoped project save/list/get/archive persistence;
- predefined designs, uploaded assets and four-choice development AI;
- development Free/Event Pass/Planner Pro/Studio access projection and typed
  AI-unit accounting;
- shared BFF authentication, account selection, members, invitations, roles
  and protected ownership transfer APIs.

Delivered by this PRD in development:

- lazy multi-page routing with separate public and authenticated shells;
- focused mobile creator steps and desktop creator workspace;
- active/archived project dashboard plus open, duplicate, archive and restore;
- reusable presets with constrained font, size, color and position persisted
  in project snapshots and rendered in deterministic PDFs;
- account offer, limit, live AI-unit and seat usage presentation;
- member roster, invitation, role/removal and protected ownership-transfer UI;
- token-safe recipient invitation inspection and acceptance;
- scenario-sized hosted coverage for public export, professional project/design
  work, Studio invitation/role work and the compact mobile workflow.

Still owned by later delivery stages:

- live checkout, verified subscription lifecycle, support and production
  operational visibility, which remain later delivery stages.

## Product outcome

TableCards should feel like a focused work tool after the visitor chooses to
create or signs in. Marketing content must not surround every product task.
Mobile exposes one decision at a time; desktop may use the available width to
show controls and preview together.

Every capability named on the pricing cards must satisfy all three conditions
before launch:

1. it is reachable through an understandable product workflow;
2. the server enforces the corresponding entitlement and account scope; and
3. at least one browser journey proves the visible workflow.

If any condition is missing, remove or qualify the pricing claim rather than
shipping a promise backed only by a hidden fixture or API.

## Users and jobs

### Visitor or occasional host

- Understand quickly that TableCards produces a downloadable PDF, not printed
  fulfillment.
- Start without registration, import a real list and preview every card.
- Sign in without losing the draft when ready to save or export.
- Use Free for a small event or purchase one Event Pass for a larger event.

### Independent planner

- See all active projects and remaining capacity.
- Reopen, duplicate, archive and export projects efficiently.
- Save and reuse uploaded or generated design presets.
- Understand the current plan and remaining monthly AI batches.

### Studio Owner

- Do everything a planner can across a shared account.
- Invite up to the available seat limit and see pending invitations.
- Manage roles within the fixed Owner/Admin/Member rules.
- Remove permitted members and securely transfer ownership.
- See plan, project, seat and AI-unit usage in one account view.

### Studio Admin

- Work on shared projects and presets.
- Invite or manage ordinary Members.
- Never modify the Owner, peer Admins or ownership.

### Studio Member

- Work on shared projects and presets.
- View the roster but not perform account-administration actions.

## Information architecture

### Routes

| Route                      | Audience                 | Purpose                                                                 | Delivery owner        |
| -------------------------- | ------------------------ | ----------------------------------------------------------------------- | --------------------- |
| `/`                        | Public                   | Concise landing, representative example, pricing summary, essential FAQ | Build 3 UI correction |
| `/create`                  | Public, then gated       | Start an anonymous project and complete the creator workflow            | Build 3 UI correction |
| `/projects`                | Signed-in account member | Project home, limits, create/open/duplicate/archive actions             | Build 3 UI correction |
| `/projects/:projectId`     | Signed-in account member | Edit, preview, save and export one account-scoped project               | Build 3 UI correction |
| `/designs`                 | Signed-in account member | Predefined library plus entitled uploaded/generated reusable presets    | Build 3 UI correction |
| `/settings`                | Signed-in account member | Current offer and project/card/AI/seat usage                            | Build 3 UI correction |
| `/settings/team`           | Signed-in account member | Roster; authorized invite, role, removal and transfer actions           | Build 3 UI correction |
| `/invite/:invitationToken` | Recipient                | Authenticate if needed, inspect and accept the invitation               | Build 3 UI correction |
| `/settings/billing`        | Owner                    | Checkout, payment method and subscription remediation                   | Build 4               |
| `/support`                 | Public or signed in      | Start/read/reply to the required support conversation                   | Build 5               |

Routes owned by later builds must not appear as dead navigation before their
workflow exists. Build 3 may show development-offer controls only in an
explicit development-only area of `/settings`; they do not belong in the
creator and can never ship in production.

### Public navigation

Desktop header:

- TableCards brand → `/`
- Create cards → `/create`
- How it works → landing section
- Pricing → landing section
- FAQ → landing section
- Log in

On a narrow phone header, keep only the brand, Log in/account action and the
primary Create action. Secondary marketing links remain inside the landing
page; they do not consume the product navigation.

### Signed-in application navigation

Desktop application shell:

- Projects
- Create new
- Designs
- Account selector when more than one membership exists
- Account menu: Plan & usage, Team when relevant, Support when implemented,
  Sign out

Mobile application shell:

- bottom navigation: Projects, Create, Designs, Account;
- the current page title and account selector in a compact top bar;
- contextual actions such as Save, Next or Export remain sticky at the bottom
  of the task rather than forcing a return to the top;
- Team is reached from Account and appears only when the account/member state
  makes it meaningful.

## Page requirements

### Landing `/`

The landing page explains the problem and gets out of the way. It contains:

- the one-sentence outcome and PDF-only clarification;
- one representative card/sheet example;
- primary `Create free` and secondary `Log in` actions;
- a short three-step explanation;
- the accepted four-offer pricing summary;
- collapsed essential FAQ and policy/footer links.

It does not embed the full creator, full design grid, account tools or
development controls. Returning signed-in users may still visit it; the header
also gives them a direct Projects action.

### Creator `/create`

The creator remains usable before authentication.

#### Step 1 — Guests

- Paste lines or a spreadsheet grid, or upload CSV/XLSX.
- Offer a visible example-list action above the input; its sample must include
  both ordinary and realistically long names so wrapping can be evaluated.
- Map name, optional table and optional marker columns when necessary.
- Preserve order, spelling and duplicate rows.
- Show bounded actionable row/import errors.
- Continue only after at least one valid guest exists.
- On mobile, one primary action validates a plain list and advances to Design;
  do not require a separate Preview action when the sheet preview is hidden.
  Tabular input still pauses for explicit column mapping.

#### Step 2 — Design

- Choose a predefined design.
- Mark premium choices clearly without hiding them.
- When entitled, choose an existing reusable preset, upload artwork or request
  four AI choices.
- Show AI availability and remaining batches before generation.
- On mobile, use a compact horizontal design chooser with one large selected
  preview; never stack all six large cards vertically.

#### Step 3 — Review and export

- Show card count, sheet/page count and blocking fit/character issues.
- Open the complete sheet preview on demand on mobile; desktop may keep a
  synchronized side-by-side preview.
- Save and export require authentication and an active account.
- Preserve the bounded anonymous draft through sign-in and return to the same
  step.
- After the first save, replace the history entry with the saved-project route
  so refresh/back navigation behaves like an application.

The experimental six-card print layout and its explanatory controls remain
development-only until physically accepted. Production shows only accepted
print formats.

### Projects `/projects`

The project home contains:

- active-project count and limit for the selected account;
- a clear Create project action;
- cards or a compact table with title, guest count, design, last update and
  state;
- open, duplicate and archive actions where allowed;
- an Archived filter and restore action;
- empty, loading, error and at-limit states with a relevant next action.

Free and Event Pass see one active project. Planner Pro sees up to 25 and
Studio up to 100. Duplication creates a new active project and therefore must
enforce the same project/card/design limits as an ordinary save.

### Saved project `/projects/:projectId`

This route uses the creator workspace with the saved project loaded. It adds:

- project title and saved/unsaved state;
- Save, Duplicate, Archive and Export actions as permitted;
- recent export status and download action;
- a safe not-found/wrong-account state that never reveals another account's
  project.

Account selection while editing leaves the old account context immediately
and returns to the new account's project home rather than rendering stale
project data.

### Designs `/designs`

The page separates:

- included predefined designs;
- premium predefined designs and their entitlement state;
- reusable custom presets for Planner Pro and Studio;
- one-event uploaded artwork for Event Pass without falsely promising reuse;
- generated assets that may be converted into a reusable preset only when the
  offer permits it.

A reusable preset has a name, validated background, approved font choice,
constrained name size/color/position, preview, rename and delete actions. It
never becomes a freeform canvas editor.

### Account `/settings`

Every account member can see:

- selected account name and their role;
- current offer and whether it is development mock, real or restricted;
- active projects used/allowed and maximum cards per project;
- AI batches remaining and allocation label (lifetime, event or current
  billing cycle);
- seats used/allowed when team access exists;
- relevant upgrade/billing action only when that later workflow is real.

Owners see billing/remediation entry points when Build 4 ships. No customer
sees raw grant IDs, allocation keys, provider IDs or webhook state.

### Team `/settings/team`

All Studio members can see the roster and their own role. The page shows seats
used/allowed and pending invitations.

Owner actions:

- invite a Member;
- revoke or reissue a pending invitation;
- promote/demote permitted memberships;
- remove an Admin or Member subject to the shared invariants;
- start ownership transfer to an existing active member.

Admin actions:

- invite/revoke invitations;
- manage ordinary Members;
- never modify the Owner, another Admin or ownership.

Member actions:

- no membership mutations.

The interface derives available actions from authoritative permissions and
still handles server denial. Hidden buttons are not authorization. Transfer
shows an explicit irreversible confirmation, then uses the existing fresh
provider ceremony; completion returns to the team page with the new roles.

For the first UI, invitation creation may expose a one-time copyable link. A
transactional email provider is not invented here. The delivery choice remains
open until the invitation workflow is reviewed.

### Invitation `/invite/:invitationToken`

- Explain which TableCards account issued the invitation only after the token
  has been safely validated.
- If signed out, send the recipient through normal authentication and return
  to this exact workflow.
- Require the authenticated verified email and membership capacity checks
  already enforced by BFF.
- Show accepted, expired, revoked, wrong-recipient and capacity-full outcomes
  without leaking account membership details.
- On success, select the joined account and open Projects.

## Offer-to-interface contract

| Capability                 | Free                         | Event Pass                   | Planner Pro                   | Studio                                  | Visible surface           |
| -------------------------- | ---------------------------- | ---------------------------- | ----------------------------- | --------------------------------------- | ------------------------- |
| Cards per project          | 25                           | 500                          | 500                           | 500                                     | Creator, Project, Account |
| Active projects            | 1                            | 1 event                      | 25                            | 100                                     | Projects, Account         |
| Predefined designs         | Three free                   | All                          | All                           | All                                     | Creator, Designs          |
| Uploaded artwork           | No                           | Current event                | Yes                           | Yes                                     | Creator, Designs          |
| Reusable custom presets    | No                           | No                           | Yes                           | Shared                                  | Designs                   |
| AI background batches      | 1 lifetime                   | 2 per event                  | 10 per verified monthly cycle | 30 shared per verified monthly cycle    | Creator, Designs, Account |
| Members                    | 1                            | 1                            | 1                             | Up to 5                                 | Account, Team             |
| Invitations/roles/transfer | No                           | No                           | No                            | Yes, subject to role and account policy | Team, Invitation          |
| Paid checkout/status       | Upgrade entry when available | One-time purchase in Build 4 | Subscription in Build 4       | Subscription/remediation in Build 4     | Account/Billing           |

An entitlement denial should explain the specific limit and offer an available
next step. It must not silently fail or expose development-offer switching in
production.

## User stories and acceptance

### Visitor and authentication

- **US-01:** As a visitor, I can understand the output and start creating
  without searching through pricing or account screens.
- **US-02:** As a visitor, I can import and completely preview a valid project
  without signing in.
- **US-03:** As a visitor who chooses Save or Export, I can authenticate and
  return to the same bounded draft and workflow step.
- **US-04:** As a returning user, I can log in and reach Projects without
  scrolling through the marketing page.

### Projects and export

- **US-05:** As an account member, I can see only the selected account's
  projects and current project limit.
- **US-06:** As a planner, I can open, duplicate, archive and restore projects
  without losing guest order or duplicate names.
- **US-07:** As a project editor, I can distinguish saved from unsaved changes
  and download only a successfully generated export of the current revision.
- **US-08:** As a Free user over 25 cards or at the active-project limit, I see
  a precise denial and can reduce the project or choose an upgrade path.

### Designs and AI

- **US-09:** As a Free user, I can identify the three included designs and
  understand why premium/custom choices are unavailable.
- **US-10:** As an Event Pass user, I can upload artwork for that event without
  being promised an account-wide reusable preset.
- **US-11:** As a Planner Pro or Studio member, I can save, name, reuse and
  remove constrained custom presets.
- **US-12:** As an entitled user, I can see remaining AI batches before
  generation, receive exactly four choices and keep the unit when generation
  fails.

### Accounts and teams

- **US-13:** As a user with multiple memberships, I can switch accounts and
  immediately see the selected account's projects, designs, usage and team.
- **US-14:** As a Studio Owner/Admin, I can invite within the seat limit and
  copy the one-time invitation link.
- **US-15:** As an invited recipient, I can authenticate, accept a valid
  invitation and land in the joined account.
- **US-16:** As a Studio Owner/Admin, I see only the role/removal actions my
  fixed role permits and receive useful errors if state changed concurrently.
- **US-17:** As an Owner, I can transfer ownership only to an active member
  after confirmation and fresh provider authentication.
- **US-18:** As a Member, I can view team context but cannot mutate membership.

### Responsive and accessible behavior

- **US-19:** As a phone user, I complete one creator step at a time with a
  persistent primary action and without traversing desktop marketing sections.
- **US-20:** As a keyboard or assistive-technology user, I can navigate menus,
  steps, dialogs, errors and dynamic status in a logical order with visible
  focus and labelled controls.

## State and permission rules

- Signed-out users may access Landing and the anonymous Creator only.
- Onboarding-required users see the permitted create/join path, not an empty
  application shell.
- Account-scoped pages require a selected active membership.
- Every project, asset, preset and export read/write derives account scope from
  the verified token; route parameters never select authorization scope.
- Account switching clears account-scoped UI/cache state before loading the
  next account.
- Owner/Admin/Member controls follow BFF permissions, and server authorization
  remains final.
- Offer gates come from BFF effective product access. Pricing copy and local
  catalog metadata do not authorize a feature.
- Development-offer controls require both development build configuration and
  development backend enablement and are absent from production artifacts.
- The Studio development browser fixture explicitly provisions the five-seat,
  invitations, Admin-role and ownership-transfer account policy needed by its
  scenarios. Selecting a mock product offer does not silently rewrite security
  policy; Build 4 deliberately maps verified plan state to the accepted seat
  and capability model.
- A payment mock renewing over time means “successful renewal simulated.” Real
  paid monthly allocations advance only from verified provider paid-through
  state in Build 4.

## Responsive UX requirements

- Support 320 CSS pixels and larger without horizontal page scrolling.
- Do not render the full marketing page inside authenticated product routes.
- Do not stack all large design thumbnails vertically on a phone.
- Keep the active creator step, selected design and primary action clear before
  exposing secondary explanation.
- Use drawers/dialogs only for bounded supporting tasks; a multi-step editor or
  team-management workflow remains a route so refresh/back/deep links work.
- On-demand complete preview must preserve a clear return to the current step.
- Destructive actions require explicit confirmation and a success/failure
  result; ownership transfer uses stronger confirmation and reauthentication.
- Every page provides purposeful loading, empty, denied, stale/not-found and
  retryable-error states.

## Application behavior and quality requirements

- Route-level code splitting keeps landing visitors from downloading XLSX,
  PDF-generation/editor and account-management code they have not opened.
- Navigation and drafts survive ordinary reload/back/forward behavior without
  putting guest data in URLs or analytics.
- Unsaved-change navigation warns before discarding meaningful edits.
- Product copy consistently says downloadable PDF and independent printing.
- Touch targets, contrast, focus management, headings and live status meet the
  repository's accessible-control expectations.
- Guest names/lists, card content and invitation secrets never enter analytics,
  console logs or provider prompts.

## Browser acceptance journeys

The final browser suite should use a few end-to-end scenarios with shared
setup, not one test per button or a Cartesian product.

1. **Visitor to Free export:** landing → creator → paste/import → design → full
   preview → authentication with draft restoration → save → export → Projects.
2. **Professional project workflow:** Planner fixture → project limit display →
   create/open/duplicate/archive/restore → reusable uploaded preset → account
   AI usage.
3. **Studio team workflow:** Owner invites → recipient authenticates/accepts →
   Owner promotes Admin → Admin manages ordinary Member but is denied Owner and
   peer-Admin changes → seat limit denial.
4. **Ownership transfer:** Owner initiates for active member → fresh provider
   ceremony → new Owner shown → replay/old-role action denied.
5. **Account isolation:** one user switches between two accounts; projects,
   designs, usage and team never cross or render stale state.
6. **Mobile workflow:** iPhone-size WebKit proves compact navigation, creator
   steps, horizontal design choice, on-demand preview and sticky primary action
   without desktop-section stacking.
7. **Production boundary:** production bundle/routes contain no development
   offer or deterministic provider entry, and signed-out/private routes fail
   safely.

Fast unit/Convex tests continue to own complete permission, concurrency,
capacity, expiry, replay, account isolation, project-limit and unit-accounting
decision tables.

## Delivery sequence

1. Introduce routing, public/application shells and route-level lazy loading;
   preserve the current working creator behavior while extracting it.
2. Implement the phone step workflow and desktop creator workspace, including
   draft restoration, route-safe unsaved state and on-demand complete preview.
3. Build Projects and saved Project pages; expose archive/restore and implement
   entitlement-safe duplication.
4. Build Designs and the missing reusable-preset operations.
5. Build Account plan/usage presentation and move development-offer controls
   there for development builds only.
6. Add typed account-management SDK operations, Team and Invitation pages, and
   connect protected ownership transfer.
7. Add the focused browser scenarios, accessibility checks and remaining
   negative upload/provider/offer cases.
8. Deploy development, complete Andrew's real-phone review and reconcile every
   pricing claim against the delivered UI before production planning.

Build 4 then replaces development commerce with checkout, verified webhooks,
paid-through renewal, subscription status and billing remediation without
redesigning these pages. Build 5 adds Support to the existing application
shell. Build 6 expands the separate operator backoffice and monitoring rather
than mixing operator controls into TableCards customer settings.

## Explicit non-goals

- No freeform canvas or general design editor.
- No seating-plan, meal/catering or guest-list CRM features.
- No arbitrary roles, domain joining or per-seat billing.
- No customer-facing Business policy editor.
- No raw provider/webhook/debug data in customer pages.
- No dead Billing or Support pages before their owning builds exist.
- No live Paddle work as part of the Build 3 UI correction.

## Resolved product decisions

- Mobile navigation is Projects, Create, Designs and Account.
- Every Studio member may see the roster; mutation controls remain
  permission-aware and server-authorized.
- The first team workflow returns a one-time copyable invitation link. Email
  delivery remains part of the later support/communications slice.
- Archived projects are restorable and do not count toward active-project
  limits while archived.

## Document history

| Date       | Status                                | Change                                                                                                                                                                             |
| ---------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-28 | Proposed — pending Andrew's review    | Initial application PRD created from the Build 3 mobile and missing account/team UI review. No implementation begun.                                                               |
| 2026-09-28 | Accepted — implemented in development | Andrew accepted the recommendations. The routed application, product workflows and shared team surface were implemented and deployed to development; production remains unchanged. |
