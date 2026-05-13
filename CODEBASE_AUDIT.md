# FormFlow Codebase Audit

Date: 2026-05-13

Scope: current repository state in `c:\Users\Carlotta\Documents\antonsSachen\formflow`. I used `graphify-out/GRAPH_REPORT.md` as a map first, then inspected the application routes, Prisma model, Temporal workflows, auth, form builder/renderer, org sync, Docker/CI setup, and tests.

## Executive Summary

FormFlow is now beyond a thin prototype. The codebase has Next.js App Router pages, Prisma migrations, NextAuth credential/LDAP auth, Form.io builder and renderer integration, Temporal workflows, audit logging, role/delegation management, field-level access settings, workflow snapshots, form schema snapshots, notifications, CI, and integration tests.

It is not production ready yet. The biggest remaining risks are operational hardening, schema/data validation depth, workflow authoring quality, auth abuse controls, and deploy repeatability. The good news: the previous critical build/typecheck and approval authorization holes appear to be fixed in the current tree.

## Verification Snapshot

Commands run locally:

- `npm.cmd run lint`: passed with 2 warnings.
- `npx.cmd tsc --noEmit`: initially failed because the local generated Prisma client was stale; after `npx.cmd prisma generate`, it passed.
- `npm.cmd run build`: failed in the restricted sandbox because `next/font/google` could not fetch Google Fonts; passed when allowed network access.
- `npm.cmd run test:integration`: passed, 6 files and 22 tests.

I did not run the Playwright e2e suite because it needs the full running stack/browser setup.

## Production Readiness Assessment

Current state: close to a functional internal beta, not ready for production handling sensitive institutional workflows.

Before production, prioritize:

1. Make builds reproducible without live external font/network fetches.
2. Remove lint warnings and make Prisma generation impossible to forget.
3. Harden auth with rate limiting, account lockout/monitoring, and explicit session revocation strategy.
4. Tighten Form.io schema and submission-data validation, especially nested sensitive fields.
5. Replace the raw workflow JSON editor with a polished workflow designer, dynamic routing controls, and workflow/form visibility validation.
6. Add Playwright smoke e2e to CI.
7. Fix LDAP documentation/config drift and decide whether current LDAP org mapping is sufficient.
8. Add production operations pieces: backups, health checks, metrics, log routing, secret management, and non-dev Docker settings.

## Findings

### 1. Production builds depend on a live Google Fonts fetch

Severity: High

Evidence:

- `src/app/layout.tsx:2` and `src/app/signin/layout.tsx:2` import `Barlow_Semi_Condensed` from `next/font/google`.
- `npm.cmd run build` failed in the network-restricted sandbox with `Failed to fetch Barlow Semi Condensed from Google Fonts`.
- The same build passed only after network access was allowed.

Impact:

- Production builds are not deterministic in offline, firewalled, or tightly controlled CI/CD environments.
- A transient Google Fonts outage or blocked outbound request can stop deploys.

Fix:

- Self-host the font files under `public/fonts` and switch to `next/font/local`, or use system fonts only.
- Keep the Google font fetch out of the production build path.

### 2. Prisma client generation is an easy local footgun

Severity: High

Evidence:

- `npx.cmd tsc --noEmit` initially produced many incorrect Prisma type errors, including stale enum-style `roles` types, until `npx.cmd prisma generate` was run.
- CI explicitly runs `npx prisma generate` in `.github/workflows/ci.yml:32`, `:53`, and `:88`.
- `package.json:12` has a `prisma:generate` script, but `build`, `lint`, and `test:integration` do not force it.
- `scripts/prisma-postinstall.mjs:12` skips generation when neither `DATABASE_URL` nor a local env file exists.

Impact:

- Developers can see false type failures or, worse, build against stale generated types after schema changes.
- This increases onboarding friction and can mask real type errors.

Fix:

- Add `prisma generate` to a `prebuild`, `pretest:integration`, or `prepare` path that does not require a live database URL.
- Document the exact local flow in `README.md`.
- Consider checking `npx prisma validate` in CI too.

