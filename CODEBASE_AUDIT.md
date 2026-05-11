# FormFlow Codebase Audit

Date: 2026-05-11

Scope: full product-readiness audit against `formflow-design-spec.md`, with extra focus on the form builder, form lifecycle, workflow routing, submission state handling, RBAC, security, test/build health, and operational readiness. I also used `graphify-out/GRAPH_REPORT.md` as the repo map before inspecting code.

## Executive Summary

FormFlow has a credible prototype foundation: Next.js App Router pages, Prisma schema, NextAuth sessions, a Form.io builder/renderer, Temporal approval workflow, in-app notifications, audit logs, and integration/e2e tests for the happy path.

It is not yet a finished product. The largest blockers are:

1. The production build currently fails TypeScript.
2. The approval decision API lets any `admin` or `approver` signal any submission workflow if they know a submission ID and task ID.
3. The workflow editor accepts stage types and routing options that the runtime skips or does not implement.
4. Form versioning records schemas but submissions do not actually render historical versions.
5. The form builder stores broad untrusted Form.io JSON without server-side schema hardening or a first-class admin UX for sensitivity and field access.
6. Several spec-critical flows are only partial: notification stages, condition stages, trigger-form stages, submitter revision notifications, approved/rejected notifications, real LDAP/HRIS sync, user/role management, and delegation management.

## Verification Results

- `npm.cmd run lint` fails.
  - `prisma.config.js:1` and `prisma.config.js:2` use CommonJS `require`, blocked by `@typescript-eslint/no-require-imports`.
- `npm.cmd run build` failed inside the sandbox with `spawn EPERM`, then was re-run outside the sandbox.
  - Outside the sandbox, Next.js compiled successfully but failed type checking at `src/app/api/submissions/[id]/route.ts:125`.
  - The failing value is `submission.form.workflowId`, typed as `string | null`, passed to `approvalWorkflow` where `workflowId` must be `string`.

## Critical Blockers

### 1. Production Build Fails

Evidence:

- `src/app/api/submissions/[id]/route.ts:115-129` starts the Temporal workflow for draft submission submit.
- `src/app/api/submissions/[id]/route.ts:125` passes `submission.form.workflowId` without narrowing after only checking it earlier in the draft branch.

Impact:

- The application cannot ship as-is because `next build` fails type checking.
- The code path is also logically fragile: `needs_revision` resubmits signal an existing workflow, but draft submission launch needs a non-null workflow ID.

Recommended fix:

- Explicitly guard `submission.form.workflowId` immediately before `temporal.workflow.start`.
- Add an integration test for submitting a saved draft with and without a workflow.

### 2. Approval Decision Endpoints Lack Resource-Level Authorization

Evidence:

- `src/app/api/submissions/[id]/approve/route.ts:13-26`, `reject/route.ts:13-26`, and `revise/route.ts:13-26` only require `["admin", "approver"]`, parse `taskId`, and signal Temporal.
- They do not verify that the submission exists, the task belongs to that submission, the task is pending, or the current user is the assignee.
- `tests/integration/approval-routes.test.ts:61-97` asserts decisions can be signaled with random UUIDs and no database-backed task.

Impact:

- Any approver can approve, reject, or request revisions for another approver's task if they can guess or obtain IDs.
- Invalid task IDs can still be sent to Temporal and written into audit logs.
- This violates the spec's "resource-level checks on every endpoint" requirement.

Recommended fix:

- Before signaling, load `ApprovalTask` by `{ id: taskId, submissionId: id, status: "pending" }`.
- Require `assignedToId === user.id` unless the actor is an admin performing an explicit reassignment/override flow.
- Return `404` or `403` before writing audit logs or signaling Temporal.
- Update tests so random task IDs are rejected.

## Form Builder and Form Lifecycle

### 3. Form.io Schema Validation Is Too Permissive

Evidence:

- `src/lib/validation/forms.ts:3-13` accepts `schema: z.record(z.string(), z.any())`.
- `src/app/api/forms/route.ts:62-80` and `src/app/api/forms/[id]/route.ts:61-90` persist whatever schema object the client sends.

Impact:

- The server does not enforce a safe Form.io component subset, required submit button, unique keys, valid component nesting, or restricted custom properties.
- The spec explicitly requires Formio schema validation server-side before storage.

Recommended fix:

- Add a dedicated Form.io schema validator that checks `display`, `components`, unique keys, supported component types, field property shape, and submit action presence.
- Reject or strip risky/custom executable Form.io fields before saving.

### 4. Field Sensitivity and Access Controls Are Hidden in Custom Properties

Evidence:

- Builder UI only tells admins to use custom properties in `src/app/admin/forms/[id]/builder/BuilderClient.tsx:177-184`.
- Sensitive fields are detected only when `component.properties.sensitive === "true"` in `src/lib/formio-sensitive-fields.ts:23-64`.
- Field visibility depends on comma-separated `readRoles` and `ownerCanRead` strings in `src/lib/field-access.ts:58-99`.

Impact:

- Non-technical admins, a core target user group in the spec, must know magic property names.
- A typo silently disables encryption or access control.
- Nested and complex Form.io structures such as data grids, edit grids, nested forms, file components, and signatures are not fully modeled by the current walker.

Recommended fix:

- Provide first-class builder controls or a post-builder field settings panel for sensitivity, allowed roles, and owner visibility.
- Validate these settings server-side.
- Expand schema traversal to all Form.io container types the product claims to support.

### 5. Form Versioning Is Stored but Not Used for Rendering

Evidence:

- `FormVersion` rows are created in `src/app/api/forms/route.ts:74-80` and on published schema changes in `src/app/api/forms/[id]/route.ts:83-90`.
- `Submission.formVersion` is stored in `src/app/api/submissions/route.ts:89-98`.
- Submission detail renders `submission.form.schema` in `src/app/submissions/[id]/page.tsx:97-99`, not the schema from the matching `FormVersion`.
- Editing existing submissions also uses the current form schema in `src/app/forms/[slug]/page.tsx:19-57`.

Impact:

- In-flight or historical submissions can be displayed and edited with a newer schema than the one used at submission time.
- This violates the spec's "In-flight submissions always reference the schema version at the time of submission."

Recommended fix:

- Query `FormVersion` by `{ formId, version: submission.formVersion }` for rendering and revision editing.
- Treat missing version rows as data integrity errors.

### 6. Publishing Does Not Require a Runnable Workflow

Evidence:

- `src/app/admin/forms/FormsManagerClient.tsx:134-143` can set `status: "published"` with no workflow validation in the UI.
- `src/app/api/forms/[id]/route.ts:61-81` accepts status changes without checking whether a published form has `workflowId`.
- Submission later fails with `FORM_HAS_NO_WORKFLOW` in `src/app/api/submissions/route.ts:81-87`.

Impact:

- Admins can publish forms that users can open but cannot submit.
- Product readiness should shift this failure left into the publishing step.

Recommended fix:

- Block `published` status unless a workflow is attached and workflow validation passes.
- Surface the reason in the builder and catalog UI.

## Workflow Routing

### 7. The Workflow Runtime Skips Most Stage Types

Evidence:

- `src/lib/validation/workflows.ts:26-50` accepts `approval`, `notification`, `trigger-form`, and `condition`.
- `src/temporal/workflows/approvalWorkflow.ts:87-99` explicitly ignores notification and condition stages and skips every non-approval stage.
- `src/temporal/activities/approvalActivities.ts:180-214` has `createChildSubmission`, but it is not exposed in `proxyActivities` or called by the workflow.

Impact:

- Admins can save workflow definitions that look valid but do nothing at runtime.
- The spec requires notification stages, trigger-form stages, and condition stages.

Recommended fix:

- Either remove unsupported stage types from validation/UI until implemented, or implement them end to end.
- Add tests that prove a workflow containing each supported stage type has the expected runtime behavior.

### 8. Routing Conditions Exist but Are Not Wired Into Workflows

Evidence:

- `src/lib/workflow-conditions.ts:3-10` defines `evaluateCondition`.
- No runtime path calls it.
- `approvalWorkflow.ts:92-95` skips `condition` stages.

Impact:

- Spec examples like `data.budget_amount > 10000` cannot influence routing.
- The current workflow engine is linear approval only.

Recommended fix:

- Define a safe condition context containing submission data, submitter roles/org, form metadata, and workflow state.
- Implement branch/skip semantics and validate expressions before save.

### 9. `submitter.skip-level` Routing Is Accepted but Not Implemented

Evidence:

- `src/domain/workflow.ts:3` and `src/lib/validation/workflows.ts:10-14` include `submitter.skip-level`.
- `src/temporal/activities/orgActivities.ts:62-101` handles `submitter.manager` and `department.head`, then returns `[]`.

Impact:

- Workflows using skip-level routing fail at runtime with "No assignees resolved."

Recommended fix:

- Implement skip-level resolution using org parent/manager relationships, or remove it from the accepted schema until available.

### 10. Workflow Version Is Not Snapshotted on Submission

Evidence:

- `Workflow.version` exists in `prisma/schema.prisma`.
- `Submission` has `workflowRunId` but no `workflowId` or `workflowVersion` snapshot.
- `approvalWorkflow` loads the workflow definition at runtime with `getWorkflowForSubmission` in `src/temporal/activities/approvalActivities.ts:111-125`.

Impact:

- A submission's route may change if an admin edits the workflow after the submission starts but before a later stage is entered or before a retry/replay path reloads the definition.
- The spec says the attached workflow version is stored with the submission.

Recommended fix:

- Add `workflowId` and `workflowVersion` or a workflow definition snapshot to `Submission`.
- Pass the snapshot to Temporal, or fetch by immutable version.

### 11. `onReject` and Branch Targets Are Mostly Ignored

Evidence:

- Workflow schema allows `onReject: "close" | "return-to-submitter" | { goTo: string }` in `src/lib/validation/workflows.ts:39-45`.
- `approvalWorkflow.ts:190-211` always rejects and closes.
- Revision is available as a separate decision independent of `onReject`.

Impact:

- Saved workflow definitions can describe transitions the engine will not honor.

Recommended fix:

- Implement `return-to-submitter` and `goTo`, or restrict validation to behavior that exists.

## Submission Lifecycle

### 12. Revision Requests Do Not Notify Submitters

Evidence:

- `approvalWorkflow.ts:214-239` sets status to `needs_revision` and waits for `resubmittedSignal`.
- There is no activity call to notify the submitter.

Impact:

- The spec requires Resend + in-app notification when revision is requested.
- A submitter may not know action is needed unless they manually check.

Recommended fix:

- Add an activity to notify the submitter with the reviewer note and direct submission link.

### 13. Approved/Rejected Notifications Are Missing

Evidence:

- `approvalWorkflow.ts:173-184`, `190-211`, and `243-251` change final statuses but do not notify submitters.
- `notificationActivities.ts` supports generic notification creation, but the workflow does not call it for final outcomes.

Impact:

- The spec's notification trigger table is incomplete in production behavior.

Recommended fix:

- Add final outcome notification activities and tests for approved/rejected paths.

### 14. Final State Collapses Immediately to `closed`

Evidence:

- `approvalWorkflow.ts:173-182`, `201-209`, and `243-251` set `approved`/`rejected`, then immediately set `closed`.

Impact:

- The `approved` and `rejected` states are effectively transient and may never be visible in list views or reports.
- This may be acceptable if `closed` is the terminal state, but then outcome needs a separate durable field. The spec lists `approved -> closed` and `rejected -> closed`, but product reporting usually needs the final outcome.

Recommended fix:

- Add `outcome` or preserve terminal statuses as `approved`/`rejected`; if `closed` stays, make outcome explicit.

### 15. Draft Save Is Not Exposed in the Public Form UI

Evidence:

- `src/app/api/submissions/route.ts:61-154` supports `saveAsDraft`.
- `src/app/forms/[slug]/SubmitFormClient.tsx:46-54` always sends `saveAsDraft: false`.

Impact:

- The spec says submitters can save drafts, but the primary form experience only submits.

Recommended fix:

- Add "Save draft" and "Submit" actions to the Form.io wrapper.
- Ensure draft save does not require a workflow and does not start Temporal.

## Security and Compliance

### 16. Mutating API Routes Do Not Have Explicit CSRF Protection

Evidence:

- Route handlers use JSON `fetch` posts/puts/patches directly.
- There is no CSRF token or origin validation in route handlers.
- The spec requires CSRF on all mutating routes.

Impact:

- Cookie-authenticated mutations may be vulnerable depending on deployment cookie settings and browser behavior.

Recommended fix:

- Add CSRF/origin checks for all mutating route handlers, or use server actions/forms with built-in protections where appropriate.

### 17. Email HTML Is Built From Unsanitized Strings

Evidence:

- `src/temporal/activities/notificationActivities.ts:42-49` interpolates `input.body` and `input.linkUrl` into HTML.

Impact:

- If notification body or link content ever includes user-controlled values, email HTML injection is possible.

Recommended fix:

- Escape HTML content and validate links against the application base URL.
- Centralize notification templates by type instead of interpolating arbitrary strings.

### 18. Field Encryption Key Handling Needs Hardening

Evidence:

- `src/lib/encryption.ts:5-13` reads `FIELD_ENCRYPTION_KEY` and converts hex to a Buffer.
- There is no validation that it is exactly 32 bytes.
- There is no key ID, rotation metadata, or migration path.

Impact:

- Misconfigured keys fail at runtime.
- Rotation is called out as required before go-live in the spec but is not implemented.

Recommended fix:

- Validate key length on boot and expose a clear startup error.
- Add encryption metadata and a re-encryption migration script.

### 19. Audit Log Is Not Append-Only at the Database Permission Level

Evidence:

- `AuditLog` is a normal Prisma model in `prisma/schema.prisma`.
- `writeAuditLog` inserts rows, but there is no migration-level role separation or UPDATE/DELETE restriction.

Impact:

- The app can theoretically modify or delete audit rows if code is added or compromised.
- The spec explicitly requires no UPDATE/DELETE privileges for the application database role.

Recommended fix:

- Split audit insertion into a least-privilege DB role or stored procedure.
- Add database-level grants/revokes in deployment migrations.

### 20. Sensitive/PII List Visibility Is Too Broad

Evidence:

- `submissionVisibilityWhere` gives admins and compliance global visibility in `src/lib/submission-visibility.ts:7-9`.
- Approvers can see any submission where they have any approval task in `src/lib/submission-visibility.ts:11-23`.
- The spec says PII is excluded from default list views and sensitive fields/visibility are restricted.

Impact:

- The current scope is a reasonable first pass, but it does not implement default PII exclusion or configurable team scope.

Recommended fix:

- Add list-view sensitivity filters by role and explicit "include PII/sensitive" audit-aware paths.

## Org Sync, Users, and Delegation

### 21. LDAP/HRIS Sync Is a Development Stub

Evidence:

- `src/app/api/org/sync/route.ts:3-18` always uses `devOrgAdapter`.
- `src/jobs/devOrgAdapter.ts` hardcodes two users and one department.
- `src/jobs/orgSync.ts:4-82` upserts incoming records but does not diff deletions, remove stale memberships, or flag open tasks for deactivated users.

Impact:

- The spec's LDAP/HRIS source is not implemented.
- Manual sync can create demo data, not production directory state.

Recommended fix:

- Add real adapter selection/configuration.
- Implement full diff sync, stale membership deletion, user deactivation behavior, and open-task admin alerts.

### 22. User/Role Management Is Read-Only

Evidence:

- `src/app/admin/users/page.tsx` displays users, roles, memberships, and delegations.
- There are no routes or UI to assign roles or manage delegation windows.

Impact:

- Admins cannot perform the role management required by the spec.
- Approvers cannot designate delegates.

Recommended fix:

- Add admin role-management endpoints and UI.
- Add self-service delegation management with date-range validation.

## Architecture and Maintainability

### 23. Business Logic Is Spread Across Route Handlers, Pages, and Temporal Activities

Evidence:

- Form lifecycle logic sits in route handlers.
- Visibility logic is in `src/lib/submission-visibility.ts` and `src/lib/submissions.ts`.
- Workflow state logic is in Temporal workflows and activities.
- UI pages sometimes query Prisma directly.

Impact:

- Authorization and lifecycle invariants are easy to miss, as seen in approval decision routes and version rendering.

Recommended fix:

- Introduce service-layer functions for form publishing, submission creation/resubmission, decision authorization, and workflow snapshotting.
- Keep Prisma access behind those functions for write paths.

### 24. Runtime and Schema Contracts Are Duplicated

Evidence:

- Workflow types are in `src/domain/workflow.ts`.
- Validation is separately defined in `src/lib/validation/workflows.ts`.
- Runtime behavior in `approvalWorkflow.ts` supports a narrower subset.

Impact:

- Contracts drift. The app already accepts unsupported workflow features.

Recommended fix:

- Generate TypeScript types from Zod schemas or export inferred types from validation schemas.
- Add runtime capability tests for each accepted stage type and routing target.

### 25. Temporal Client Connections Are Created Per Request

Evidence:

- `src/lib/temporal.ts:1-11` connects and creates a new Temporal client every call.

Impact:

- Under load, API routes may create many connections.

Recommended fix:

- Cache the Temporal connection/client per process where safe.

## Test Coverage Gaps

Existing coverage is useful but currently happy-path heavy. Important missing tests:

- Build/typecheck in CI must be required, since current build fails.
- Approval decision route rejects non-assigned approvers, random task IDs, non-pending tasks, and task/submission mismatches.
- Draft submission submit path with and without workflow.
- Workflow definitions containing unsupported stages should either be rejected or executed.
- Workflow condition routing and `submitter.skip-level`.
- Form version rendering after schema changes.
- Field access and encryption for nested Form.io containers.
- Submitter notifications for revision, approval, and rejection.
- CSRF/origin protection on mutating endpoints.
- Org sync diff/deletion behavior.

## Product Completion Checklist

Minimum needed before calling this finished:

- Fix lint and production build.
- Close approval authorization holes.
- Align workflow validation/UI with actual runtime behavior.
- Implement or intentionally remove unsupported workflow stage types.
- Snapshot workflow and form schema versions for submissions.
- Add first-class field sensitivity/access UX and server validation.
- Add draft save UX.
- Complete notification trigger matrix.
- Replace dev org adapter with real LDAP/HRIS integration path.
- Add role and delegation management.
- Add CSRF protection and email/template sanitization.
- Add audit-log immutability and pagination/export hardening.
- Require build, lint, integration, and smoke e2e in CI.
