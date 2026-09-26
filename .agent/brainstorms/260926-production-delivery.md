# Brainstorm: Production Delivery

> **Status**: Accepted — Implementation tracked by [Production Delivery](../plans/260926-production-delivery.md)
> **Created**: 2026-09-26
> **Last updated**: 2026-09-26
> **Repository baseline**: `b754169e9144a437b99dcd7c8aae655a09aa00db`

## Context Snapshot

- Build 1 has passed its complete local gate and hosted development verification at `ops-dev.tofler.tech`.
- The current GitHub Actions workflow validates pull requests and pushes to `main`, but it has no deployment job, provider credentials or production environment.
- The repository is currently on `main` with the hosted-verification/static-configuration closeout still uncommitted.
- Production remains untouched: no BFF production code/data and no `ops.tofler.tech` Worker deployment exist.
- The shared Google client already authorizes both backoffice origins. The public client ID and fixed operator identifiers are code-owned; Convex URLs and deployment credentials are lane-specific.
- Consulted `STATUS.md`, the completed Build 1 plan, the domain-strategy brainstorm, official Convex production-deploy guidance, official Cloudflare Workers GitHub Actions guidance and GitHub deployment-environment guidance.

## The Idea

Make `main` the production source of truth. A change should reach production through GitHub CI/CD only after the repository's complete validation gate succeeds, so the deployed Convex backend and Cloudflare dashboard correspond to one known commit rather than separate manual uploads.

## Codebase Context

### What We Have

- One complete `pnpm check` command already shared by local work and GitHub Actions.
- A development Convex deployment and a separately named development Cloudflare Worker.
- A production hostname reserved as `ops.tofler.tech` and a development hostname at `ops-dev.tofler.tech`.
- A public build-version field suitable for stamping with the Git commit SHA.
- A validation-only GitHub workflow triggered for pull requests and pushes to `main`.

### Constraints

- `npx convex deploy` targets the production deployment associated with a production-scoped `CONVEX_DEPLOY_KEY` in CI.
- Non-interactive Wrangler deployment requires a narrowly scoped Cloudflare API token and account ID.
- Production secrets must be GitHub environment secrets, never repository files, chat, workflow arguments or build output.
- The dashboard must be built with production Convex URLs, while the Google client ID remains the reviewed shared code-owned value.
- Backend and dashboard deployment must not overlap with another production deployment; GitHub concurrency must serialize them.
- A merge-triggered deployment needs a clear policy for direct pushes to `main`, failed deploys and rollback.

### Opportunities

- The existing complete check can be the single pre-deployment gate rather than inventing a second validation path.
- GitHub's `production` environment can scope secrets, restrict the deploying branch and retain deployment history.
- Convex can run the frontend build command with the production URL it just deployed, reducing mismatched backend/frontend targets.
- The commit SHA can identify both the BFF health response and Cloudflare deployment.

## Options

### Option A: Protected merge, automatic production deploy

**Approach**: Require a pull request and green CI before `main` can advance. Every successful merge triggers one serialized production job that deploys Convex, builds against the production endpoints and deploys the separate production Worker to `ops.tofler.tech`.

**Leverages**: The existing PR validation workflow, complete `pnpm check`, reserved production hostname and separate provider lanes.

**Constraints**: Branch protection must prevent ordinary direct pushes, and the first setup needs production-scoped Convex and Cloudflare credentials in the GitHub `production` environment.

**Effort**: Medium

**Risk**: A green but behaviorally wrong merge deploys automatically. Small post-deploy health and dashboard smoke checks plus a documented revert path reduce, but do not eliminate, that risk.

### Option B: Merge, then manual GitHub approval

**Approach**: A merge to `main` validates and prepares the production job, but GitHub waits for Andrew to approve the environment deployment.

**Leverages**: GitHub environment protection and the same deterministic deployment process as Option A.

**Constraints**: Every release needs a manual click and may remain queued. Availability of required-reviewer rules depends on repository visibility and GitHub plan.

**Effort**: Medium

**Risk**: The extra gate becomes routine ceremony for a solo developer and weakens the desired “merge means production” mental model.

### Option C: Version tag or release deploys production

**Approach**: Merging updates `main` but production changes only when Andrew creates a release tag.

**Leverages**: Explicit release points and easy mapping between releases and deployed commits.

**Constraints**: Adds a second promotion action and leaves `main` ahead of production between releases.

**Effort**: Medium

**Risk**: Release tagging can be forgotten or used inconsistently, creating ambiguity about whether `main` is actually live.

### Option D: Reviewed direct push, automatic production deploy

