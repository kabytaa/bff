# Business Factory — BFF MVP Architecture

## Core idea

**BFF = Business Factory Foundation.**

BFF is the reusable business platform shared by all products created through the Business Factory.

Each business idea is a **Business Project**.

A Business Project can contain any number of technical components:

- web application
- mobile application
- backend
- worker
- scheduled job
- internal admin UI
- landing page
- Remotion project for ads
- Remotion project for tutorials
- documentation
- infrastructure/configuration
- project-specific libraries

There is deliberately **no assumption that every project has the same technical structure**.

For example:

- one project may be only a React website + BFF
- another may use React Native + Convex
- another may use Next.js + PostgreSQL
- another may have no custom backend at all
- another may have web + mobile + Remotion marketing videos
- another may use a completely different backend technology

BFF provides the reusable **business capabilities**.

The individual Business Project chooses the technology needed for its actual product.

---

# Terminology

We should be precise because words such as “app” and “project” are overloaded.

## Business Project

A business/product idea being tested.

Examples:

```text
bedtime-stories
invoice-assistant
chess-trainer
```

A Business Project contains **everything related to that business idea**.

---

## Workload

An independently executable or deployable piece of software belonging to a Business Project.

Examples:

```text
web
mobile
api
worker
admin
remotion-ads
remotion-tutorials
```

These may also technically be Nx projects, but in Business Factory documentation we should call them **workloads** when discussing architecture.

---

## Project Library

Code reusable **inside one Business Project**.

For example:

```text
projects/bedtime-stories/libs/domain
projects/bedtime-stories/libs/ui
```

These libraries should not automatically become global Business Factory libraries.

---

## Shared BFF Library

Code intentionally reusable across multiple Business Projects.

Examples:

```text
bff-sdk
bff-contracts
bff-auth-client
```

Promotion from project-specific code into shared BFF code should be deliberate.

---

# Repository architecture

The Business Factory uses **one Nx monorepo**.

The repository should be organized primarily around **business ownership**, not technical type.

Instead of:

```text
apps/
  app-a
  app-b
  service-a
  service-b
```

we group everything belonging to one business together.

A possible structure:

```text
business-factory/
│
├── platform/
│   └── bff/
│       ├── service/
│       ├── backoffice/
│       │
│       ├── libs/
│       │   ├── sdk/
│       │   ├── contracts/
│       │   ├── auth/
│       │   ├── billing/
│       │   ├── analytics/
│       │   └── config/
│       │
│       └── docs/
│
├── projects/
│   │
│   ├── idea-001/
│   │   ├── README.md
│   │   ├── project.yaml
│   │   │
│   │   ├── docs/
│   │   │   ├── product/
│   │   │   ├── architecture/
│   │   │   ├── marketing/
│   │   │   ├── analytics/
│   │   │   ├── runbooks/
│   │   │   └── decisions/
│   │   │
│   │   ├── workloads/
│   │   │   ├── web/
│   │   │   ├── mobile/
│   │   │   ├── api/
│   │   │   ├── worker/
│   │   │   ├── remotion-ads/
│   │   │   └── remotion-tutorials/
│   │   │
│   │   ├── backend/
│   │   │   └── convex/
│   │   │
│   │   ├── libs/
│   │   ├── infra/
│   │   ├── assets/
│   │   └── scripts/
│   │
│   └── idea-002/
│       └── ...
│
├── tools/
│   ├── codex-skills/
│   └── scripts/
│
├── docs/
│   ├── factory/
│   └── architecture/
│
├── nx.json
└── package.json
```

This is an example structure, not a requirement that every folder exists.

A tiny project may simply contain:

```text
projects/simple-calculator/
├── README.md
├── project.yaml
├── docs/
└── workloads/
    └── web/
```

Another project might be:

```text
projects/bedtime-stories/
├── README.md
├── project.yaml
│
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── marketing/
│   └── analytics/
│
├── workloads/
│   ├── web/
│   ├── mobile/
│   ├── remotion-ads/
│   └── remotion-tutorials/
│
├── backend/
│   └── convex/
│
├── libs/
│   ├── story-domain/
│   └── characters/
│
└── assets/
```

A third project might use a completely different stack:

```text
projects/data-tool/
├── docs/
│
├── workloads/
│   ├── web/
│   └── api/
│
├── backend/
│   ├── postgres/
│   └── migrations/
│
└── infra/
```

The repository structure should reflect reality rather than force every idea into the same template.

---

# Project isolation

A Business Project should feel like its own small repository living inside the monorepo.

Everything specific to that business should normally live under:

```text
projects/<project-name>/
```

This includes:

- product documentation
- technical documentation
- marketing plans
- analytics specifications
- infrastructure
- media generation
- project-specific libraries
- workloads
- tests
- scripts

This makes it easy for both humans and Codex to answer:

> “Show me everything related to Bedtime Stories.”

without searching through unrelated global folders.

---

# Project manifest

Each Business Project should probably have a small machine-readable manifest.

For example:

```yaml
id: bedtime-stories
name: Bedtime Stories

status: validating

bff:
  projectId: proj_xxx

workloads:
  web:
    path: workloads/web
    productionUrl: https://example.com

  mobile:
    path: workloads/mobile

backend:
  type: convex
  path: backend/convex

analytics:
  provider: posthog

payments:
  provider: paddle
```

The exact format can evolve.

The purpose is not to build a configuration framework.

It gives Codex and tooling a predictable place to discover:

- what the project is
- which workloads exist
- which technologies it uses
- URLs
- integration identifiers
- current lifecycle state

---

# Project documentation

Each Business Project owns its own documentation.

Example:

```text
docs/
├── product/
│   ├── idea.md
│   ├── target-user.md
│   ├── validation-plan.md
│   └── pricing.md
│
├── architecture/
│   ├── overview.md
│   ├── web.md
│   ├── mobile.md
│   └── backend.md
│
├── marketing/
│   ├── positioning.md
│   ├── channels.md
│   ├── campaigns.md
│   └── creatives.md
│
├── analytics/
│   ├── events.md
│   └── funnels.md
│
├── decisions/
│   └── ADR-001-use-convex.md
│
└── runbooks/
    ├── deployment.md
    └── troubleshooting.md
```

Only folders actually needed by the project should exist.

The point is **separation and discoverability**, not bureaucracy.

For a one-day experiment there may only be three small Markdown files.

---

# Nx boundaries

Nx should help enforce ownership boundaries.

Conceptually:

```text
project:idea-001
    ↓ can use
project:idea-001 libraries

project:idea-001
    ↓ can use
BFF public SDK/contracts

project:idea-001
    ✕ must not use
project:idea-002 internals

project:idea-001
    ✕ must not use
BFF service internals
```

Projects should communicate with BFF through stable public contracts.

A product workload should **not** import the implementation of:

- BFF billing
- BFF database
- BFF authentication internals
- another Business Project

Nx tags can eventually enforce rules such as:

```text
scope:bff
scope:idea-001
scope:idea-002

type:workload
type:lib
type:contract
```

We don't need to overengineer the lint rules immediately, but the architectural boundary should exist from the start.

---

# Technology independence

BFF must not force Business Projects to use the same product technology.

This is important.

For example, BFF itself might use one backend technology while a Business Project uses another.

An idea could use:

```text
React
+
Convex
+
BFF
```

Another:

```text
React Native
+
Supabase
+
BFF
```

Another:

```text
Next.js
+
PostgreSQL
+
BFF
```

Another:

```text
Static React site
+
BFF
```

The BFF SDK/API is the stable integration point.

Business Projects should not care how BFF stores its own data.

Likewise, BFF should not care how a product stores its product-specific data.

---

# What belongs in BFF versus the Business Project

The simplest rule is:

> If the concept exists because we run a software business, it probably belongs in BFF.

> If the concept exists because of what this particular product does, it belongs in the Business Project.

For example:

### BFF

```text
User
Account
Membership
Subscription
Payment
Entitlement
Traffic source
Project
Environment
Business event
```

### Bedtime Stories project

```text
Child profile
Story
Character
Story chapter
Bedtime preferences
```

### Chess Trainer project

```text
Chess position
Game
Move
Puzzle
Training session
```

BFF should never need to understand a `Story` or a `ChessMove`.

---

# BFF responsibilities

BFF should contain capabilities that are common across almost every software business and difficult or expensive to retrofit later.

## Business Projects

BFF has its own representation of every Business Project.

For example:

```text
projects
project_environments
project_domains
project_config
```

Every relevant BFF entity should be correctly scoped to a Business Project.

---

# Identity and accounts

This should be designed properly in the first version.

Core concepts should include:

```text
users
accounts
account_memberships
projects
```

A user can participate in multiple accounts.

An account can contain multiple users.

A particular Business Project may expose only single-user accounts today, but the underlying model should not assume this forever.

Conceptually:

```text
User
  ↓
AccountMembership
  ↓
Account
```

Membership can contain:

- role
- permissions
- invitation state
- metadata

Accounts should normally be scoped to a Business Project.

For example:

```text
Bedtime Stories
    Account A
        Andrew
        Wife

Business Tool
    Account B
        Andrew
        Employee 1
```

The same person may therefore participate differently in different businesses.

---

# Authentication

BFF should provide reusable identity and authentication infrastructure.

The individual product decides what UX it exposes.

For example:

```text
Project A
Google login

Project B
Anonymous usage → login after purchase

Project C
Email magic link
```

All of these can eventually map into the same BFF identity/account model.

The product should not need to invent its own core user/account database.

---

# Billing

Billing belongs primarily to BFF.

The initial payment provider is **Paddle**.

BFF should represent concepts such as:

```text
billing_customers
products
prices
subscriptions
transactions
entitlements
payment_provider_events
```

Billing should generally attach to an **account**, not directly to a user.

Provider-specific information should be isolated from the rest of the platform.

For example:

```text
Account
    ↓
Subscription
    ↓
Price
    ↓
Paddle provider reference
```

The product should generally ask BFF:

```text
Does this account have entitlement X?
```

rather than:

```text
What does Paddle say?
```

Webhook handling must be idempotent.

---

# Entitlements

Entitlements should separate product capabilities from payment implementation.

For example:

```text
bedtime_stories.generate_story
bedtime_stories.unlimited_children
bedtime_stories.premium_characters
```

An application could ask:

```ts
await bff.entitlements.has(
  accountId,
  "bedtime_stories.generate_story"
);
```

BFF determines why the entitlement exists.

It could come from:

- subscription
- one-time purchase
- trial
- promotional grant
- manual backoffice override

This keeps application code independent from pricing mechanics.

---

# Analytics

BFF should define the standard **business analytics context**.

It should not attempt to recreate PostHog.

There are two useful categories.

## Product analytics

High-volume interaction data such as:

```text
button clicked
screen opened
story generation started
story generation finished
```

These can live primarily in PostHog or another analytics provider.

## Canonical business events

Important cross-project events such as:

```text
visitor_created
signup_completed
account_created
checkout_started
payment_completed
subscription_started
subscription_cancelled
```

BFF should understand these because they matter to the Business Factory itself.

---

# Standard analytics context

Events should carry a consistent context where available:

```text
projectId
environment
anonymousVisitorId
sessionId
userId
accountId
eventName
timestamp

utmSource
utmMedium
utmCampaign
utmContent
utmTerm

referrer
landingPage

properties
```

Project-specific properties remain flexible.

---

# Acquisition attribution

Acquisition tracking is part of MVP.

The reusable lifecycle should support:

```text
Traffic
   ↓
Anonymous visitor
   ↓
Session
   ↓
User
   ↓
Account
   ↓
Payment
```

So we can answer questions such as:

```text
Which Reddit post created this account?

How many users from campaign X signed up?

Which source generated paying accounts?

What did this campaign cost versus revenue?
```

Actual ad execution can remain manual initially.

Traffic can come from:

- Reddit
- Google Ads
- Meta
- SEO
- communities
- direct outreach
- links
- influencers
- anything else

BFF's job is to make that traffic measurable.

---

# BFF SDK

Business Projects interact with BFF through a stable SDK.

Conceptually:

```ts
bff.auth
bff.accounts
bff.billing
bff.entitlements
bff.analytics
bff.projects
bff.config
```

The SDK hides:

- transport/API mechanics
- authentication tokens
- BFF identifiers
- analytics context
- provider-specific payment details
- repetitive error handling

The SDK should remain usable regardless of whether the consuming workload is:

```text
React
Next.js
React Native
Node
Remotion
```

Where platform-specific SDK variants are needed, they can share common contracts.

---

# BFF Backoffice

BFF has a central backoffice.

The backoffice should provide a view across all Business Projects.

## Projects

For every project:

- status
- workloads
- domains
- environments
- integrations
- launch date

## Users and accounts

- users
- accounts
- memberships
- project association

## Billing

- subscriptions
- payments
- revenue
- entitlement state

## Acquisition

- visitors
- traffic source
- campaigns
- conversion

## Analytics

- signups
- activation
- important business events
- basic funnels

The MVP backoffice does not need polished UX.

Its purpose is to make the whole factory visible.

---

# Product-specific marketing assets

Marketing implementation belongs primarily to the Business Project.

For example:

```text
projects/idea-001/workloads/remotion-ads
projects/idea-001/workloads/remotion-tutorials
```

This is valuable because marketing assets often depend heavily on product-specific:

- branding
- screenshots
- messaging
- UI
- demonstrations
- target audience

A Remotion ad generator for Bedtime Stories should not automatically become global infrastructure.