### 3. Lint still passes with warnings

Severity: Medium

Evidence:

- `npm.cmd run lint` passed, but reported:
  - `src/app/admin/forms/FormsManagerClient.tsx:76`: `useMemo` missing `locale` dependency.
  - `src/components/submissions/SubmissionFormView.tsx:56`: `_locale` is unused.

Impact:

- The missing dependency can cause stale filtering/title behavior when locale changes.
- Warnings staying green makes it easier for small issues to accumulate.

Fix:

- Add `locale` to the `useMemo` dependency array.
- Remove the unused `locale` prop from `SubmissionFormView` or use it.
- Configure CI lint to fail on warnings once the current two warnings are fixed.

### 4. Form.io schema validation is still too permissive for production

Severity: High

Evidence:

- `src/lib/formio-schema.ts:20` and `:26` allow arbitrary extra component and schema properties with `[key: string]: unknown`.
- `validateFormioSchema` checks components, keys, duplicate keys, submit button presence, and two custom property flags (`src/lib/formio-schema.ts:37-93`).
- It does not restrict risky Form.io features such as custom JavaScript hooks, calculated values, HTML content, file upload settings, remote data sources, or unknown component types.

Impact:

- Admin-authored JSON can introduce behavior the backend does not understand or review.
- The renderer may execute or expose Form.io features that were not part of the intended product/security model.
- Backend field access and encryption can drift from what the frontend renders.

Fix:

- Define an explicit supported component allowlist and allowed property allowlist.
- Reject or strip executable/custom Form.io fields server-side.
- Add tests for rejected dangerous properties and accepted supported components.

### 5. Submission payloads are not validated against the form schema

Severity: High

Evidence:

- `src/lib/validation/submissions.ts:5` and `:11` accept `data: z.record(z.string(), z.any())`.
- `src/app/api/submissions/route.ts:108-128` encrypts selected fields and stores the whole submitted object.
- There is no server-side pruning of unknown keys or type checking against the saved Form.io schema.

Impact:

- Clients can submit extra fields that were never present in the form.
- Reporting, audit exports, and field-level redaction can be polluted by unmodeled data.
- Sensitive fields can be missed if the submitted shape differs from the expected schema.

Fix:

- Build a schema-aware submission validator from the stored Form.io schema.
- Reject unknown keys by default, validate primitive types where possible, and normalize optional empty values.
- Store a validation result/audit entry when submission data is rejected.

### 6. Nested sensitive fields are likely not encrypted or filtered correctly

Severity: High

Evidence:

- `visitFormioComponents` walks nested structures including columns, rows, field sets, and edit grids (`src/lib/formio-schema.ts:104-157`).
- `encryptSensitiveSubmissionData` collects sensitive keys but only checks `if (key in encrypted)` at the root data object (`src/lib/formio-sensitive-fields.ts:14-24`).
- `filterSubmissionDataForUser` also iterates only over root `Object.entries(input.data)` (`src/lib/field-access.ts:20-42`).

Impact:

- Sensitive fields inside DataGrid/EditGrid/nested containers can be discovered in the schema but not encrypted or redacted in the nested submitted data.
- This is a serious risk if the product allows complex Form.io layouts.

Fix:

- Track full component paths, not only field keys.
- Apply encryption and redaction recursively to arrays/objects according to those paths.
- Add tests for sensitive fields inside columns, datagrids, editgrids, and nested components.

### 7. Mutation protection is useful but not a full CSRF strategy

Severity: Medium

Evidence:

- Mutating routes call `assertMutationRequest`.
- `src/lib/request-guard.ts:7-13` requires a static `x-formflow-intent: mutation` header.
- Origin and referer are only rejected if they are present (`src/lib/request-guard.ts:20-37`).

Impact:

- The custom header blocks normal HTML form CSRF attempts, but the protection is not tied to a session-specific token.
- Missing Origin/Referer headers are accepted.
- The static header can be copied by any same-origin script if an XSS issue appears.

Fix:

- Add a session-bound CSRF token for mutating requests, or use a NextAuth CSRF/token flow consistently.
- Decide whether missing Origin/Referer should be rejected in production.
- Add tests for missing header, bad origin, missing origin, and valid same-origin mutation.

### 8. Authentication lacks abuse controls

Severity: High

Evidence:

- The credentials provider in `src/lib/auth.ts:44-103` validates LDAP or local passwords directly.
- There is no rate limiting, lockout, IP/user throttling, failed-login audit event, or suspicious-auth alerting in that flow.
- JWT session lifetime is set in-process in `src/lib/auth.ts:9-10` and `:105-124`, with no persistent server-side session revocation list.

Impact:

- Password guessing against local or LDAP credentials is not controlled by the app.
- Lost/stolen JWT sessions cannot be revoked centrally unless NextAuth secret rotation or user deactivation side effects are used.

Fix:

- Add rate limiting on `/api/auth/*` by IP and username/UID.
- Write failed-login audit events without storing submitted passwords.
- Define a revocation strategy: DB sessions, token version per user, or short JWT plus forced reauth after role/deactivation changes.

### 9. Workflow authoring is too raw for non-technical admins

Severity: Medium

Evidence:

- `src/app/admin/workflows/WorkflowsManagerClient.tsx:205` exposes workflow definition as a raw JSON `<textarea>`.
- Runtime supports advanced stage types, but the UI only summarizes parsed JSON and does not guide safe construction (`src/app/admin/workflows/WorkflowsManagerClient.tsx:93-101`, `:213-231`).
- The workflow schema accepts `approval`, `notification`, `trigger-form`, and `condition` stages (`src/lib/validation/workflows.ts:30`).
- Workflow role targets are still statically limited to `admin`, `approver`, and `compliance` in `src/domain/workflow.ts:2` and `src/lib/validation/workflows.ts:6-8`, even though the database role model can store arbitrary business roles.
- Published forms are listed and opened based mainly on publication status, not explicit audience rules (`src/app/submissions/page.tsx:54-61`, `src/app/forms/[slug]/page.tsx:29-33`, `src/app/api/submissions/route.ts:96-109`).

Impact:

- A malformed but schema-valid workflow can be hard for admins to understand or debug.
- Operational users have to author routing logic in JSON, which conflicts with the low-code product goal.
- The current authoring experience cannot comfortably model real institutional routing such as finance, management, department heads, submitter manager, or org-unit teams without hand-edited JSON.
- Forms cannot yet be restricted to specific roles or org units, so publication is too broad for role-specific internal processes.

Fix:

- Build a polished workflow designer UI, not just a safer JSON editor. It should provide stage cards, drag/reorder controls, explicit stage types, required-field states, inline validation, and a readable route map/timeline preview.
- Add structured controls for approval, notification, condition, trigger-form, SLA/reminder, branch targets, return-to-submitter, and close/go-to outcomes.
- Add workflow stage routing controls that select from live users, DB roles, org units/groups, and built-in org resolvers such as submitter manager, skip-level manager, and department head.
- Replace hard-coded workflow role values with dynamic role validation against the `Role` table while preserving app-level system roles for permissions.
- Add support for approver-stage fields, for example finance-only data such as cost center or bank account, stored with the approval task rather than mutating the submitter's original answers.
- Add form visibility/audience settings for roles and org units, then enforce those settings in published-form listings, form detail routes, and submission create/update APIs.
- Keep the JSON view as an advanced/debug panel with round-trip validation against the structured editor.
- Add a workflow "dry run" validator that resolves sample routing, detects empty assignee sets, warns on missing manager/head mappings, and reports unreachable/broken stages before publishing.

### 10. Workflow "runnable" checks are shallow

Severity: Medium

Evidence:

- Form creation only checks that an attached workflow definition is a non-empty array (`src/app/api/forms/route.ts:149-169`).
- Form publish/update checks the same shape but does not validate runtime assignee resolvability (`src/app/api/forms/[id]/route.ts:58-79`).
- Workflow creation validates child form IDs (`src/app/api/workflows/route.ts:46-75`) but not whether role/org/group targets currently resolve to active approvers.

