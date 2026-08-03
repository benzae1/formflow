# FormFlow final handoff audit

Audit date: 2026-08-03

Baseline code commit: `6af84e3` (rebased onto remote commit `6b1759b`)

Overall assessment: **strong prototype/internal beta; not production-ready for university data**

## Executive handoff

The repository has a coherent product core: bilingual authenticated pages, an admin form builder with basic JSON import/export, hardened Form.io schemas and server-side data validation, draft/submission journeys, Temporal-backed approval/revision/rejection, role/form/field access, LDAP integration, delegations, notifications, encryption, sensitive-access grants, and an audit console. Lint, TypeScript, and the optimized Next.js build pass.

The remaining work is not cosmetic. Current dependency advisories, unsafe production/bootstrap and org-sync paths, placeholder institutional content, incomplete retention/audit operations, and an unproven production platform make a real-data launch unacceptable without another engineering and governance phase.

This report is the current open-item authority. Superseded audits were removed from the working tree and remain available through Git history.

## Verification performed

| Check | Result | Notes |
|---|---|---|
| Existing dirty-work preservation | Pass | Rebased commit `6af84e3`, after two small lint/accessibility corrections |
| Remote history integration | Pass | 13 newer `origin/main` commits reviewed and retained before final push preparation |
| ESLint (`--max-warnings=0`) | Pass | Direct local binary, 2026-08-03 |
| TypeScript (`tsc --noEmit`) | Pass | 2026-08-03 |
| `npm run build` | Pass | Rechecked after remote integration: Next.js 16.2.4, 51 routes; warns `middleware` convention is deprecated |
| Production dependency audit | **Fail** | `npm audit --omit=dev`: 29 findings: 1 critical, 16 high, 11 moderate, 1 low |
| Integration suite | Not rerun | 65 cases present; Docker/PostgreSQL unavailable in this handoff environment |
| Browser suite | Not rerun | 5 runtime cases present; Docker Desktop engine unavailable |
| CI definition | Reviewed | lint, typecheck, build, integration, and one `@smoke` browser case |
| Accessibility/security penetration test | Not performed | Requires specialist tooling and institutional scope |

The tracked `test-results/.last-run.json` says `passed`, but generated state is not evidence for this audit. A future maintainer must run `npm run verify:stack` in a clean environment.

## P0 — must be resolved before any production/pilot data

### P0-1. Remediate current dependency advisories

`npm audit --omit=dev` currently reports 29 production findings. Directly affected packages include:

- critical: `next-auth` 4.24.14;
- high: Next.js 16.2.4, Temporal SDK 1.17.0 packages, `expr-eval`;
- moderate: Form.io packages, Prisma, Resend, legacy `formiojs`.

At audit time, patch targets exist for NextAuth (4.24.15), Next.js (16.2.12), Temporal (1.21.1), Prisma (7.9.1), Resend (6.18.1), and parts of Form.io; `expr-eval` and some Form.io/UUID paths have no automatic fix. Version data changes over time and must be re-queried.

Action: upgrade in controlled groups, remove unused `formiojs` if confirmed, assess `expr-eval` replacement/containment, regenerate the lockfile, run all tests, recheck CSP/builder rendering, and record the residual advisory risk. Add SCA/audit enforcement to CI with a documented exception process.

Exit criterion: no unaccepted critical/high production finding, with security sign-off on any exception.

### P0-2. Separate production bootstrap from demo seed

`scripts/prisma-init.mjs` always calls `prisma db seed`. `prisma/seed.ts` refuses production unless `ALLOW_DEMO_USERS=true`; enabling the flag creates accounts with usernames/passwords `admin/admin`, `approver/approver`, and `submitter/submitter` plus a demo workflow.

Action: create separate commands for migrations, immutable system-role bootstrap, and explicit development demo seed. Make production fail if demo seeding is requested. Update Compose/CI and add a clean-production-database test.

Exit criterion: a fresh production-like deployment migrates/boots with no known credentials and without manual DB edits.

### P0-3. Make organization sync safe by default

The worker always installs an hourly org-sync schedule. When LDAP is not configured, both scheduled and manual sync select `devOrgAdapter`. That adapter returns two example users and one org unit; reconciliation can deactivate other users missing from the non-empty source result. This can lock out real/local administrators and leave tasks assigned to deactivated users.

Action: disable org sync unless an explicit production adapter/config flag passes validation; confine the development adapter to tests/explicit demo mode; add dry-run and change-count thresholds; require confirmation for mass deactivation; record detailed sync summaries; automatically reassign/escalate pending tasks; test empty/partial/multi-server LDAP failure behavior.

Exit criterion: no sync can mutate users without verified source configuration, preview, guardrails, audit summary, and recovery procedure.

### P0-4. Close institutional/legal/privacy/accessibility decisions

Imprint, privacy, accessibility, and help pages contain visible placeholder instructions. Processing purpose, retention, DSAR/legal hold, vendor approval, identity governance, support ownership, and accessibility conformance have no final institutional record in the repo.