**Approach**: While Andrew and Codex are the only collaborators and production has no real user/data risk, work directly on `main`. Andrew reviews the result in conversation and explicitly authorizes the push; GitHub validates that pushed commit and deploys it automatically only if validation succeeds. Introduce protected pull requests later when real production usage justifies the extra workflow.

**Leverages**: The current solo collaboration style, the existing push-to-`main` CI trigger and Andrew's explicit push approval.

**Constraints**: A failing commit can exist temporarily on `main`, even though the deployment job will not run. The repository therefore cannot claim that every `main` commit is deployable until PR protection is introduced.

**Effort**: Low

**Risk**: Direct pushes provide a weaker pre-merge boundary. The risk is accepted only while production has no meaningful users/data and every push still requires Andrew's explicit approval.

## Open Questions

- None for the initial production-delivery direction. Development automation and the trigger for introducing protected pull requests are explicitly deferred until real usage makes them valuable.

## Current Direction

Option D is selected for the current solo-development phase. Andrew reviews the work in conversation and explicitly authorizes Codex to push the prepared commit directly to `main`. The push starts GitHub Actions; validation must pass before the production job runs. There is no second deployment-approval click. Under Andrew's completion rule, a task remains unfinished until the production job and smoke checks pass.

Pull requests and direct-push protection are intentionally deferred until production has real users, meaningful data or additional collaborators. This is a conscious temporary tradeoff, not the recommended mature-production model.

The production job uses a GitHub `production` environment restricted to `main`, serializes releases, stamps the commit SHA, deploys the backend before the dashboard and finishes with live smoke checks. If Convex succeeds but Cloudflare fails, the workflow stops and reports a partial release; it does not automatically roll back the backend. The task remains incomplete until retry or a fix-forward deployment makes the whole release green.

Development remains manually deployed for now. Automating development or previews is a separate future improvement and does not block production delivery.

No production resource, credential, workflow or branch rule is created during this brainstorm.

## Decision Log

| Date | Decision | Context |
| --- | --- | --- |
| 2026-09-26 | Production must be deployed by CI/CD rather than a manual local command. | Andrew wants the deployed system to follow repository merges and not depend on remembering separate provider commands. |
| 2026-09-26 | Favor `main` as the production source of truth. | The intended mental model is that an Andrew-approved push is validated and then becomes the live version. |
| 2026-09-26 | A task is not complete until its production deployment and production smoke checks pass. | Local and development environments prove readiness but are intermediate gates. Status documents and plans must not say Completed while intended production remains pending. |
| 2026-09-26 | Deploy automatically after the accepted merge gate; do not add a routine manual production-approval click. | Andrew wants merging and production release to be one workflow. A failed deploy or smoke check leaves the task incomplete. |
| 2026-09-26 | **Superseded:** Require a pull request with green checks before `main`, let Andrew inspect and merge it, and block direct pushes. | Andrew clarified that current work is reviewed together before he authorizes a push, and the repository has no real production usage yet. Protected PRs become appropriate later, rather than adding ceremony now. |
| 2026-09-26 | For the current solo phase, Andrew reviews in conversation and explicitly authorizes a direct push to `main`; that push validates and then deploys automatically. | This matches the actual collaboration workflow. A failing commit may temporarily exist on `main`, but no production deployment occurs unless validation passes. Introduce protected PRs when real users/data or collaborators increase the risk. |
| 2026-09-26 | If backend deployment succeeds and dashboard deployment fails, stop and report the partial release; do not automatically roll back Convex. | Automated backend/database rollback can be unsafe once writes or schema changes exist. The task stays incomplete until retry or fix-forward restores a fully green production release. |
| 2026-09-26 | Keep development deployment manual for now. | Production automation closes the current completion gap. Preview/development automation has separate value and can be reconsidered when parallel work or remote review requires it. |
| 2026-09-26 | Accepted the complete production-delivery direction and approved implementation planning. | Andrew confirmed the current solo direct-push workflow, automatic post-validation production deployment, production smoke completion gate and stop-without-rollback partial-failure policy. |

## Notes

- Convex documents `npx convex deploy` as the production/CI command and selects the target associated with `CONVEX_DEPLOY_KEY`: <https://docs.convex.dev/cli/reference/deploy>.
- Cloudflare documents that non-interactive Wrangler CI needs an account ID and scoped API token: <https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/>.
- GitHub environments can scope secrets, restrict deployment branches, retain deployment history and optionally require approval: <https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments>.
- A failed frontend step after a successful backend deploy is a partial release, but the current Build 1 contract is backward-compatible and the dashboard is read-only. Future schema/data changes require stronger migration and rollback design before relying on the same assumption.
