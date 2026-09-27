# BFF operator CLI

Run validated Business-environment and customer-lifecycle operations through `pnpm bff:environment -- <command>`. The CLI invokes explicit Convex functions without a shell and never accepts credentials in configuration JSON.

Use `--help` for the complete tested syntax. Common groups are:

- Registry: `create`, `inspect`, `list`, `update`.
- Customer configuration: `preview-customer-auth`, then `configure-customer-auth` with the returned preflight ID and both revisions.
- Read-only customer state: `list-customer-users`, `list-customer-accounts`, `list-customer-memberships`, `list-customer-sessions`, `list-customer-security-events`.
- Lifecycle: `provision-managed-account`, development-only `provision-development-account`, `set-account-policy`, `revoke-customer-session`.

All cloud operations require `--confirm-cloud`. A command that writes to a production reference also requires `--confirm-production <exact-deployment-reference>`. Those flags authorize only the named invocation; they do not deploy code or bypass backend validation.

Customer-auth apply is deliberately two-stage. Prefer `--defaults-module <business-defaults.ts>` plus `--environment-json <json>`: the CLI composes reviewed code-owned behavior with deployment URLs into the exact versioned effective snapshot. `--configuration-json` remains available for compatibility. Preview validates every existing user and account and returns a short-lived single-use preflight. Apply must use the same source inputs, current configuration revision, current account-policy-state revision and preflight ID. Any source or concurrent account change makes it stale and requires a new preview.

For product-guided configuration, use [the repository skill](../../.agents/skills/configure-business-auth/SKILL.md). It explains URL semantics, interacting account defaults and safe scenario choices before invoking this CLI.