Action: close every applicable item in [DECISIONS_REQUIRED.md](DECISIONS_REQUIRED.md), install approved bilingual content, and store sign-offs in the institution's controlled system.

Exit criterion: named owners and dated approvals for service, content, processing, accessibility, support, and launch risk.

### P0-5. Implement an enforceable data lifecycle

Retention columns exist, but no form policy assigns `retainUntil`/`purgeAt`; there is no scheduler. `retention:purge` deletes records only when operators manually set markers. DSAR operations require direct database work. Deletion semantics across parent/child cases, Temporal histories, backups, and audit evidence are not tested.

Action: add per-form retention policy/version and owner, calculate dates at defined lifecycle events, support legal hold/restriction, create dry-run/approval/purge jobs, test referential integrity and Temporal cleanup, build guarded subject export/correction/erasure tooling, and define backup expiry.

Exit criterion: policy-backed dates are populated automatically and a staged retention/DSAR rehearsal produces reviewable evidence.

### P0-6. Build and prove the production operating platform

The production Compose example lacks a TLS proxy, secrets integration, non-root/minimal image, resource/network controls, metrics/alerts, backup jobs, restore automation, deployment strategy, and incident runbooks. The current Dockerfile is single-stage and ships source/dev dependencies. The Temporal database is essential for in-flight workflows and cannot be treated as disposable.

Action: implement the target in the deployment guide, scan/sign images, secure proxy headers, separate databases, protect Temporal UI, define SLO/RPO/RTO, monitor workflows/sync/email/auth/retention, and run a combined app+Temporal restore/rollback drill including encryption keys.

Exit criterion: staging mirrors production and passes deployment, failover, restore, monitoring, rollback, and on-call acceptance tests.

## P1 — high-priority engineering before broad rollout

### Security and audit

- **Fix/test key rotation.** `scripts/rotate-encryption-key.ts` handles only top-level fields. Current encryption supports nested fields. Rotation needs recursive traversal, batching, resumability, verification, dry run, concurrency protection, backups, and tests before use.
- **Complete audit coverage.** APIs audit approval signals, but Temporal activities that create/complete/cancel tasks and set submission statuses do not consistently write corresponding events. `AuditLog` is an ordinary mutable table, not tamper-evident storage. Define an event catalogue, add activity events/idempotency, externalize/immutably retain security events if required, and test sequence/correlation.
- **Harden proxy IP trust.** Login throttling trusts the first `X-Forwarded-For` value. Configure a trusted-proxy strategy and ensure the edge replaces spoofable headers.
- **Review CSP exceptions.** Form/admin pages allow `unsafe-inline` and `unsafe-eval`; admin allows `cdn.form.io` and blob workers. Keep route scope narrow, pin/self-host assets if feasible, and run browser/security regression tests.
- **Validate config at startup.** Add one production configuration validator for URLs, secrets, encryption active key, LDAP completeness, email state, and forbidden demo flags; expose only safe readiness details.

### Workflow reliability

- **Fix and regression-test revision resubmission.** A submission returned for revision may remain in `revision_needed` after the submitter edits and resubmits it, and the approver task may not reappear. Reproduce this end to end, repair the status/signal/task transition, and cover it in integration and browser tests.
- Add idempotency keys/unique constraints or transactions for retryable Temporal activities that create tasks/notifications/child submissions.
- Establish a workflow repair/replay/versioning process and tests for worker upgrades with already-running histories.
- Add admin tooling for failed/stuck workflows, task reassignment, cancellation, retry, and reconciliation between PostgreSQL and Temporal.
- Decide whether multi-target approval should remain “first decision wins” or support unanimous/quorum modes.
- Apply delegation at the intended time; current code only consults it when a task becomes overdue.
- Validate SLA reminder ordering and clarify/escalate overdue behavior.
- Make child-form stages verify publication/access and optionally wait for/launch child processes when the business case requires it.
- **Clarify terminal outcome semantics.** The workflow now writes `closed` for both successful and rejected terminal paths. Approval/rejection survives only in task records and outcome notifications, so top-level status filters cannot distinguish the result. Decide whether this collapse is intended and add migration/contract/UI tests.

### Identity and LDAP

- Verify LDAP failover: org sync does not robustly continue across URL errors the way authentication does.
- Validate real schema assumptions (`ou`, `manager`, derived slug, flattened department model) against the university directory; current adapter does not construct a rich hierarchy from LDAP entries.
- Prevent arbitrary/unmapped LDAP attribute values from creating role records unless explicitly intended.
- Define precedence between admin-assigned roles and login-time LDAP replacement.
- Define and test role-change session semantics. The admin role route no longer increments `sessionVersion`; existing sessions remain valid while the JWT callback reloads roles from PostgreSQL. Prove that privilege removal takes effect on the intended next request and provide an explicit audited revoke-all control.
- Add user activation/deactivation, local emergency-admin credential rotation, lockout reset, and task-reassignment administration with audit trails.

