# FormFlow Codebase Audit

Date: 2026-05-17

Scope: current repository state in `c:\Users\anton\Documents\Projects\formflow`. I used `graphify-out/GRAPH_REPORT.md` as a map, then inspected the application routes, Prisma model, Temporal workflows and worker, auth, form schema/submission validation, encryption, org sync, Docker/CI, and `formflow-design-spec.md` as the intended product reference. This audit supersedes the 2026-05-13 audit; resolved items from that pass are summarized below.

Context note: this is an internal tool for a single German university (~5000 students and staff). Findings are weighted for that scale — large-scale concerns (multi-tenancy, per-form keys, heavy archival) are deliberately downgraded.

## Executive Summary

FormFlow is a substantially complete internal beta. Since the previous audit the team has closed most of the high-severity items: self-hosted fonts, `prebuild`/`prelint`/`pretest` Prisma generation, zero-warning lint gate, recursive nested-field encryption/redaction, schema-aware submission validation, a Form.io component allowlist, auth rate limiting + lockout + session revocation, a visual workflow stage designer, break-glass justification for sensitive submissions, a Playwright smoke job in CI, Docker healthchecks, and audit-log indexes.

It is still not production ready. The remaining issues are a mix of one genuine functional bug (org sync is silently non-functional), several correctness/robustness gaps in the submission and workflow paths, and maintainability debt — chiefly a duplicated route tree and inline translation tables.

## Verification Snapshot

Static review only this pass; I did not re-run the build/test suite. CI (`.github/workflows/ci.yml`) now runs lint, typecheck, build, integration, and a Playwright `@smoke` e2e job against the Docker stack.

## Findings

### 1. Org-sync workflow is never registered with the worker

Severity: High

Evidence:

- `src/temporal/worker.ts:34` schedules `workflowType: "orgSyncWorkflow"` on task queue `formflow-approval`.
- `src/temporal/worker.ts:65` sets `workflowsPath: require.resolve("./workflows/approvalWorkflow")` — Temporal bundles only that single file and its imports.
- `src/temporal/workflows/orgSyncWorkflow.ts` is a separate module and is not imported by `approvalWorkflow.ts`, so it is never included in the worker bundle.

Impact:

- Every scheduled org sync (hourly by default) fails: Temporal cannot find workflow type `orgSyncWorkflow` on the queue.
- The directory cache (`OrgUnit`, `OrgMembership`, manager flags) never refreshes automatically. Org-based routing (`submitter.manager`, `department.head`) silently degrades over time.
- The admin dashboard "directory current" indicator is derived from `User.updatedAt`, so it can look healthy while sync is dead.

Fix:

- Create a workflows barrel (e.g. `src/temporal/workflows/index.ts`) that re-exports both `approvalWorkflow` and `orgSyncWorkflow`, and point `workflowsPath` at it.
- Add an integration/e2e check that the scheduled org sync actually advances `OrgUnit`/`OrgMembership`.

### 2. Any edit to a `needs_revision` submission silently resubmits it

Severity: Medium

Evidence:

- `src/app/api/submissions/[id]/route.ts:225-238`: the `needs_revision` branch signals `resubmittedSignal` on every `PATCH`, unconditionally.
- `updateSubmissionSchema` has an optional `submit` boolean, but it is only consulted for the `draft` branch (`:147`, `:163`).

Impact:

- A submitter who saves intermediate progress on a returned submission cannot do so without advancing the Temporal workflow back into review.
- There is no "save draft of a revision" path; the first save is final.

Fix:

- Gate the `resubmittedSignal` on `input.submit === true`, mirroring the draft branch. Allow plain saves to persist `data` without signalling.

### 3. Submit path is not atomic with the Temporal workflow start

Severity: Medium

Evidence:

- `src/app/api/submissions/route.ts:130-182` and `src/app/api/submissions/[id]/route.ts:155-222`: the submission row is created/updated, then `temporal.workflow.start(...)` is called, then a separate `db.submission.update` sets `status: "submitted"`.
- None of this is wrapped in a transaction or compensating logic.

Impact:

- If `workflow.start` succeeds but the final status update fails, the workflow runs while the row stays `draft`.
- If `workflow.start` throws after the row is created, the submission is orphaned in `draft` with no workflow.

Fix:

- Start the workflow first (idempotent on `workflowId = submission.id`), then update status; on workflow-start failure, delete/flag the draft.
- Consider a reconciliation job that detects `submitted` rows with no live workflow run and vice versa.

### 4. Workflow `goTo` / role / user / org targets are not validated before publish

Severity: Medium

Evidence:

- `src/lib/validation/workflows.ts:53` allows `onReject: { goTo: z.string() }` — any string, no cross-check that the stage id exists.
- `src/temporal/workflows/approvalWorkflow.ts:380-388` (`jumpToStage`) throws at runtime if the id is missing.
- `src/lib/validation/workflow-server.ts:142`: `assertWorkflowRunnable` validates only `group` targets for emptiness. Role/user existence is checked at workflow-API write time (`assertRoleTargetsExist`) but org resolvers (`submitter.manager`, `submitter.skip-level`, `department.head`) are never validated, and `goTo` targets are never validated anywhere.

Impact:

- An admin can publish a form whose workflow throws on the first submission (bad `goTo`, deactivated target user, or an org resolver that produces an empty assignee set).
- `approvalWorkflow.ts:208` throws `No assignees resolved` only at execution time, surfacing as a failed Temporal workflow rather than a publish-time error.

Fix:

- In `assertWorkflowRunnable`, validate every `goTo` resolves to an existing stage id, and warn (or block) when org resolvers cannot currently resolve to any active user.
- The design spec's "workflow dry-run validator" is the right target: resolve sample routing and report unreachable stages and empty assignee sets before publish.

### 5. Condition-stage expression evaluation can crash the workflow

Severity: Medium

Evidence:

- `src/lib/workflow-conditions.ts`: `validateConditionExpression` checks syntax and identifier prefixes at authoring time; `evaluateCondition` calls `parsed.evaluate(context)` directly.
- `src/temporal/workflows/approvalWorkflow.ts:132-134` runs `evaluateCondition` inside workflow code with no try/catch.

Impact:

- A syntactically valid expression can still throw at evaluation (missing member access on `undefined`, type mismatch against real submission data). An uncaught throw fails the whole Temporal workflow.

Fix:

- Wrap `evaluateCondition` in a try/catch; on error, treat as a defined branch outcome (e.g. false) and surface a workflow event/log rather than crashing.

### 6. Detached SLA reminder/overdue timers are not cancelled when a stage resolves

Severity: Low

Evidence:

- `src/temporal/workflows/approvalWorkflow.ts:225-240`: per-task reminder and overdue timers are spawned as fire-and-forget `void (async () => { await sleep(...) })()`.
- When a stage resolves early (any-one approval, reject, revision), these timers are not cancelled.

Impact:

- The activities are guarded (`sendReminderIfTaskPending`, `markTaskOverdueIfPending` no-op on non-pending tasks), so no wrong emails are sent — but the workflow keeps pending coroutines and Temporal timers alive longer than necessary, and a long SLA can delay perceived workflow completion.

Fix:

- Scope timers with a Temporal `CancellationScope` per stage and cancel it once the decision arrives.

### 7. Approval audit entry is written before the workflow applies the decision

Severity: Low

Evidence:

- `src/app/api/submissions/[id]/approve/route.ts:37-46`: `submission.approved` is written to the audit log immediately after `handle.signal(...)`, before the workflow processes the signal.

Impact:

- The audit log records `submission.approved` even if the signal targets a stage that does not finalize the submission (intermediate stage) or if the workflow later errors. Audit semantics drift from actual state.

Fix:

- Either rename the action to `submission.approval_signalled`, or move authoritative outcome audit writes into the workflow activities (`closeSubmission`-style) where the real state transition happens.

### 8. Duplicated route tree (`/admin/*` and `/[lang]/admin/*`)

Severity: Medium (maintainability)

Evidence:

- Every page exists twice: the implementation under `src/app/admin/...`, `src/app/submissions/...`, etc., and a one-line re-export under `src/app/[lang]/admin/...` (e.g. `src/app/[lang]/admin/page.tsx` is `export { default } from "@/app/admin/page"`).
- `src/proxy.ts` redirects any non-locale-prefixed path to `/{defaultLocale}/...`.

Impact:

- Both trees are built and routable. The non-`[lang]` routes are only ever reached transiently before redirect, yet they double the route surface and every new page must be added in two places — easy to forget one.
- This is a structural smell that will compound as pages are added.

Fix:

- Keep a single `[lang]` tree as the source of truth and delete the non-prefixed duplicates, or vice versa. The proxy already guarantees a locale prefix, so the non-prefixed tree is redundant.

### 9. Inline translation tables duplicated across pages

Severity: Medium (maintainability)

Evidence:

- `src/app/admin/page.tsx:192-279` carries ~90 lines of inline `copy` objects for `de`/`en`. Other pages follow the same pattern.
- A dictionary system exists (`src/lib/i18n/dictionaries.ts`).

Impact:

- Translations are scattered, duplicated, and drift-prone; adding a language means editing every page.

Fix:

- Move page copy into the i18n dictionaries and load via the existing `getDictionary`/locale context.

### 10. README LDAP example is inconsistent with the parser

Severity: Low

Evidence:

- `README.md:31`: `LDAP_BASE_DNS="o=uni-we,o=uni"` (comma-separated).
- `.env.example` and `src/lib/ldap-config.ts` (`parseLdapBaseDns`) split `LDAP_BASE_DNS` on `|`. The code drift flagged in the prior audit is fixed (`ldapOrgAdapter.ts` now uses `getLdapBaseDnsFromEnv`), but the README example was not updated.

Impact:

- Copying the README produces a single base DN `o=uni-we,o=uni` rather than two — surprising, possibly broken, LDAP searches.

Fix:

- Update `README.md` to use `|` and match `.env.example`.

### 11. Minor operational / hygiene items

Severity: Low

- `docker-compose.yml:36` still pins `temporalio/ui:latest`; pin a version for reproducibility.
- `docker-compose.yml`: app, Temporal, and Temporal metadata still share one Postgres service/credentials. Acceptable at this scale, but document it as a deliberate local-only choice and provide a production template.
- `src/app/api/submissions/[id]/route.ts`: the draft-submit path issues three sequential `db.submission.update` calls (`:155`, `:186`, `:216`); collapse to one update before and one after the workflow start.
- `src/lib/field-access.ts` is a single re-export line — trivial indirection that can be inlined or removed.
- Non-auth mutation APIs have no rate limiting. Acceptable for an internal ~5000-user tool, but worth a note.

## Resolved Since 2026-05-13

The following prior findings appear addressed in the current tree: Google Fonts build dependency (no `next/font/google` imports remain); Prisma generation footgun (`prebuild`/`prelint`/`pretest:integration`/`prepare` all run `prisma generate`); lint warnings (`--max-warnings=0`); Form.io schema permissiveness (component allowlist, dangerous-key and unsafe-HTML rejection in `formio-schema.ts`); submission payload validation (`normalizeSubmissionData` rejects unknown keys and type-checks); nested sensitive fields (path-based recursive encrypt/redact in `formio-data.ts`); CSRF (double-submit token + Origin/Referer enforcement in `request-guard.ts`); auth abuse controls (rate limiting, lockout, `sessionVersion` revocation); raw workflow JSON editor (replaced by the visual stage designer); break-glass reason capture for sensitive submissions (`x-break-glass-reason`, HTTP 428); Playwright smoke in CI; Docker healthchecks; audit-log indexes.

## Test Coverage Gaps

- Scheduled org sync actually registering and advancing the directory cache (would have caught finding 1).
- `needs_revision` save-vs-resubmit behavior (finding 2).
- Workflow publish-time validation: bad `goTo`, deactivated user targets, empty org-resolver results (finding 4).
- Condition-stage evaluation against malformed/missing data (finding 5).
- Workflow runtime behavior for `notification`, `condition`, `trigger-form`, `goTo`, and `return-to-submitter` paths.

## Production Readiness Checklist

- Register `orgSyncWorkflow` with the worker; verify the schedule runs.
- Make the submit path atomic / add reconciliation.
- Gate `needs_revision` resubmission on an explicit submit flag.
- Publish-time workflow validation (goTo, role/user/org targets, dry run).
- Defensive condition-expression evaluation.
- Collapse the duplicated route tree; move copy into i18n dictionaries.
- Align README LDAP docs; pin the `temporal-ui` image; provide a production deploy template.
