# Brainstorm: Domain Strategy

> **Status**: Active
> **Created**: 2026-09-26
> **Last updated**: 2026-09-26
> **Repository baseline**: `b754169e9144a437b99dcd7c8aae655a09aa00db`

## Context Snapshot

- Build 1 Foundation was locally complete but not hosted when this exploration began. The backoffice had a Cloudflare Workers Static Assets configuration, while the BFF used Convex-generated deployment URLs.
- The accepted architecture defined a Business as a commercial idea, a Business environment as a hard data/authorization boundary, a workload as a deployed app/API/worker and a BFF deployment as shared infrastructure. Domain names were intentionally absent from the Build 1 schema.
- One BFF deployment may host several isolated Business environments. A domain identifies a web origin; it must not grant access or replace the Business-environment security boundary.
- TableCards was the first planned Business, but its final product/domain name was still an explicit launch decision. No custom domain, DNS record or production provider resource existed.
- Consulted `STATUS.md`, `docs/products/tablecards-mvp.md`, `docs/factory/mvp-delivery-plan.md`, ADRs 0001/0002 and the current architecture document.

## The Idea

Choose a low-maintenance domain model for a solo-developer Business Factory that can launch many small Businesses without buying and operating a separate domain too early for every experiment. The model must still give public Businesses credible URLs, keep development and internal surfaces clear, and preserve strict Business-environment isolation.

## Codebase Context

### What We Have

- A Cloudflare-hostable Vite backoffice and a separate Convex BFF.
- One persisted row per Business environment, with domains/settings deliberately deferred until a real workload needs them.
- Direct Google OIDC for the backoffice, where every hosted origin must be configured explicitly.
- A future rule that each Business environment has a primary site URL and approved origins/return URLs when Business-user authentication arrives.

### Constraints

- Convex hosts backend functions and HTTP actions, not the Vite frontend. Its generated `*.convex.cloud` and `*.convex.site` URLs can remain in use until a custom API domain is valuable; Convex custom domains require Pro.
- A hostname is routing metadata, not authority. BFF credentials and data remain bound to one Business environment regardless of whether several sites share a parent domain.
- Separate subdomains are separate browser origins, but they are still considered the same browser “site” in some cookie and CSRF rules. Authentication cookies must therefore be host-only unless cross-subdomain sharing is an intentional, reviewed feature.
- Google web clients require the exact JavaScript origins used by the app. New stable domains require provider configuration changes even when no code changes.
- Cloudflare Worker Custom Domains are registered per exact hostname, although routes or newer preview-domain features can handle broader patterns. We should not introduce a dynamic multi-tenant routing system merely to serve the first few Businesses.

### Opportunities

- One umbrella domain can supply stable names for the backoffice and early Business MVPs while Cloudflare manages HTTPS certificates.
- Andrew now owns both `tofler.tech` and `tofler.app`, allowing customer-facing product hosts and internal technical hosts to use different registrable domains without another purchase.
- Cloudflare `workers.dev` and preview URLs can cover bootstrap and short-lived review deployments without buying a development domain.
- Because Business URLs are intended to become validated environment settings, a Business can graduate from an umbrella subdomain to its own brand domain without changing its BFF identity or data.

## Options

### Option A: Dedicated Domain From Every Public Business Launch

**Approach**: Buy a separate brand domain for each Business before any public launch. Use provider URLs or subdomains of that domain for its development environments, and keep the factory backoffice on a separate factory domain.

**Leverages**: Clear Business boundaries, independent branding, straightforward marketing/email/legal identity and the option to sell or separate a Business later.

**Constraints**: Every idea needs naming, purchase, DNS, renewal, OAuth origins and provider approval before it can look production-ready.

**Effort**: Medium

**Risk**: Premature domain purchases and provider configuration create overhead for experiments that never validate.

### Option B: One Umbrella Domain for All Businesses

**Approach**: Buy one stable factory/company domain and give every Business and environment a hostname under it, for example `tablecards.example.com`, `tablecards-dev.example.com` and `ops.example.com`.

**Leverages**: One DNS zone, predictable naming, low acquisition cost and fast creation of new Business sites.

**Constraints**: Independent Businesses visibly share a parent brand. Each stable Google/OAuth origin still needs configuration, and browser cookies/security policy must not assume that sibling subdomains are mutually trusted.

