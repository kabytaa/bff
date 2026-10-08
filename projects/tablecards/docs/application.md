# TableCards Application

Created: 2026-09-28
Updated: 2026-10-08
Status: Accepted — Build 3 no-charge preview deployed in development and production

This document defines the customer-facing TableCards application experience:
its pages, navigation, responsive behavior, user stories and the visible
workflows behind every launch-pricing promise. The canonical product scope
remains [the product specification](product.md); the factory delivery stages
remain [`mvp-delivery-plan.md`](../../../docs/factory/mvp-delivery-plan.md).
Technical ownership and contracts belong in [architecture](architecture.md);
deployment and recovery belong in [operations](operations.md).
The [2026-10-07 corrections/review](reviews/261007-pdf-session-and-live-ai-fixes.md)
records cards-only output, accurate public session actions, real capped AI and
optional company/style references; earlier acceptance is retained below.
The [production release review](reviews/261007-build-3-production-release.md)
records the merged release, actual desktop/mobile checks and unavailable
personal Google credential round-trips. This is not a paying-customer launch.

## Repository baseline

The PRD was proposed from the Build 3 review tree based on `f6344be` and
accepted for implementation on 2026-09-28. The implementation branch is based
on the preserved Build 3 checkpoint `beb4440`; its routed application,
TableCards backend additions and shared BFF account-management additions are
deployed to development and exercised in Chromium and WebKit. Production was
unchanged at that historical baseline; the 2026-10-07 release is recorded above.

The 2026-10-06 reconciliation inspected branch `feat/tablecards-application` at
`b5aeae3`, including the [router](../workloads/web/src/router.tsx), page and
creator components, styles, server guards and existing test assertions. It
records the development implementation without treating every accepted
requirement as delivered. This documentation pass did not run a new browser
review or validate production. The original PRD history remains below.

The completed [remediation plan](../../../.agent/plans/261006-tablecards-review-remediation.md)
changed the reviewed source from checkpoint `3a948ad`. The delivered notes
below describe the implementation; its deployment proof is recorded separately.
Focused component tests
cover input/export fidelity, drafts, fit feedback, pending AI recovery, artwork
sources and account navigation. Hosted browser revalidation and independent
rendered review are now recorded in the [completed remediation acceptance](reviews/261006-tablecards-remediation-and-development-acceptance.md)
at runtime `a914da0`: 27 hosted Chromium/WebKit cases passed, with a separate
independent app and Astra review. The dated original review remains preserved.

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

- live checkout, verified renewal/cancellation, restricted/remediation and
  retention states, support and production operational visibility. Their
  accepted promises remain in the product contract.

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

If any condition is missing, record the gap and qualify the delivery boundary
before launch. Do not silently reduce an accepted pricing promise to match an
incomplete workflow; a scope change requires product direction.

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

| Route                            | Entry condition and purpose                                                                                | Current delivery                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `/`                              | Public landing, examples, pricing and FAQ; signed-in visitors can return here                              | Development                              |
| `/create`                        | Public import/design/preview; save, export and AI require a selected account                               | Public guest header; signed-in app shell |
| `/projects`                      | Selected active membership; project home, active/archived filters and lifecycle actions                    | Development                              |
| `/projects/:projectId`           | Selected active membership; load one scoped project into the creator                                       | Development                              |
| `/designs`                       | Selected active membership; predefined library, entitled artwork/AI and reusable presets                   | Development                              |
| `/settings`                      | Selected active membership; account, role, offer, usage and checkout return                                | Development                              |
| `/settings/team`                 | Selected active membership; Studio roster and authorized management; other offers see a Studio requirement | Development                              |
| `/invite/:invitationToken`       | Public token inspection, then recipient authentication and acceptance                                      | Development, public shell                |
| `/privacy`, `/terms`, `/contact` | Public, factual development-preview disclosures and operator-contact boundary                              | Remediation source, public shell         |
| `/settings/billing`              | Owner billing and subscription remediation                                                                 | Planned Build 4; not registered          |
| `/support`                       | Public/signed-in support entry and authenticated conversation                                              | Planned Build 5; not registered          |

Routes owned by later builds must not appear as dead navigation before their
workflow exists. Build 3 sends paid-offer actions to a shared BFF-owned,
no-charge checkout page and returns to `/settings`; TableCards must never show
a local dummy-payment selector. In Build 4 the same create-checkout contract may
return the shared mock or Paddle in development and returns Paddle directly in
production.

### Public navigation

The [public shell](../workloads/web/src/layouts/public-shell.tsx) has a brand
link to `/`, How it works/Pricing/FAQ links to landing anchors, a Create cards
link and either Log in or signed-in Projects. Marketing links disappear at
1050px and below. Compact Log in/Projects and Create actions remain available
on phones, including Invitation and policy routes. The shared public footer
links Privacy, Terms and Contact. The signed-in hero offers Open Projects.
Login is shown only after a confirmed signed-out session. Loading shows
Checking session, recovery exposes Retry session, and known users choosing an
account or completing onboarding get Projects rather than a second Login.
The same rule applies to public pricing actions and the new-project header.

