# FormFlow API reference

All application endpoints are under `/api`. JSON errors have the shape `{ "error": { "code": "...", "message": "...", "status": 400 } }`. NextAuth owns `/api/auth/*` and may use its own response conventions.

## Authentication and mutation contract

Except for `GET /api/health`, `GET /api/csrf`, and NextAuth's own endpoints, routes require a valid session.

Every application `POST`, `PUT`, `PATCH`, or `DELETE` request must include:

```text
x-formflow-intent: mutation
x-csrf-token: <value returned by GET /api/csrf>
Origin: <allowed app origin>
Referer: <URL on allowed app origin>
Cookie: formflow-csrf=<same token>; <NextAuth session cookie>
```

Use `getMutationHeaders()` in the web client. `GET /api/csrf` is public and sets the CSRF cookie.

## Route summary

| Method and path | Access | Behavior |
|---|---|---|
| `GET /api/health` | Public | Checks PostgreSQL and Temporal; 200/503 |
| `GET /api/csrf` | Public | Issues CSRF cookie/token |
| `GET /api/forms` | Admin | Lists all forms with workflow and allowed roles |
| `POST /api/forms` | Admin | Creates a draft form and version 1 snapshot |
| `GET /api/forms/:id` | Admin | Returns form, workflow, allowed roles, versions |
| `PUT /api/forms/:id` | Admin | Updates metadata/schema/status/access |
| `POST /api/forms/:id/translate-draft` | Admin | Generates and stores English DeepL draft |
| `GET /api/workflows` | Admin | Lists workflows |
| `POST /api/workflows` | Admin | Creates a validated workflow |
| `GET /api/workflows/:id` | Admin | Returns workflow and attached forms |
| `PUT /api/workflows/:id` | Admin | Replaces definition/name and increments version |
| `GET /api/roles` | Admin | Lists built-in and custom roles |
| `POST /api/roles` | Admin | Creates custom role |
| `PUT /api/roles/:id` | Admin | Renames/relabels when references permit |
| `DELETE /api/roles/:id` | Admin | Deletes safe, unreferenced custom role |
| `PATCH /api/users/:id/roles` | Admin | Replaces roles/team scope without revoking sessions |
| `GET /api/submissions` | Authenticated | Lists records visible to current user |
| `POST /api/submissions` | Authenticated + form access | Saves draft or submits immediately |
| `GET /api/submissions/:id` | Visible user | Returns filtered/decrypted detail; sensitive grant when required |
| `PATCH /api/submissions/:id` | Owner | Saves or submits editable draft/revision |
| `POST /api/submissions/:id/approve` | Assigned task owner | Signals approval |
| `POST /api/submissions/:id/reject` | Assigned task owner | Signals rejection |
| `POST /api/submissions/:id/revise` | Assigned task owner | Signals revision request |
| `POST /api/sensitive-access` | Authenticated | Creates signed ten-minute access grant |
| `POST /api/delegations` | Admin/approver | Creates validated delegation window |
| `DELETE /api/delegations/:id` | Admin/owning approver | Deletes delegation |
| `GET /api/notifications/unread` | Authenticated | Unread count and 20 newest items, including read items |
| `POST /api/notifications/:id/read` | Owner | Marks own notification read |
| `POST /api/notifications/read-all` | Authenticated | Marks all own unread notifications read |
| `GET /api/audit-log` | Admin/compliance | Cursor page or CSV of audit events |
| `POST /api/org/sync` | Admin | Runs org reconciliation synchronously |

There are no form/workflow delete endpoints, no general users list/create/deactivate REST endpoint, no delegation list endpoint, and no published-form list API for non-admin clients.

## Forms

### Create/update input

```json
{
  "slug": "travel-request",
  "title": "Reiseantrag",
  "schema": {
    "display": "form",
    "components": [{ "type": "button", "key": "submit", "action": "submit", "label": "Absenden" }]
  },
  "translations": null,
  "sensitivity": "standard",
  "workflowId": null,
  "parentFormId": null,
  "allowedRoleNames": ["submitter"],
  "status": "published"
}
```

`status` is update-only. `slug`, `title`, and `schema` are required on create. Empty `allowedRoleNames` means every authenticated role can use the published form; admins always have form access. A published form must have a runnable workflow. Referenced roles/users/groups/org resolvers, child forms, and `goTo` stages are validated. The code checks that a child form exists, but does not currently require it to be published despite older documentation.

Changing title, schema, or translations while already published increments `version` and snapshots the new state after update. Metadata-only changes do not bump the form version.

DeepL draft translation requires `DEEPL_API_KEY`; it translates the German base title/schema into `translations.en` with `reviewStatus: "needs_review"`.

## Workflows

Create/update body:

```json
{
  "name": "Department approval",
  "definition": [
    {
      "id": "review",
      "name": "Review",
      "type": "approval",
      "assignTo": { "type": "role", "value": "approver" },
      "onApprove": "close",
      "onReject": "return-to-submitter"
    }
  ]
}
```

See the workflow authoring guide for the complete stage schema. `PUT` replaces both name and definition rather than applying a partial update.

## Roles and users

Custom role names are lowercase slugs. Built-in `admin`, `approver`, `compliance`, and `submitter` roles cannot be renamed/deleted. Custom role rename/delete is blocked while referenced by users, form field read rules, workflow targets, or relevant pending pooled approval tasks.

User role update body:

```json
{ "roles": ["approver", "submitter"], "teamScope": false }
```

It replaces the complete role set but does not increment `sessionVersion`. Existing sessions remain valid; the JWT callback reloads effective roles from PostgreSQL during session processing. Consumers must test the timing of privilege removal and use a separate session-revocation mechanism when immediate invalidation is required.

## Submissions

### List

Optional query parameters are `status`, `formId`, `sensitivity`, and `includeSensitive=true`. These strings are not fully schema-validated before Prisma casts, so callers must use actual enum/UUID values.

- Owners see their own records.
- Approvers additionally see records with tasks assigned to them; `teamScope` adds submissions from the same org units.
- Admin/compliance see only `standard` records by default.
- Admin/compliance requests for `pii`/`sensitive` filters or `includeSensitive=true` require an `admin-submissions` sensitive-access grant.

Every list call creates a list-access audit row. Returned field data is filtered using schema field read rules.

### Create

```json
{
  "formId": "uuid",
  "data": { "field": "value" },
  "saveAsDraft": false,
  "parentSubmissionId": null
}
```

The form must be published and allowed for the user's roles. Unknown keys/types are rejected according to the localized schema. Sensitive fields are encrypted. The default `saveAsDraft: false` starts the Temporal workflow immediately; `true` leaves status `draft` and allows a form without a workflow. If the initial Temporal start fails, the newly created submission is deleted and the API returns 503 `WORKFLOW_UNAVAILABLE`; the browser keeps the entered field values available for retry.

### Read/update

Detail reads use record visibility. A form with sensitivity `sensitive` requires a `submission:<id>` grant. `pii` detail reads currently do not require that per-record grant. Access is audited, and data is decrypted then filtered for the caller.

Owner update body:

```json
{ "data": { "field": "new value" }, "submit": true }
```

Only `draft` and `needs_revision` are editable. `submit` starts a draft's snapshotted workflow or signals `resubmitted` for a revision. Saving a revision with `submit` omitted/false does not advance the workflow. A reported case where resubmission remains in `needs_revision` and fails to restore the approver task is retained as a P1 defect in the handoff audit despite the existing happy-path browser case.

### Decisions

```json
{ "taskId": "uuid", "note": "Optional note" }
```

The caller must own that exact pending task; possessing `admin` or `approver` alone is insufficient. The endpoint records a signal audit event and returns before the Temporal worker necessarily applies the task/status change.

## Sensitive-access grant

```json
{
  "scope": "submission:uuid",
  "reason": "Case review reference 1234"
}
```

Scopes are `submission:<id>` or `admin-submissions`. The trimmed reason must have at least ten characters. A successful response sets the HttpOnly, SameSite=Lax `formflow-sensitive-access` cookie for ten minutes and audits grant creation. The current cookie builder stores only the newly created grant, so creating another grant replaces prior scopes in that cookie.

## Delegations

```json
{
  "delegateId": "uuid",
  "startsAt": "2026-08-10T00:00:00Z",
  "endsAt": "2026-08-20T00:00:00Z",
  "approverId": "uuid"
}
```

Non-admin approvers can act only for themselves. Both sides must be active and have `approver` or `admin`; self-delegation and overlapping windows are rejected. Delegation is currently consulted only when a pending task becomes overdue, not at initial task creation.

## Notifications

Despite its name, `GET /api/notifications/unread` returns the unread count plus the 20 newest notifications whether read or unread. Opening the notification panel calls `POST /api/notifications/read-all`, clears the count, and keeps those recent items visible. The single-item read route remains available but the current panel no longer uses it.

## Audit log

`GET /api/audit-log` accepts exact `action`, `resourceType`, `actorId`, a row-ID `cursor`, and `format=csv`. Page size is fixed at 50; JSON returns `{ logs, nextCursor }`. CSV exports only the current 50-row slice and columns `createdAt`, `action`, `resourceType`, `resourceId`, and `actorId`.

The endpoint does not implement the old `from`, `to`, `resourceId`, `page`, or `pageSize` parameters.