**Effort**: Low

**Risk**: A promising Business may later need a domain migration for credibility, search presence, customer email or transferability. Poor cookie scoping could also weaken the intended isolation.

### Option C: Incubation Domain, Then Brand Domains Selectively

**Approach**: Buy one neutral umbrella domain for the factory. Host early public MVPs at flat subdomains such as `tablecards.example.com`; use `tablecards-dev.example.com` only when a stable shared development site is genuinely needed. Keep temporary previews on provider-generated URLs. Give a Business its own domain only when branding, public launch, payment review, customer trust, email or traction justifies it. Keep the backoffice at a separate hostname such as `ops.example.com`.

**Leverages**: The low overhead of shared DNS and the architecture's separation between a Business-environment identity and its configurable URLs.

**Constraints**: The system must treat domains as replaceable configuration and accept a period when both old and new origins may need to work during migration.

**Effort**: Low initially; Medium only for Businesses that graduate

**Risk**: Delaying a dedicated domain too long can create avoidable migration and branding work. That risk is bounded by deciding a clear graduation trigger before public marketing or paid launch.

## Umbrella Name and TLD Options

### Naming Option A: Conventional `.com`

**Approach**: Find a pronounceable studio name with an available `.com`, accepting that it may be longer or less distinctive.

**Leverages**: Maximum familiarity and the lowest chance that someone mistypes the extension.

**Constraints**: Short desirable names are often registered, premium-priced or available only with awkward spelling.

**Effort**: Medium

**Risk**: Optimizing for `.com` availability can produce a weaker brand than choosing the right name and a suitable modern TLD.

### Naming Option B: Meaningful Modern TLD

**Approach**: Pair a short studio name with a TLD that completes the identity, especially `.studio` or `.works`. Consider `.tools`, `.build` or `.labs` only if the chosen brand position fits them.

**Leverages**: More short-name availability and an intentional studio/maker identity. Product subdomains such as `tablecards.<name>.studio` remain understandable.

**Constraints**: Renewal prices vary significantly by TLD and registrar, and some people may still assume `.com` when recalling the name.

**Effort**: Low

**Risk**: An exotic, heavily promoted or premium-renewal TLD can become expensive or look less trustworthy. Availability and normal renewal price must be verified at the registrar before selection.

### Naming Option C: Domain Hack or Gimmick

**Approach**: Make the extension part of a word or phrase, producing a domain such as `we.<verb>` or a name whose final letters are the TLD.

**Leverages**: Potentially memorable and playful, with a strong maker personality.

**Constraints**: It must still work when spoken aloud, typed from memory and used after a product subdomain. Country-code TLD policies, renewal costs and perceived geography also require checking.

**Effort**: Medium

**Risk**: A clever domain can become confusing when nested (`tablecards.<domain-hack>`), hard to explain verbally or dependent on a registry whose commercial/policy risk is higher.

## Open Questions

- Should a customer-facing early MVP visibly use the factory umbrella, or should every Business receive a dedicated brand domain before its first true public launch?
- How prominently should the Tofler customer-facing namespace identify KooMasha as the actual developer/operator?
- What event triggers a dedicated domain: public launch, payments, meaningful traffic, revenue or a deliberate brand investment?
- Which development environments need stable public origins? Localhost and provider preview URLs may be enough until OAuth, webhooks or remote device testing requires one.
- Should the backoffice remain on its own `ops`/`admin` hostname under the umbrella domain, or later move behind a separate internal-access domain? The current recommendation is a separate hostname, not a separate purchased domain.
- When, if ever, does the shared BFF need `api.<umbrella-domain>`? The current generated Convex domains are sufficient for development and early MVP use.
- What naming convention keeps hostnames flat and readable while distinguishing production from non-production?
- Should the `tofler.app` root simply say “Apps by KooMasha,” with customer contact/legal links and no mandatory product catalog? This is the current recommendation.

## Current Direction

**Option C is the selected direction at the model level, while naming and graduation details remain open.** It matches a solo developer launching many small Businesses: one parent-company domain provides stable infrastructure and incubation URLs; provider-generated domains handle bootstrap/previews; public Businesses buy dedicated domains only when success or a concrete branding/commercial reason justifies making them an independent unit.