### Signed-in application navigation

The [application shell](../workloads/web/src/layouts/application-shell.tsx)
uses a desktop sidebar with Projects, Create, Designs and Account. Account is
a route, not a menu. The sidebar also shows account name, role and Sign out;
the sticky top bar shows account name, page title and a selector when multiple
memberships exist. Team is reached from Account when team access is enabled.
Sign out appears only in the sidebar on desktop, not a second time in the top
bar. No Billing or Support placeholder is present.

At 760px and below the sidebar becomes fixed bottom navigation with the same
four destinations. The top bar retains account context, selector and a visible
Sign out action.

The [new-project route](../workloads/web/src/pages/create-page.tsx) uses that
same application shell once signed in: Create is the active sidebar destination
on desktop and the active bottom-navigation destination on phones. Only the
guest creator retains its public brand/Login header, so import and preview remain
available without authentication. The editor adapts to the width left beside
the sidebar, not just the viewport. Phone Continue/Review and Save/Export/download
actions stay inside their respective step cards and scroll with the content;
only app navigation remains fixed. Disabled creator actions use an opaque muted
treatment. Content reserves bottom-navigation/safe-area clearance, not an extra
floating-action gap. Responsive geometry still requires rendered browser verification.

Browser tabs use the existing terracotta/white TC brand mark. A self-hosted SVG
favicon, PNG fallback and Apple touch icon apply to public and private routes;
this does not add an installable app or change authentication.

Route/creator-step changes still focus the non-interactive heading for screen
reader orientation, but those programmatically focused headings have no border
outline. Buttons, links, inputs and other controls retain visible keyboard focus;
do not remove focus outlines globally.

### Deep links, authentication and editing continuity

Private routes show session loading, sign-in, recovery or account-choice
states before their content. They do not render a private page while signed
out. The landing hero login explicitly returns to Projects. The public header
login returns to Projects on Landing and preserves other public destinations;
private-shell login preserves the exact private path,
query and fragment.

The current [auth defaults](../customer-auth.defaults.ts) create a private
workspace on first sign-in. If onboarding is nevertheless required, both
private-shell and Creator explain automatic setup and offer a session/setup
retry or the existing invitation path. They do not offer forbidden extra-account
creation. Session failures have an explicit retry.

Creator Save/Export and its header Log in preserve the bounded draft before
authentication and return to the current creator destination and step. Drafts
include raw input, validated input/rows, title, design, layout, step and custom
style/reference, never private file URLs or credentials. Anonymous/new drafts
can move into the newly authenticated workspace; saved drafts are keyed by
workspace and project. Drafts remain bounded to one hour/160 KiB and are
retained through ordinary reload. Storage failure has a visible keep-tab-open
warning. Route departure/account switching confirms unsaved discard; logout
clears protected draft keys.

Restored custom artwork is resolved from the current draft's account-scoped
asset reference, not the previously saved design. Loading or unavailable bytes
have an explicit notice and block save/export/complete preview; the app never
silently substitutes catalog artwork. Retry preserves guest, title and style
edits. Private addresses are descriptors only: selected artwork resolves through
authorized bytes, and library thumbnails resolve only near the viewport and
release their byte leases when hidden or unmounted.
If the selected reference is outside the capped library list, an exact
account-scoped lookup resolves it without downloading unrelated files.

An explicit first Save replaces `/create` with `/projects/:projectId`. The
implicit save during a first Export also replaces it once the PDF is ready.
Account switching remounts scoped content through the
[SDK provider](../../../platform/bff/libs/sdk/typescript/src/adapters/convex/client.ts)
and clears the prior editor. Returning a saved-project
route to the new account's Projects is handled by an observer above the keyed
provider, retaining the previous account through its loading transition. A
deterministic component test covers that lifecycle. The hosted Studio journey
proves account isolation from Projects, not every saved-editor switch
interleaving. Invitation acceptance explicitly selects the
joined account and replaces the route with Projects.

## Page requirements and delivered behavior

The requirements below remain accepted intent. Each delivery note describes
the inspected development code and identifies consequential differences.

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

**Delivered:** [Landing](../workloads/web/src/pages/landing-page.tsx) contains
the PDF-only hero, CSS card example, three-step explanation, four pricing
cards and native FAQ disclosures. The first FAQ is open by default. The shared
footer has policy/contact routes with truthful preview-only disclosures.
Paid pricing actions authenticate if necessary, then open
`/settings?offer=<offer>` to start checkout; they are not inert price cards.

### Creator `/create`

