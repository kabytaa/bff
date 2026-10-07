# Business documentation ownership

Created: 2026-10-06
Updated: 2026-10-07
Accepted direction: [Business lifecycle discussion](../../.agent/brainstorms/261003-business-lifecycle-skills.md)

Keep Business-only canonical explanations beside that Business's code under
`projects/<business>/`. Shared BFF/factory material stays canonical in root
`docs/` and is linked, not copied. Ownership determines location, not file type.

A small Business can start with its README and a few useful sections/files:

- **Product:** customer/value, scope, offers/promises, limits, acceptance and assumptions.
- **Application:** pages, flows, important states/actions, desktop/mobile and design choices.
- **Architecture:** actual components, data ownership, table purposes/relationships and API boundaries.
- **Operations:** real setup/deployment, validation, diagnostics and recovery procedures.
- **Dated reviews/research:** evidence, findings, sources and versions—not another copy of current scope.

These are content responsibilities, not a mandatory file count. Combine short
sections; split only when length or ownership makes maintenance clearer. Do not
precreate empty folders, a PRD per small feature, per-button IDs or a separate
copy of every token/schema field. Code remains the exact source for validators,
types and reusable values; docs explain their intent and relationships.

Andrew reaffirmed on 2026-10-07: prefer fewer maintained documents, one home for
each current fact and links instead of repeated live summaries. Update existing
sections in the same change as their behavior/decision; create a new document
only for a genuinely distinct useful purpose. Dated records may preserve prior
context, but must be clearly historical, not alternative current specifications.
Routine MVP priority discussion belongs in the [single delivery roadmap](mvp-delivery-plan.md).

The design skills own product/application explanations. Existing planning,
implementation or explicitly requested documentation work maintains technical
and operational explanations when their boundaries change; readiness checks
freshness. There is no fifth mandatory architecture skill.

Under current repository rules, root `.agent/brainstorms/`, `.agent/plans/` and
`docs/architecture/adr/` remain the homes of dated work records and accepted
technical decisions. Do not silently change discovery rules. Preserve records,
creation dates, immutable dated filenames and history when moving documents.
Repair incoming/outgoing links; retain old paths as clear routing notes where
needed, never independent copies of product truth.

For a meaningful change, compare affected promise → visible workflow → server
rule → evidence, update its canonical explanations and record verification
with scope/date/version. A review may proceed despite incomplete docs; report
consequential gaps rather than requiring a documentation project first.
Keep STATUS short and current. Historical snapshots remain in their work
records or dated evidence, not a speculative backlog copied into STATUS.