The umbrella naming question is now concretely answered by the purchased `tofler.tech` and `tofler.app` domains. KooMasha is the actual software studio, developer and operator; Tofler is a domain family/customer-facing software label, not a separate company or development studio. Customer-facing identity, product sites, support and legal surfaces use `tofler.app`, while internal, operator and behind-the-scenes technical surfaces use `tofler.tech`. The two Tofler roots do not redirect to or advertise each other. Customer-facing Tofler and product pages may truthfully identify and link to KooMasha.

The earlier decision to use `ops.tofler.tech` for Build 1 is superseded because Build 1 deploys the development environment, not production. Clean hostnames are reserved for production and stable development uses an explicit `-dev` suffix. Build 1 therefore targets `ops-dev.tofler.tech`, while `ops.tofler.tech` remains unused until a production backoffice exists. This avoids later repointing a trusted hostname from development to production and makes the environment visible before sign-in.

Under this recommendation, every website stays paired with the corresponding BFF lane: development sites call the development BFF, production sites call the production BFF, and no development site receives production credentials or data. A solo-developer MVP needs only development and production; no permanent staging lane is added.

The tiny Google-only operator dashboard uses one shared public OAuth web client for both `ops-dev.tofler.tech` and `ops.tofler.tech`. This is an intentional simplicity choice for at most Andrew and his wife; the client ID grants no data access. Development and production still use separate Workers, BFF deployments and data, while sharing the same reviewed code-owned operator list.

The candidate topology is:

```text
koomasha.com                           actual developer/operator studio
tofler.tech                            KooMasha's internal technical namespace; no public product directory
ops.tofler.tech                        future production backoffice
ops-dev.tofler.tech                    Build 1 development backoffice
api.tofler.tech                        optional future technical BFF custom domain
tofler.app                             minimal customer-facing “Apps by KooMasha” identity
tablecards.tofler.app                  early TableCards production/public MVP
tablecards-dev.tofler.app              stable product development only when needed
support.tofler.app                     optional shared customer-facing support entry
<cloudflare-preview>.workers.dev      temporary previews
<deployment>.convex.cloud/.site       BFF until a custom API domain is justified
<dedicated-business-domain>           optional graduation path
```

This topology requires strict host-only cookies, exact origin/return-URL allowlists, no authority derived from a hostname alone and no shared login state across sibling Businesses unless explicitly designed later.

The revised recommended role for `tofler.app` is a small customer-facing “Apps by KooMasha” identity: a concise statement, customer contact/support and legal links. It does not have to list unrelated products. A product may be linked only when there is a deliberate reason for cross-discovery. It must not expose the backoffice, infrastructure, development environments, failed experiments or every work in progress. Each Business subdomain owns its own product positioning, policies, pricing and conversion flow.

KooMasha is the developer/operator umbrella; Tofler is its software-domain family; individual Businesses may still have their own product brands. The checkout site and legal documents must truthfully identify the applicable KooMasha legal seller/operator. The domain strategy must not be used to obscure ownership or avoid employment, tax or contractual obligations.

## Decision Log