The creator remains usable before authentication. Visitors see try-before-sign-in
guidance; authenticated new projects show creation guidance, and saved projects
show an edit heading with unsaved-change guidance. The phone's compact brand
link retains an accessible destination label even when its wordmark is hidden.

Project name is an editable field directly below the creator heading, before
the steps, on phone and desktop. It names both new drafts and saved projects;
it stays visible in Guests, Design and Review. It uses the existing project
title, not a separate event name. Changes mark the draft unsaved; Save project
persists them, and PDF export saves current changes first. The field is disabled
while the project loads, is unavailable or a save/export operation is running.

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
- Let every visitor preview premium designs, but when an authenticated account
  lacks the entitlement, explain that requirement beside the selection and
  point to an included design or the account plan before Save/Export.
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
- Before Save/Export, show known plan blockers such as a premium-design denial
  or exhausted active-project capacity and disable the impossible action. If
  authoritative validation still rejects a request, present the approved
  product reason rather than a generic failure or raw backend envelope.
- Preserve the bounded anonymous draft through sign-in and return to the same
  step.
- After the first save, replace the history entry with the saved-project route
  so refresh/back navigation behaves like an application.

The experimental six-card print layout and its explanatory controls remain
development-only until physically accepted. Production shows only accepted
print formats.

**Delivered:** [Creator](../workloads/web/src/app.tsx) implements pasted lists,
explicit tabular mapping, file upload, realistic example names and eight
displayed import issues. Mapping focuses its first select. Plain-list phone
Continue validates and advances; desktop uses Preview names. The creator-step
buttons can jump directly between steps. Failed mapping stays in Guests with
the mapping and issues visible and does not reuse previously parsed guests.
Save/Export normalize newly typed plain-list input; unconfirmed tabular input
returns to mapping. Canonical mapped text preserves empty optional columns.

All six predefined choices can be previewed; three are Included and three
Premium. Known premium-access and active-project-capacity blockers disable
Save/Export and provide plan or project links. Card-count limits are still
reported by the server on save, rather than proactively disabling the action.
Saved event artwork and AI tools are in Design. A new project first asks the
user to save and reopen; Free can use its AI batch on a saved event, Event Pass
can upload/generate for its event, and professional accounts can also select
reusable presets from Designs. Four generated choices remain secondary to
the deterministic card workflow.
The Creator preset chooser loads 24 account-scoped metadata records at a time,
with Load more presets, page retry and end feedback. Older presets remain
selectable with their snapshotted font, size, color and position.

Review exposes card-sheet page count, sheet pagination and
print-at-100% instructions. Open complete preview uses a bounded native dialog,
with every sheet, Escape/Return to editor and focus restoration. Desktop also
keeps a side preview; phone steps do not stack the full preview inline. Busy,
success/error and saved/unsaved status sit outside hidden phone cards.
Preflight identifies the guest/field for fit or unsupported-character problems
and blocks Save/Export with a correction, rather than showing an empty-input
placeholder. Custom event artwork exposes the accepted constrained name font,
size, position and color controls, including Event Pass.
The first preview is the first card sheet, not a calibration page. The event
name, labelled Project name, remains project metadata/PDF title and is validated
before save/export; it is not added to the printed cards.
The separate development print-test download retains its calibration guide.
An interrupted AI operation is recovered from the server on mount and retried
with its original prompt/key, even after its unit is reserved; a new operation
is not silently substituted. A confirmed failed batch instead releases the
recovery state and allows an edited description with a new operation; an empty
pending query alone is not treated as evidence of terminal failure.

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

**Delivered:** [Projects](../workloads/web/src/pages/projects-page.tsx) uses
responsive project cards, Active/Archived buttons, counts, empty-state Create
actions and a loading line. Cards show title, card count, design kind and update
date; predefined cards currently say Included design even for premium artwork.
Open is available for active projects. Duplicate opens the new copy; Archive
requires a browser confirmation and reloads the current filter; Restore opens
the restored project. Pending actions disable that project's buttons. Capacity
denials come from the server and appear as an alert; Create and Duplicate are
not disabled proactively at the limit. Errors are safely normalized and have a
dedicated Retry projects control. Active lists stay within the accepted
100-project cap. Archived lists use account-scoped 24-row metadata pages with
Load more projects, safe page retry and end feedback, so older archives remain
discoverable/restorable. Switching filters clears the old cards synchronously;
failed loads never masquerade as an empty workspace.

### Saved project `/projects/:projectId`

This route uses the creator workspace with the saved project loaded. It adds:

- project title and saved/unsaved state;
- an editable Project name plus Save and Export actions as permitted;
- recent export status and download action;
- a safe not-found/wrong-account state that never reveals another account's
  project.

Account selection while editing leaves the old account context immediately
and returns to the new account's project home rather than rendering stale
project data.

