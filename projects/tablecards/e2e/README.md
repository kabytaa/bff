# TableCards hosted development acceptance

This project drives the deployed TableCards development surfaces through the
real BFF development-auth handoff, same-site gateway, TableCards Convex backend,
server-generated PDF export, development offer projection and deterministic AI
provider. Normal regression explicitly chooses the no-inference fixture engine;
it never uses Google, OpenAI or a real payment provider.

Run after all development surfaces are deployed:

```bash
pnpm test:e2e:tablecards-hosted
```

The local development signing key remains outside Git. Production cannot trust
these grants. For the same
reason, this hosted suite is deliberately separate from the self-contained
`pnpm check` CI gate; CI never receives the development signing key.
Artifacts go to this project's ignored `test-results/`, separate from local
browser suites so concurrent validation cannot delete hosted traces.

## Focused Operator work development checks

```bash
pnpm exec nx run tablecards-e2e:e2e-operator-work
```

This separate desktop/phone suite checks anonymous whole-site helper mock answers,
customer-clicked registered links, keyboard/focus/containment, synthetic hosted
development sign-in, explicit contact/general feedback and invalid survey links.
It makes no payment or paid artwork/model call. It requires the development
Operator configuration and explicitly labelled mock AI/mail modes. Trace,
screenshots and video are disabled so auth grants cannot enter artifacts; request
assertions retain only booleans, never tokens/capabilities. The ordinary hosted
configuration excludes this suite. Mock passes do not verify live model quality,
email delivery or a real active survey invitation.
Focused artifacts use `operator-work/test-results/`, outside the legacy hosted
suite's cleanup directory. Representative manual captures must contain only
synthetic/anonymous UI and never an auth page, grant, cookie or capability.

### Deliberate live helper check

After provider caps have been independently configured/read back and the
development backend is in live mode, with explicit model-spend authority:

```bash
TABLECARDS_TEST_LIVE_HELPER=true pnpm exec nx run tablecards-e2e:e2e-operator-live
```

The separate desktop/phone checks verify a real printing answer and a browser
FAQ tool/result continuation, customer-clicked navigation and explicit feedback.
The Gemma/Jev checkpoint also checks an explicitly prepared synthetic incoming
email's live model/selector trace and saved draft, opens its exact operator
review and verifies no substantive reply delivery exists without Send. Set
`BFF_LIVE_SUPPORT_CASE_SUBJECT` to its exact `Synthetic Gemma-Jev checkpoint ...`
subject after sending one authorized email to the development mailbox. Both
device checks reuse that case; they do not send mail or create new support runs.
Development signup remains `.invalid`-only. Never weaken that guard or send
live receipt messages to fake recipients merely to make the browser test pass.
It refuses mock/unverified-cap backend modes before any model request, aborts
after six helper HTTP requests per device, disables retries/traces/video, and never
intercepts an allowed request with a synthetic response. It is excluded from
ordinary CI and hosted regression. This is a bounded integration smoke, not a
replacement for the full Business evaluation set or real email round trip.
Explicit synthetic chat/draft screenshots stay ignored under
`.playwright-cli/` for rendered inspection; no auth page or browser state is saved.
Draft captures include only the message editor, not customer identity or opaque
reply/feedback routing values created during review.

`src/support/coverage.ts` is the executable acceptance registry for PRD stories
US-01 through US-20. Four cohesive story journeys run in desktop Chromium and
mobile WebKit and cover public creation/import/authentication, Free and Event
Pass projects, Planner Pro and Studio mock subscriptions, reusable and
event-scoped artwork, AI reservation behavior, navigation, account isolation,
member invitations/roles/removal and protected ownership transfer. A separate
CSV browser case and the coverage-registry assertion run in both devices as
well.

Seven focused legacy regression cases continue to run in desktop Chromium for
the public print-test PDF, 320-pixel containment, anonymous draft restoration,
stored PDF bytes, Free access guidance, professional project/preset/AI behavior
and Studio invitation acceptance. Ten remediation journeys on each device
additionally inspect actual edited PDF title/guest multiplicity,
unauthenticated and post-logout private byte denial, policy/design/navigation
actions, explicit fit failures and the paid 500-card ceiling with embedded
fonts. Together the hosted command configures 41 cases: 24 desktop and 17 mobile,
including one intentionally skipped manual AI case per device. Normal regression
therefore executes 39 cases without paid inference.
The Studio owner and member contexts both inherit the selected desktop/mobile
device settings. The creator checks keep the whole page within
phone and desktop viewports while allowing only the design carousel to scroll
horizontally.

The manual AI test is an automated browser check that an operator deliberately
starts; it calls the real Cloudflare provider, not fixtures. "Manual" describes
how the run is triggered, not manual execution of each browser step.

Only with explicit provider-spend authority and available daily budget:

```sh
TABLECARDS_TEST_MANUAL_AI=true pnpm exec playwright test \
  --config projects/tablecards/e2e/playwright.config.ts \
  projects/tablecards/e2e/src/manual-ai.spec.ts
```

This makes two four-image batches total: desktop text-only artwork and mobile
company-style reference preparation/removal/generation. It verifies actual image
pixels, stored choices, one unit consumed and signed-in route navigation. The
deployment-wide safety budget applies ($1/day, up to 138 starts in development). Ordinary CI/regression must not
set this flag or spend AI credits; see [Operations](../docs/operations.md#cloudflare-ai-budget-and-reference-images).

The Studio journeys complete the shared BFF checkout through the visible UI;
completion atomically applies the five-seat/Admin/invitation policy alongside
the product grant. They do not use an operator-policy fixture to bypass that
customer workflow. `$5`, `$9/month` and `$19/month` activation is an
explicit no-charge development provider simulation. Live Paddle checkout,
webhooks, failed renewal and subscription remediation remain Build 4 and are
never implied by this suite.

## Production public smoke

```sh
pnpm exec playwright test --config projects/tablecards/e2e/playwright.production.config.ts
```

This isolated configuration runs six public cases (three journeys on Chromium
and mobile WebKit). It checks pricing, guest input/preview, absent dev controls,
policies, containment and the production TableCards-branded Google handoff.
It does not import development grants, use customer credentials, issue a charge
or generate AI. It stops before Google authentication, so it does not establish
a fresh production authenticated export/checkout/team journey. Its artifacts
remain ignored under `test-results/production`; do not commit cookies or traces.