| Date | Decision | Context |
| --- | --- | --- |
| 2026-09-26 | Opened a separate domain-strategy brainstorm; no domain choice accepted yet. | Domain ownership affects every future Business, the factory backoffice and authentication origins, but it is distinct from the completed Build 1 implementation. |
| 2026-09-26 | Selected the incubation-to-brand model in principle. | Andrew does not want to buy a domain for every experiment. Small and trial Businesses may use subdomains of one company domain; a successful Business may later receive a dedicated domain and remain connected to the shared BFF behind the scenes. Concrete naming and the graduation threshold remain open. |
| 2026-09-26 | Reopened the umbrella brand and root-site role after considering KooMasha. | KooMasha is an existing business-automation brand associated with Andrew's wife, while future software Businesses may be unrelated. A separate short studio brand may provide clearer product URLs even if the same legal entity receives Paddle payouts. Paddle reviews each checkout hostname and warns that unrelated products on a submitted domain can confuse buyers. |
| 2026-09-26 | Chose to explore a separate short software-studio brand and non-`.com` TLD. | `.com` scarcity makes short names harder to obtain. Meaningful TLDs or a restrained domain gimmick may create a better umbrella, but exact availability, renewal pricing and policy risk still need research. |
| 2026-09-26 | Andrew purchased `tofler.tech` and `tofler.app`. | The recommended topology uses `*.tofler.app` for customer-facing incubated Businesses and `*.tofler.tech` for the studio, backoffice and optional later infrastructure. No DNS or deployment change has been authorized or made. |
| 2026-09-26 | Accepted `ops.tofler.tech` as the official Build 1 backoffice origin. | Using the durable custom hostname immediately avoids treating the generated Cloudflare hostname as the operator-facing address and lets the Google web client be configured for the intended origin. Deployment and DNS work remain separate, approval-gated execution. |
| 2026-09-26 | Accepted a strict audience split between the two Tofler domains. | `tofler.app` and its subdomains are customer-facing; `tofler.tech` and its subdomains are internal, operator or behind-the-scenes technical surfaces. The roots do not redirect to or promote each other. Customer-visible support/legal content stays on the `.app` side or the individual Business domain. |
| 2026-09-26 | Clarified that KooMasha—not Tofler—is the actual developer/operator studio. | Tofler is the customer-facing software label/domain family and the matching internal technical namespace. Customer pages can say “Apps by KooMasha”; product legal pages identify the applicable KooMasha seller. Earlier wording that called Tofler a separate studio is superseded. |
| 2026-09-26 | Confirmed both Tofler domains were purchased through Cloudflare. | Their DNS zones are already in the intended provider, so there is no separate registrar-to-Cloudflare connection blocker. Wrangler account authentication and the actual hostname/deployment configuration remain execution-time checks. |
| 2026-09-26 | Reopened the Build 1 backoffice hostname after discussing development versus production. | `ops.tofler.tech` had been accepted before deciding how both lanes coexist. The current recommendation is `ops-dev.tofler.tech` for Build 1 development and reserving `ops.tofler.tech` for future production; Andrew has not yet accepted this revision. |
| 2026-09-26 | Accepted explicit `-dev` hostnames and clean production hostnames. | Build 1 uses `ops-dev.tofler.tech`; future production uses `ops.tofler.tech`. The same rule applies to `tablecards-dev.tofler.app` and `tablecards.tofler.app`. Development and production have separate Workers, BFF deployments, data, configuration and credentials. This supersedes the earlier Build 1 `ops.tofler.tech` choice. |
| 2026-09-26 | Use one Google OAuth web client for the two backoffice origins. | The backoffice has at most two fixed operators, and the client ID is public identity-provider configuration rather than authority. Each lane retains separate backend data, server configuration and allowlisting. |

## Notes

- No domain needs to be purchased merely to perform the first development deployment: Cloudflare and Convex provide HTTPS development URLs.
- A stable custom domain becomes useful before production branding, provider approval or durable public links—not simply because a development environment exists.
- Prefer flat hostnames such as `tablecards-dev.example.com` over unnecessarily deep names such as `dev.tablecards.apps.example.com`; flat names are easier to understand and avoid certificate/routing surprises.
- Avoid putting the backoffice at a path inside a Business origin such as `tablecards.example.com/admin`. A separate origin reduces accidental cookie, service-worker, CSP and deployment coupling.
- A candidate `tofler.app` root page would use “Apps by KooMasha” or equivalent truthful wording, one plain-language sentence, customer contact/support details and Privacy/Terms links. Product cards are optional and selective rather than the site's reason to exist. It is not intended to become a large corporate site or generic product marketplace.
- Paddle currently requires approval for every domain or subdomain that launches checkout. It permits required information across a main domain and subdomains, but warns against unrelated products that could confuse buyers. This favors a product-specific experience at each Business hostname and truthful seller identification in its legal pages rather than a mixed catalog at the root.
- `.app` is encrypted by default and browsers require valid HTTPS serving. Cloudflare-hosted production and preview sites already fit that constraint, but an unconfigured `tofler.app` hostname will not be usable as a plain HTTP placeholder.
- “Internal/technical” describes audience rather than network reachability: a future `api.tofler.tech` may be internet-accessible for workloads, but it is not a customer marketing destination. Authorization remains mandatory and never derives from the hostname.