**Delivered:** [Saved Project](../workloads/web/src/pages/project-page.tsx)
loads the same creator without a separate lifecycle-action banner. Duplicate
and Archive belong on Projects cards, with Restore in the Archived list.
Duplicate makes a reusable copy subject to active-project limits; Archive
preserves the saved project while freeing active capacity. Leaving an unsaved
editor for Projects retains the discard confirmation. Naming is available
above every creator step, including before the first save and after reopening.
Missing/wrong-account loads show a safe notice and Return to Projects, with
editor/lifecycle actions unavailable. Saved/unsaved state is visible. Export
validates and saves the current input before requesting its PDF. Download PDF
belongs to the creator's current state and disappears immediately on edits or
a new save; delayed reads cannot reintroduce an old link while dirty. The
server's latest-export read omits older revisions. These source rules and
component regressions address the original stale-export finding. The fresh
hosted regression and independent review also parsed actual stored PDF bytes
and verified the edited title, duplicate guest multiplicity and absence of old
names.

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

**Delivered:** [Designs](../workloads/web/src/pages/designs-page.tsx) keeps
predefined examples, custom artwork and reusable presets in distinct sections.
The predefined library is informational; selection happens in the creator.
Event Pass is directed to its saved event for uploads; its assets are labelled
event-only and no reusable-preset form appears. Planner Pro/Studio can upload
validated PNG/JPEG artwork, request AI batches, choose reusable assets, and
create or update a preset with Clean sans/Classic serif, three sizes, three
positions and a color. Preset cards preview the editable style in a native
disclosure; Delete requires confirmation. The chosen style is snapshotted on
project save, so later preset changes do not restyle a saved project.

The predefined library now renders all six catalog artwork sources through the
same SVG face renderer as Creator. Event artwork has constrained name controls
in Creator. Designs has loading, empty artwork/preset and retry states;
successes use status and failures use alert with safe product text. AI prompts
must contain 3–400 trimmed characters before a fresh generation. Creator and
Designs both accept an optional company icon/style reference: PNG/JPEG up to
10 MB and 16 megapixels, resized locally to at most 512 pixels per side and
512 KiB, with preview and Remove style image. Preparing an image disables
Generate until ready. Copy explains Cloudflare receives a small style reference,
not the guest list, and exact logo reproduction is not guaranteed. Development
defaults to real Cloudflare artwork; the clearly labelled test-fixture engine
makes no AI calls. A daily cap rejects a new request without consuming an
account batch or inventing a pending retry. Provider failure does not silently
substitute a color fixture. Pending server batches restore the
original prompt/key after navigation/reload and expose Retry this background
batch, rather than generating a fresh charged operation.
Confirmed failures re-enable the description and normal Generate action, while
unknown response failures retain the original operation for recovery. Custom
artwork and preset thumbnails load authorized bytes only when visible; a large
metadata library does not eagerly download every private file.
Artwork and presets each load 24 metadata records per page, with independent
Load more, pending, safe retry and end states. Failed page requests preserve
already loaded choices. Refresh after upload, AI or preset mutation returns to
the newest page and retains an older selected artwork option; repeated IDs are
deduplicated. The page windows do not impose an account-library size limit.

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

**Delivered:** [Account](../workloads/web/src/pages/account-page.tsx) shows four
usage tiles for offer/source, active projects/card limit, remaining AI batches
and lifetime/event/billing-cycle label, and active members/seat allowance with
the current role. Team's usage includes reserved invitation seats; the Account
member tile counts active members only. Access loading appears as Loading… or
dashes rather than a separate blocking page. Read failures appear as alerts.
Owners can edit Workspace name through the server-authorized Save workspace
name action. Renaming silently refreshes that account's authoritative SDK
summary without remounting the page or losing its success message; a later
response cannot reverse an intervening account switch or sign-out.
Legacy unnamed workspaces use meaningful My/Shared workspace
labels rather than raw IDs. View plans opens `/#pricing`; Landing also handles
the older `?section=pricing` destination.
Usage failures expose Retry usage and clear after a successful refresh. Checkout
failures instead expose Retry checkout with the original idempotency key; a
usage refresh cannot silently hide a checkout failure. Rename and Owner-only
permission errors do not offer a misleading usage retry.

A paid `offer` query immediately starts BFF checkout using a tab-stored
idempotency key and displays an opening status. Checkout success/cancel return
messages are shown and the query is replaced with the clean `/settings` route.
Owner-only checkout is checked before starting it, and other members receive
an ask-your-Owner explanation. The backend remains authoritative even if another
role follows a pricing link. A success query is feedback only; the live access read remains
the source of the displayed offer. Subscription cancellation, expiry,
restrictions and remediation are not implemented states here.

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

The first UI exposes a one-time copyable link for manual delivery. Invitation
email remains a later product choice; the support email mechanism does not
automatically decide invitation delivery.