If later we discover reusable patterns, we can extract shared libraries such as:

```text
shared-remotion-components
shared-video-branding
shared-ad-layouts
```

but only after actual reuse appears.

---

# Codex

Codex is responsible for creating and modifying Business Projects.

BFF itself does **not** generate applications.

Instead, Codex gets a Business Factory skill describing how the repository works.

For example, when asked:

```text
Create a new project called calorie-photo.
It should be a mobile-first web app.
Use Convex for product data.
Use BFF for auth, accounts, analytics and payments.
```

Codex should know to create approximately:

```text
projects/calorie-photo/
├── README.md
├── project.yaml
│
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── marketing/
│   └── analytics/
│
├── workloads/
│   └── web/
│
├── backend/
│   └── convex/
│
└── libs/
```

If instead we say:

```text
Create a React Native app with a small Node API
and Remotion ads.
```

Codex might create:

```text
projects/example/
├── workloads/
│   ├── mobile/
│   ├── api/
│   └── remotion-ads/
│
├── docs/
└── libs/
```

The skill teaches conventions.

It should not impose unnecessary technologies.

---

# Codex Business Factory skill

The skill should eventually cover:

1. Understand the requested business/project.
2. Create the Business Project folder.
3. Create `project.yaml`.
4. Create only the documentation folders actually needed.
5. Choose/create required workloads.
6. Apply Nx tags and boundaries.
7. Integrate the BFF SDK.
8. Register the project with BFF.
9. Configure analytics.
10. Configure acquisition tracking.
11. Add authentication if required.
12. Add billing if required.
13. Configure deployment.
14. Document important architectural decisions.

The skill can evolve as we build more products.

---

# First Business Project

The first project should be intentionally tiny.

We should avoid spending serious engineering effort on the idea itself.

Its job is to prove the factory.

It needs enough functionality to exercise:

- deployment
- BFF integration
- user/account lifecycle
- analytics
- acquisition
- payments
- real traffic

The business idea may fail completely.

That is acceptable.

The reusable foundation is what we are validating.

---

# Second-project reuse test

Before declaring the MVP complete, Codex should create a second Business Project skeleton.

It does not need real users or a real launch.

Ideally it should be **technically different** from the first project.

For example, if project #1 is:

```text
React web
+
Convex
```

the reuse test could be:

```text
React Native
+
different/no product backend
```

This provides a stronger test that BFF is actually reusable rather than merely extracting the architecture of the first application.

The second project should require primarily:

- product-specific code
- project configuration
- product-specific infrastructure

It should **not** require redesigning BFF.

---

# MVP Definition of Done

The Business Factory MVP is complete when:

**BFF exists as a well-engineered reusable service, SDK and backoffice inside the Nx monorepo.**

The architecture supports:

- multiple Business Projects
- users
- accounts
- memberships
- authentication
- payments
- subscriptions
- entitlements
- analytics
- acquisition attribution

Business Projects are cleanly separated in the repository.

Each project can independently choose:

- frontend technology
- mobile/web
- backend technology
- database
- media tooling
- infrastructure

One intentionally tiny real Business Project is running in production.

It has:

- a real public product
- real external traffic
- acquisition attribution
- analytics
- production payment capability
- BFF integration

Codex understands the repository conventions and can create new projects using the Business Factory skill.

A second project with a different shape can be created without requiring architectural changes to BFF.

At that point, launching project #2 should mostly involve:

> building the unique product and marketing experiment rather than rebuilding business infrastructure.

---

# Explicitly Post-MVP

These should not block the first Business Factory MVP:

- automated ad-platform campaign creation
- automated marketing content strategy
- sophisticated A/B platform
- full CRM
- advanced support system
- referral platform
- generic email-marketing platform
- advanced BI
- advanced financial reporting
- automatic technology selection
- BFF-driven application generation
- sophisticated deployment orchestration
- polished backoffice UI

They can be built once real repetition proves they are valuable.

---

# High-level MVP work areas

The implementation should roughly break down into:

1. **Nx monorepo and project-isolation conventions**
2. **BFF architecture and durable data model**
3. **BFF service**
4. **Projects, users, accounts and authentication**
5. **Billing and entitlements**
6. **Analytics and acquisition attribution**
7. **BFF SDK**
8. **BFF backoffice**
9. **Infrastructure, domains and deployment**
10. **Codex Business Factory skill**
11. **First tiny Business Project**
12. **Production launch and real traffic**
13. **Second-project reuse test**

These are deliberately large work areas.

They should be broken into implementation tasks only when we actually start working on that area.