Impact:

- Admins can publish forms whose workflows fail only when a user submits.
- Org/group routing can silently resolve to no assignees at runtime, causing Temporal workflow failure.

Fix:

- Validate that published workflows contain at least one terminal/executable route and can resolve all static role/user/group targets.
- For org targets, provide warnings when the current org graph has no matching manager/head.
- Validate that form audience settings resolve to at least one active role/org-unit population before publishing, or show an explicit warning when an audience is intentionally empty.
- Add tests for unresolvable workflow targets and publishing behavior.

### 11. LDAP documentation conflicts with actual base-DN parsing

Severity: Medium

Evidence:

- `README.md:31` shows `LDAP_BASE_DNS="o=uni-we,o=uni"`.
- `.env.example:26-27` says `LDAP_BASE_DNS` uses `|` as the separator because commas belong inside DNs.
- `src/lib/ldap.ts:185-193` implements `LDAP_BASE_DNS` splitting with `|`.
- `src/jobs/ldapOrgAdapter.ts:43` uses a comma-splitting helper for org sync base DNs, creating a second interpretation.

Impact:

- Sign-in LDAP and org-sync LDAP can interpret the same environment variable differently.
- Copying the README example can produce invalid or surprising LDAP searches.

Fix:

- Standardize one parser for all LDAP base DN lists, preferably `|`.
- Update `README.md` to match `.env.example`.
- Add tests for multi-base-DN parsing in auth and org sync.

### 12. Demo credentials and docs are inconsistent

Severity: Medium

Evidence:

- `README.md:39-43` lists `admin@example.com`, `approver@example.com`, and `submitter@example.com`.
- `prisma/seed.ts:44`, `:62`, and `:80` seed `admin@bauhaus.de`, `approver@bauhaus.de`, and `submitter@bauhaus.de`.
- The seed also sets local passwords (`admin`, `approver`, `submitter`) in `prisma/seed.ts:46`, `:64`, and `:82`, but the README calls them "email-only sign-ins."

Impact:

- New developers and testers can fail login during setup.
- More importantly, default credentials must never survive into production.

Fix:

- Align README with seed data.
- Add an explicit production guard so the demo seed refuses to create default-password users unless `NODE_ENV !== "production"` or a dedicated `ALLOW_DEMO_USERS=true` flag is set.

### 13. Audit log immutability is implemented with triggers, but export and retention are still basic

Severity: Medium

Evidence:

- `prisma/migrations/20260511170000_submission_snapshots_and_audit_lockdown/migration.sql:7-24` prevents `AuditLog` update/delete with database triggers.
- `src/app/admin/audit-log/page.tsx:35-42` pages through the latest 50 rows.
- The CSV export link is filter based (`src/app/admin/audit-log/page.tsx:52-57`), but there is no visible retention policy, tamper-evident export, or archival strategy.

Impact:

- Append-only is a good start, but production compliance usually needs retention windows, export completeness, and operational access controls.
- Large audit tables will need indexing and archival planning.

Fix:

- Add indexes for common audit filters: `createdAt`, `actorId`, `resourceType`, `resourceId`, and `action`.
- Define retention/export requirements.
- Add signed exports or immutable storage handoff if compliance requires it.

### 14. Sensitive list visibility is opt-in, but detail views still need stronger intent logging

Severity: Medium

Evidence:

- Admin/compliance submission lists exclude non-standard forms by default unless `includeSensitive=true` (`src/lib/submission-visibility.ts:11-21`, `src/app/admin/submissions/page.tsx:28-43`).
- Sensitive detail views write `submission.viewed` and `sensitive.accessed` (`src/lib/submissions.ts:31-58`).
- The detail page does not require an explicit reason or confirmation before showing sensitive fields.

Impact:

- Every sensitive detail open is logged, which is good, but accidental clicks can expose data before intent is captured.
- Compliance workflows often require "break glass" reason capture for sensitive/PII access.

Fix:

- Add a reason prompt or explicit "Reveal sensitive data" action for sensitive submissions.
- Include that reason in `sensitive.accessed` metadata.
- Add role-specific policy for which sensitive categories can be revealed.

### 15. Playwright e2e tests exist but are not part of CI

Severity: Medium

Evidence:

- `.github/workflows/ci.yml` has lint, typecheck, build, and integration jobs, but no e2e job.
- `package.json:18-21` defines `test:e2e`, `test:e2e:install`, `verify`, and `verify:smoke`.
- `tests/e2e/formflow.spec.ts` covers the browser journey, but it is not enforced in GitHub Actions.

Impact:

- CI can pass while the browser-level admin -> submitter -> approver flow is broken.
- The most important user journeys rely on Form.io, Next routing, cookies, and Temporal behavior together; integration tests alone do not cover that.

Fix:

- Add a CI job that starts the Docker stack, installs Chromium, and runs a smoke-tagged Playwright suite.
- Upload Playwright traces/screenshots as artifacts on failure.

### 16. Production Docker/Compose settings are still development-oriented

Severity: Medium

Evidence:

- `docker-compose.yml` hardcodes local database credentials and ports.
- `temporal-ui` uses `temporalio/ui:latest`.
- The app, Temporal, and Temporal metadata all share one Postgres service in the compose stack.
- There are no container healthchecks for `web` or `worker`.

Impact:

- This is fine for local development but weak for production.
- `latest` images reduce reproducibility, and shared credentials/DB boundaries complicate least privilege.

Fix:

- Treat `docker-compose.yml` as local-only, and add a separate production deployment template.
- Pin all image tags.
- Separate app and Temporal databases or at least credentials/schemas.
- Add healthchecks and restart/alerting behavior for the worker.

### 17. Observability is too thin for production incident response

Severity: Medium

Evidence:

- The app uses `pino` through `src/lib/logger.ts`, and `apiErrorResponse` logs 500s (`src/lib/errors.ts:20-38`).
- There is no request ID propagation, metrics endpoint, health endpoint, tracing, Temporal workflow failure dashboard integration, or structured audit-vs-operational log boundary documented.

Impact:

- When a workflow stalls, email fails, LDAP sync misbehaves, or a form submission is rejected, operators will have limited clues.

Fix:

- Add `/api/health` or a server health route covering DB and Temporal connectivity.
- Add request IDs to API logs and audit metadata.
- Export metrics for workflow failures, pending tasks, overdue tasks, email failures, LDAP sync results, and API 5xx rates.

## Test Coverage Gaps

Add coverage for:

- Form.io schema allowlist and rejected executable/custom properties.
- Nested sensitive field encryption/redaction for DataGrid/EditGrid/columns.
- Submission-data validation rejecting unknown keys and wrong types.
- Workflow runtime behavior for `notification`, `condition`, `trigger-form`, `goTo`, and `return-to-submitter`.
- Publishing forms with unresolvable role/org/group targets.
- Workflow stage routing to dynamic DB roles, org units, managers, department heads, and direct users.
- Form visibility/audience rules across form listing, form detail, submission create, and submission update routes.
- LDAP base-DN parsing and LDAP org-sync normalization.
- CSRF/mutation guard edge cases.
- Auth rate limiting and failed-login audit behavior.
- Playwright smoke e2e in CI.

## Production Readiness Checklist

- Reproducible build with local fonts and generated Prisma client.
- Zero lint warnings and CI failure on new warnings.
- Full CI: lint, typecheck, build, integration, Playwright smoke e2e.
- Hardened auth: rate limits, failed-login auditing, token/session revocation.
- Server-side Form.io schema allowlist and schema-aware submission validation.
- Recursive encryption/redaction for nested sensitive fields.
- Polished workflow designer with dynamic routing, approver-stage fields, form audience controls, and dry-run validation.
- LDAP config/docs aligned and tested.
- Demo seed guarded from production.
- Production deployment template with pinned images, separate secrets, healthchecks, backups, and monitoring.
- Audit retention/export strategy and indexes.