**Delivered:** [Team](../workloads/web/src/pages/team-page.tsx) shows the roster
to Studio members and pending invitations to Owner/Admin only. Non-Studio
direct visits show the Studio requirement. Invitation creation returns a
one-time link in local page state; Copy uses the clipboard or focuses/selects
the input for manual copying. Refresh loses the link, and Reissue revokes the
old invitation before creating a replacement. If replacement creation fails,
the page explicitly says the old link is revoked and no replacement was created,
reloads pending state, and directs creation of a new invitation. The accepted first delivery mechanism is manual
link sharing, with no invitation-email service implemented.

Owner can change another active Member/Admin's role immediately, remove after
confirmation, and start transfer after a confirmation naming the target and
fresh-sign-in requirement and immediate completion finality (former Owner becomes
Admin and loses Owner-only controls). Admin can remove ordinary Members but sees no
role-change or transfer buttons and cannot manage peer Admins/Owner. Member
sees no management controls. Revoke/Reissue act immediately; notices report
results. Ordinary mutations disable shared controls while pending; transfer
startup also disables mutations and reports that completing fresh sign-in
immediately transfers ownership. The
[SDK callback](../../../platform/bff/libs/sdk/typescript/src/server/index.ts)
completes the transfer before returning to Team with refreshed roles. The
shared auth screen's finality copy is reconciled by the same remediation plan;
there is no second TableCards approval page. Its stronger authorization remains governed by
[ADR 0004](../../../docs/architecture/adr/0004-business-customer-auth-and-accounts.md).

The page has loading/retry states and error alerts. The invitation form is
disabled at the currently displayed seat capacity; concurrent/capacity failures
still receive safe server denial. Management availability derives from the signed-in role and
account policy, while the server performs the final permission/invariant checks.

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

**Delivered:** [Invitation](../workloads/web/src/pages/invitation-page.tsx)
publicly inspects the token and shows checking, unavailable and non-pending
states. A pending invitation can show the account's configured display name
without revealing its roster. Invalid inspection groups invalid/expired/
unavailable into one message; a valid non-pending preview shows its state.
Signed-out recipients have Sign in to accept with the exact invitation return
path. Signed-in/onboarding recipients can accept, with a Joining… pending
button and server rejection text for recipient/capacity checks. Success selects
the joined account and replaces the route with Projects. Retry session and Retry
invitation address session and reinspection failures. Back to TableCards is
the general exit. Never copy invitation secrets into documentation or logs.

## Offer-to-interface contract

| Capability                 | Free          | Event Pass                                      | Planner Pro                                         | Studio                                                          | Visible surface           |
| -------------------------- | ------------- | ----------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------- | ------------------------- |
| Cards per project          | 25            | 500                                             | 500                                                 | 500                                                             | Creator, Project, Account |
| Active projects            | 1             | 1 event                                         | 25                                                  | 100                                                             | Projects, Account         |
| Predefined designs         | Three free    | All                                             | All                                                 | All                                                             | Creator, Designs          |
| Uploaded artwork           | No            | Current event                                   | Yes                                                 | Yes                                                             | Creator, Designs          |
| Reusable custom presets    | No            | No                                              | Yes                                                 | Shared                                                          | Designs                   |
| AI background batches      | 1 lifetime    | 2 per event                                     | 10 per verified monthly cycle                       | 30 shared per verified monthly cycle                            | Creator, Designs, Account |
| Members                    | 1             | 1                                               | 1                                                   | Up to 5                                                         | Account, Team             |
| Invitations/roles/transfer | No            | No                                              | No                                                  | Yes, subject to role and account policy                         | Team, Invitation          |
| Paid checkout/status       | Upgrade entry | Shared no-charge mock; live purchase in Build 4 | Shared no-charge mock; live subscription in Build 4 | Shared no-charge mock; live subscription/remediation in Build 4 | Account/Billing           |

An entitlement denial should explain the specific limit and offer an available
next step. It must not silently fail or expose development-offer switching in
production.

The table preserves the accepted offer contract. Current monthly allowances
are no-charge mock renewal, not proof of verified paid cycles. Event Pass's
90-day access and professional cancellation/read-export/deletion-warning
lifecycle remain Build 4. Free and Event Pass AI generation is reached from a
saved project, not the reusable Designs tools. Production deployment is recorded
in the release review; real paid/subscription state is not claimed.

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
  I can name a new draft or rename a saved project above any editor step;
  Save updates that same project, and reload preserves its name.
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

- Signed-out users may use Landing, the anonymous Creator and public invitation
  inspection. Private routes show a sign-in/setup state rather than content.
- Onboarding-required users see the permitted create/join path, not an empty
  application shell.
- Account-scoped pages require a selected active membership.
- Every project, asset, preset and export read/write derives account scope from
  the verified token; route parameters never select authorization scope.
- Account switching remounts account-scoped content before loading the next
  account. A saved-project switch returns to Projects through the unkeyed
  observer described above. The public Creator stays on its own route
  with new scoped state.