### Testing and quality gates

- Run all five browser cases in CI, not only `@smoke`; add Firefox/WebKit or institution-supported browser coverage.
- Add browser cases for sensitive access, field-role redaction, delegations/timeouts, org-sync guardrails, custom roles, child forms, email-disabled behavior, and failed workflow recovery.
- Add automated accessibility checks, then a manual keyboard/screen-reader/BITV/WCAG assessment including Form.io builder and renderer.
- Add retention/key-rotation/backup-restore tests and a production-bootstrap test.
- Measure meaningful coverage and add performance/load/soak testing for roughly expected population, large forms, concurrent approvals, and long Temporal histories.
- Make CI run `npm audit --omit=dev`/SCA, container scanning, secret scanning, migration checks, and ideally an SBOM/license review.

### Product and operations

- Add reliable delivery status/retry/dead-letter behavior for email. Current send failures are logged and swallowed; there is no bounce/status UI.
- Make notification read-state updates failure-aware. The panel currently clears its local unread count after `POST /api/notifications/read-all` without checking `response.ok`; add error/retry handling and concurrent-tab tests.
- Harden form interchange and lifecycle tooling. Basic browser-side JSON import/export now covers only `title`, `slug`, and the German/base `schema`; it omits translations, sensitivity, workflow, roles, ownership, retention, approvals, and version history. Add a versioned, localized, server-validated package format plus comparison/restore, duplication, and safe archive/delete governance.
- Add form ownership, department, retention policy, publication approval, last review, and contact metadata.
- Add searchable/paginated user, form, submission, notification, and audit workflows suitable for thousands of users. Audit CSV currently exports only the current 50 rows.
- Localize Temporal-generated notifications and remaining hard-coded shared/legacy UI text; correct placeholder German diacritics before content approval.
- Define support diagnostics without exposing personal/sensitive data.

## P2 — maintainability and future improvement

- Migrate Next.js `middleware.ts` to the Next 16 `proxy.ts` convention and verify locale/security behavior.
- Consolidate duplicated localized/unlocalized route implementations and move remaining inline copy to typed i18n.
- Split large client components (workflow builder, form builder page, user manager) into testable domain/UI modules.
- Untrack `test-results/.last-run.json` and ignore all generated Playwright output.
- Remove unused packages/assets and align exact Form.io package versions to reduce duplicate dependency trees.
- Add architecture decision records for Form.io, Temporal, LDAP, encryption, audit, and localization.
- Add API/OpenAPI generation or contract tests so bilingual API docs cannot drift manually.
- Add database constraints/index reviews for expected query volume and archival patterns.
- Introduce feature flags/staged rollout and usage analytics only after privacy approval.

## Recommended delivery sequence

### Phase 0 — containment

Freeze production rollout; update vulnerable dependencies; split demo/bootstrap; disable unsafe org sync; rotate any shared development secrets; establish repository/service ownership.

### Phase 1 — production foundation

Implement production infrastructure, config validation, backup/restore/key custody, safe LDAP sync, lifecycle automation, complete audit events, workflow repair/admin tools, and full CI/security gates.

### Phase 2 — controlled pilot

Use a low-risk form with a small named cohort in a production-like staging/pilot environment. Run complete accessibility, privacy, security, load, failover, DSAR, retention, and restore exercises. Track support burden and workflow failure rate.

### Phase 3 — general availability

Only after pilot exit criteria and institutional sign-off: onboard forms through a governed publication process, review access/retention periodically, monitor SLOs, patch dependencies continuously, and rehearse recovery/incident processes.

## Definition of a viable university tool

FormFlow is viable when it is not merely feature-complete, but also owned, governed, supportable, recoverable, accessible, secure, and auditable:

- no unaccepted critical/high security exposure;
- safe identity lifecycle and least-privilege access;
- per-form owner, purpose, audience, accessibility, and retention approval;
- tested submission/workflow correctness including failure and recovery paths;
- policy-driven retention/DSAR/legal hold;
- traceable and, where required, tamper-resistant audit evidence;
- monitored production platform with proven backup/restore and encryption-key recovery;
- full bilingual support for user-facing journeys;
- documented support/on-call/incident processes and sustainable maintainer capacity.

## First-day checklist for the successor team

1. Read this audit, the architecture/deployment guides, and institutional decision register.
2. Create a protected branch and reproduce `npm ci`, lint, typecheck, build, `npm audit --omit=dev`, and `npm run verify:stack` on a clean machine.
3. Inventory all existing environments, secrets, databases, Temporal namespaces, LDAP accounts, DNS, email/DeepL accounts, and backups outside this repository.
4. Disable any scheduled deployment/sync using the development fallback.
5. Assign owners to P0 items and do not accept production forms until their exit criteria are evidenced.
