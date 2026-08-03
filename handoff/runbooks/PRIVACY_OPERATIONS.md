# FormFlow privacy operations — interim manual runbook

Status: interim only, updated 2026-08-03. This is an engineering handoff aid, not an approved institutional policy. It must be replaced or approved by the responsible data-protection and records-management owners before production.

## Current data classes

- `User`, `Role`, `OrgUnit`, `OrgMembership`, `Delegation`: identity, authorization, and organization routing.
- `Form`, `FormVersion`, `Workflow`: form/process definitions and historical snapshots.
- `Submission`: form answers, submitter, locale, form/workflow snapshots, status, parent/child links.
- `ApprovalTask`: assignee, stage, decision, note, due/decision times.
- `Notification`: in-app message and email-trigger content.
- `AuditLog`: authentication, access justification, and selected mutation/signal events.
- `LoginRateLimitBucket`: temporary authentication-throttle state.
- Temporal persistence: workflow histories, signals, activity results, schedules.
- Infrastructure artifacts: logs, backups, Playwright/test data, email-provider metadata.

## What the software currently implements

- Optional `retainUntil`, `purgeAt`, and/or `deletedAt` columns on submissions/tasks/notifications/audit logs.
- `npm run retention:report` counts due markers.
- `npm run retention:purge` permanently deletes due notifications, tasks, and submissions; audit logs are report-only.
- Sensitive record reads use short-lived justified grants and audit entries.
- Audit CSV exports only one current 50-row cursor page and does not update `exportedForDsarAt`.

What it does **not** implement: a retention policy on forms, automatic marker assignment, scheduler, legal holds, DSAR search/export/delete UI, backup deletion, Temporal-history cleanup, approval workflow for purge, or verified erasure evidence.

## Critical purge behavior

The script deletes a submission when `purgeAt <= now` **or whenever `deletedAt` is non-null**. Therefore, setting `deletedAt` queues it for deletion on the very next purge even if a later `purgeAt` was intended. Do not follow older instructions that set `deletedAt` before a waiting window.

Deletion order is notifications, approval tasks, then submissions. It does not discover related notifications automatically, clean up parent/child trees, terminate/delete Temporal histories, or touch backups. Referential constraints and current production data must be tested before every first use/version change.

## Interim request procedure

Until guarded tooling exists:

1. Open an institutional privacy/records case; verify requester identity and authority outside FormFlow.
2. Record scope, form/process owner, applicable policy/legal hold, requested action, and approving officials.
3. Work in a restricted operator environment; take no ad-hoc copy into tickets/email.
4. Search across identity, submissions (including values/references), tasks/notes, notifications, audit logs, Temporal histories, application logs, email provider, and backups as required by the approved scope.
5. Export encrypted/access-controlled evidence using reviewed scripts/queries; record schema version and query. The built-in audit CSV is insufficient for a complete export.
6. For correction/restriction/erasure, create a reviewed change plan covering linked and downstream records. Preserve evidence that policy requires, but minimize unnecessary content.
7. Before purge, run `npm run retention:report`, database-specific dry-run queries, referential checks, and a backup/restore check. Do not set `deletedAt` until immediate deletion on the next purge is approved.
8. Execute approved changes with two-person review where possible. Capture counts/IDs (not field contents), operator, approver, time, script version, and output.
9. Re-run searches and reconcile PostgreSQL, Temporal, logs, provider metadata, and backup expiry.
10. Close the institutional case with the outcome and any retained/legal-hold explanation.

Direct production SQL is high risk. Use read-only transactions for discovery and peer-reviewed, narrowly scoped scripts for writes. Never bulk-edit/purge by an unverified identifier.

## Sensitive access review

Review `sensitive.access.granted`, `sensitive.accessed`, and `sensitive.list_accessed` together. Grant creation alone does not prove data was viewed; detail/list access records do. The application audit is not tamper-evident and does not contain every Temporal state transition, so correlate with infrastructure/Temporal logs when investigating.

## Required replacement work

See the handoff audit P0-5. At minimum implement versioned per-form retention rules, automatic dates, legal hold/restriction, subject search/export, approved correction/erasure, dry-run and scheduled purge, Temporal/backup cleanup, immutable evidence where required, and end-to-end tests.