- Owner/Admin/Member controls follow BFF permissions, and server authorization
  remains final.
- Offer gates come from BFF effective product access. Pricing copy and local
  catalog metadata do not authorize a feature.
- Mock checkout requires explicit BFF deployment enablement and always states
  that it charges nothing. TableCards contains no payment simulation screen.
- Completing Studio checkout atomically applies its product grant and the
  accepted five-seat, Admin-enabled, invitation-enabled account policy. Hosted
  acceptance must reach Team and create an invitation through that customer
  journey; an operator fixture is not valid evidence.
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

### Delivered composition

Exact breakpoints and layout values live in
[styles.css](../workloads/web/src/styles.css), rather than a second token
catalog in this document.

| Width        | Landing/navigation                                                                  | Creator and account work                                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Above 1050px | Full public header; private sidebar and sticky top bar                              | All three creator cards together with sticky side preview; adaptive project/design/usage grids                                                              |
| 761–1050px   | Marketing header links hidden; private sidebar retained                             | Creator becomes one column with preview above controls; all creator cards remain visible                                                                    |
| 320–760px    | Compact public header; private fixed four-item bottom navigation and sticky top bar | Only the active Guests/Design/Review card is shown; horizontal design chooser; bounded on-demand preview; persistent primary actions; headers/actions stack |

At 430px and below creator actions become full-width, labels/headings stack and
the example-list action moves above the input. Team rows move actions under
identity/role; grids use available-width columns. Bottom navigation accounts
for the safe-area inset. The deliberate horizontal overflow is inside design
and preset choosers, not intended at page level.

The desktop 1280px and phone iPhone 13 test projects plus the 320px hosted
creator case are defined in the [E2E configuration](../e2e/playwright.config.ts)
and [hosted suite](../e2e/src/hosted-development.spec.ts). These sources show
the tested assertions, not verification of every intermediate width. Remediation
adds persistent actions, visible mobile Sign out and compact public auth access;
their rendered geometry remains a hosted gate. There is no modal/drawer editor:
only the supporting complete preview uses a bounded dialog. Import mapping stays
beside input; preset styling uses a disclosure; account/team work stays on routes.

## Visual and interaction choices

The existing app uses a warm paper/stationery composition: ink for text,
paper/mist/cream for surfaces, terracotta for the primary create/save/export
action and focus treatment, sage/forest for selected navigation and artwork,
and separate error/success/info notice colors. Notices also carry text and
semantic roles; color alone is not the message. Exact roles and values remain
in [styles.css](../workloads/web/src/styles.css).

Georgia/Times-style serif headings and the brand suggest stationery; body,
form and navigation text starts with bundled Noto Sans and system fallbacks. Guest-list input
uses monospace for copied rows. UI typography is separate from printable card
typography: the constrained preset choices are Clean sans and Classic serif,
with renderer responsibilities in [layout.ts](../libs/core/src/layout.ts) and
[pdf.ts](../libs/core/src/pdf.ts). Browser preview and hosted PDF use bundled
reviewed Noto Sans/Noto Serif. Browser preflight uses generated checked advances
from those same pinned fonts; the server repeats the bounded common-Latin NFC
validation and uses actual embedded metrics. Kerning and discretionary ligatures
are disabled in both renderers. Stored names are not changed; remaining
combining marks fail explicitly. Font bytes/provenance and supported Latin
behavior are tested, not inferred from the UI font stack alone.

Printable names use a shared automatic one/two-line policy, not another UI
control. Keep a single line if it fits at the chosen size or within a 15%
reduction; otherwise prefer a balanced two-line word split before shrinking
further. Preserve compound surnames where possible, keep nonbreaking text intact
and never truncate. Each line is independently centered; the whole block remains
near the chosen position while clearing card edges and table/meal details.
Both folded faces and PDF/SVG use the same commands. The example action loads
six mixed short/medium/accented/long names, with only one extreme name among the
first four; the input hint includes a long name too. Existing projects re-render
with this policy without changing their stored guest strings.

Public pages favor large headings, representative card artwork and short
sections. Private pages favor task cards, compact action groups, selected-state
navigation, usage tiles and lists. Rounded paper panels, pill-shaped primary
buttons and consistent outlined secondary/file actions are reused by CSS
classes. Feedback and confirmation currently use notices, disabled pending
controls and native browser confirmations, rather than a separate dialog
system. Supporting preview uses a native modal dialog. Creator, Designs and Team
distinguish alert/error from status/success/info and share safe error treatment.

Use the existing terms Projects, Create, Designs, Account, Team, event artwork,
reusable preset and AI background batch. Preserve the PDF-only/independent-print
message and make AI a supporting choice. The six predefined backgrounds and
Included/Premium labels come from the
[design catalog](../libs/core/src/catalog.ts). The creator preview and PDF use
the catalog artwork, as does the Designs predefined library. No new logo, palette, artwork,
component library or separate design-system document is selected by this
reconciliation.

Native links, buttons, labels, select controls, disclosures and confirmations
support ordinary keyboard behavior. Active designs use `aria-pressed`, the
mobile step uses `aria-current`, navigation uses named landmarks, errors/status
use alert/status where implemented, and mapping explicitly moves focus to its
first select. Focus-visible and reduced-motion styles exist, along with skip
links, route-heading/step focus handoff and native modal return focus. Creator
announcements are outside hidden phone steps. Full contrast,
keyboard journey and assistive-technology behavior remains to be reviewed;
one Tab assertion is not an accessibility audit.

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

The accepted journeys use a few end-to-end scenarios with shared setup, not
one test per button or a Cartesian product. They remain the acceptance target;
the evidence notes below distinguish current assertions from unproved behavior.

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
   without desktop-section stacking; Free premium-selection denial remains
   visible, actionable and free of horizontal overflow.
7. **Production boundary:** production bundle/routes contain no development
   offer or deterministic provider entry, and signed-out/private routes fail
   safely.

Fast unit/Convex tests continue to own complete permission, concurrency,
capacity, expiry, replay, account isolation, project-limit and unit-accounting
decision tables.

### Promise, workflow, enforcement and evidence

| Accepted stories   | Visible workflow                                                                                                    | Server boundary                                                                                                                                                              | Existing executable evidence and limit                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-01–04, US-19–20 | Landing → import/mapping → design → Review → sign-in return → export and primary navigation                         | Shared BFF session/account scope; core import/render validation                                                                                                              | [Public story](../e2e/src/user-stories.spec.ts), [hosted creator cases](../e2e/src/hosted-development.spec.ts), [draft tests](../workloads/web/src/draft.test.ts) and [independent rendered review](reviews/261006-tablecards-remediation-app-review.md); auth-return/reload, bounded preview, mobile primary-action geometry and basic focus are verified. Full accessibility conformance is not.        |
| US-05–10           | Selected account's project home, lifecycle actions, Free/card/design denials, event upload and PDF                  | [Offer actions](../backend/convex/productAccess.ts), [projects](../backend/convex/projects.ts), [exports](../backend/convex/exports.ts) and account-owned assets             | [Free/Event story](../e2e/src/user-stories.spec.ts), [hosted fidelity/private-byte regressions](../e2e/src/hosted-development.spec.ts), [project tests](../backend/convex/projects.test.ts), [export tests](../backend/convex/operations.test.ts); actual edited title/guest multiplicity, old-name absence and authenticated/revoked file delivery are checked. Physical print accuracy is not inferred. |
| US-11–12           | Professional Designs → upload/AI → four choices → preset create/update/delete → creator reuse; Account balance      | Validated [assets](../backend/convex/assets.ts), [presets](../backend/convex/designPresets.ts), [AI operation](../backend/convex/ai.ts) with BFF unit reserve/commit/release | [Professional story](../e2e/src/user-stories.spec.ts), [preset tests](../backend/convex/designPresets.test.ts), [operation tests](../backend/convex/operations.test.ts); development provider failure returns its unit, not a new live-provider benchmark                                                                                                                                                 |
| US-13–18           | Studio checkout → Team → copy/reissue → recipient accept → account switch → fixed-role actions → protected transfer | Shared BFF role/policy, invitation, seat/capacity, same-principal transfer proof and account isolation                                                                       | [Studio story](../e2e/src/user-stories.spec.ts), [account lifecycle tests](../../../platform/bff/service/convex/accountLifecycle.test.ts), [account HTTP tests](../../../platform/bff/service/convex/accountHttp.test.ts), [transfer tests](../../../platform/bff/service/convex/ownershipTransfers.test.ts); broader denials live in server tests, not every visible error state                         |

The [coverage registry](../e2e/src/support/coverage.ts) assigns all twenty
stories. Assignment is traceability, not evidence that every clause of a
story is satisfied. The original source reconciliation did not rerun the suite;
the [remediation acceptance](reviews/261006-tablecards-remediation-and-development-acceptance.md)
now records actual edited-PDF content/private-byte regression checks and a
complete fresh 27-case run. Remaining limits in the table are not silently
treated as passed.

The original [2026-10-06 hands-on review](reviews/261006-tablecards-app-review.md)
confirmed edited-preview/PDF mismatch, missing mobile Sign out and saved-route
account-switch navigation, among other findings. Its fresh browser/PDF evidence
is preserved separately from the earlier passing registry. Its findings are
resolved in the [successor application review](reviews/261006-tablecards-remediation-app-review.md)
within the declared development boundary.

### Remediation evidence and remaining verification

The original 2026-10-06 findings remain in the dated review. Their UI remedies
above have focused local evidence in [Creator tests](../workloads/web/src/creator.test.tsx),
[account navigation tests](../workloads/web/src/auth-navigation.test.tsx),
[Designs tests](../workloads/web/src/pages/designs-page.test.tsx) and the bounded
[draft tests](../workloads/web/src/draft.test.ts). Tests inspect calls/state and
actual SVG artwork references; they are not rendered-browser or PDF-content proof.

- Hosted validation passed all 27 configured cases, including actual edited
  stored PDFs, authentication/draft continuity, private-file denials and
  customer workflows in both browser profiles. The independent rendered review
  also checked saved-route/current-artwork restoration, mobile persistent-action
  and dialog geometry, workspace feedback, navigation and basic keyboard focus.
- Full keyboard, contrast, announcements and assistive-technology behavior
  remain bounded review work. Focus/alert improvements do not constitute a full
  accessibility audit.
- Export polls for about 45 seconds; AI for about 60 seconds. These are pending
  windows, not latency promises. Unfinished AI batches are recoverable using the
  same durable operation, and file download authorization is enforced by the
  coordinated backend/adapter work.
- Preview disclosures are factual development surfaces, not commercial/legal
  sign-off. Andrew accepted his earlier print as sufficient for Build 3 on
  2026-10-07; detailed physical scale/margin checks remain a final MVP pre-launch
  gate, not a Build 3 blocker. The no-charge production release is separately
  evidenced; verified billing/lifecycle, later support and paying-customer
  launch remain distinct delivery boundaries.

## Delivery sequence

1. Introduce routing, public/application shells and route-level lazy loading;
   preserve the current working creator behavior while extracting it.
2. Implement the phone step workflow and desktop creator workspace, including
   draft restoration, route-safe unsaved state and on-demand complete preview.
3. Build Projects and saved Project pages; expose archive/restore and implement
   entitlement-safe duplication.
4. Build Designs and the missing reusable-preset operations.
5. Build Account plan/usage presentation and route paid offer choices through
   the provider-neutral shared BFF checkout.
6. Add typed account-management SDK operations, Team and Invitation pages, and
   connect protected ownership transfer.
7. Add the focused browser scenarios, accessibility checks and remaining
   negative upload/provider/offer cases.
8. Deploy development, complete agent-owned browser/review gates and reconcile
   every pricing claim against the delivered UI before production planning.
   Andrew's additional usability review is optional; physical printing and
   personal provider/seller verification remain distinct when applicable.

Build 4 keeps the checkout interface but adds Paddle selection, verified
webhooks, paid-through renewal, subscription status and billing remediation
without redesigning these pages. Development may select Paddle or mock;
production returns Paddle directly. Build 5 adds Support to the existing
application shell. Build 6 expands the separate operator backoffice and
monitoring rather than mixing operator controls into TableCards customer
settings.

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
  invitation delivery remains a later choice; support has its own required
  two-way email workflow.
- Archived projects are restorable and do not count toward active-project
  limits while archived.

## Document history

| Date       | Status                                      | Change                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-28 | Proposed — pending Andrew's review          | Initial application PRD created from the Build 3 mobile and missing account/team UI review. No implementation begun.                                                                                                                                                                                                                                                                                  |
| 2026-09-28 | Accepted — implemented in development       | Andrew accepted the recommendations. The routed application, product workflows and shared team surface were implemented and deployed to development; production remains unchanged.                                                                                                                                                                                                                    |
| 2026-09-28 | Accepted — corrected in development         | A real-phone failed-save report added proactive premium-design and active-project-capacity guidance plus safe structured product-error presentation.                                                                                                                                                                                                                                                  |
| 2026-10-06 | Accepted — reconciled with development      | Retained this document as the Business-local application source; inspected `b5aeae3` routes, components, styles, server guards and existing test assertions. Recorded actual navigation/composition/design choices and consequential gaps without changing accepted offers, runtime code or production.                                                                                               |
| 2026-10-06 | Accepted — remediation source implemented   | Implemented the authorized review plan from `3a948ad`: current-input saves/export, dirty downloads, drafts/auth return, unkeyed account-switch navigation, phone actions/preview/exit, artwork parity, safe notices/retries, Event Pass styling, Owner workspace naming and preview policies/fonts. Local component/type/lint gates passed; deployment and independent hosted review remain separate. |
| 2026-10-06 | Accepted — development remediation verified | Runtime `a914da0` deployed with exact health/font evidence. Fresh hosted acceptance passed 27 cases (17 Chromium, 10 mobile WebKit); independent app/security/readiness review and focused 92 web/57 SDK/40 core checks are recorded in the remediation evidence. Earlier failed reviews remain history; production is unchanged and user usability review is optional.                               |
| 2026-10-08 | Accepted — editor simplification            | Andrew requested clear project naming and Astra reviewed lifecycle placement. Keep Duplicate/Archive on Projects cards, remove the editor banner, and expose the existing title as Project name above all steps with explicit saving and load/busy guards. No schema or API changes.                                                                                                                  |
