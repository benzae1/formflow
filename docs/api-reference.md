# FormFlow — API Reference

All API routes are under `/api/`. Every response is JSON. Errors follow a consistent shape:

```json
{ "code": "ERROR_CODE", "message": "Human-readable message" }
```

## Authentication

All routes require a valid NextAuth session cookie. Unauthenticated requests receive `401 Unauthorized`.

## Mutation Protection

All `POST`, `PUT`, and `DELETE` routes require:

| Header | Value |
|---|---|
| `x-formflow-intent` | `mutation` |
| `x-csrf-token` | Value from `GET /api/csrf` |
| `Origin` | Must match `APP_URL` / `NEXTAUTH_URL` |
| `Referer` | Must be present and origin must match |

The CSRF token is fetched fresh before each mutation. Helper: `src/lib/mutation-headers.ts`.

---

## Auth

### `GET /api/csrf`

Returns a signed CSRF token. Call this before any mutation.

**Auth:** Session cookie required

**Response:**
```json
{ "csrfToken": "<token>" }
```

### `POST /api/auth/callback/credentials`

NextAuth credential provider endpoint. Accepts username/password (LDAP or local).

**Body:**
```json
{ "username": "sowa2176", "password": "…" }
```

**Errors:**
- `429` — rate limited
- `401` — invalid credentials, locked account, or deactivated user

---

## Health

### `GET /api/health`

Returns the operational status of the database and Temporal connections. Public (no auth required).

**Response `200`:**
```json
{
  "ok": true,
  "checks": {
    "database": { "ok": true },
    "temporal": { "ok": true }
  },
  "checkedAt": "2026-05-27T10:00:00.000Z"
}
```

**Response `503`** — one or more checks failed (same shape, `ok: false`).

---

## Forms

### `GET /api/forms`

List all forms. Admins see all forms; other roles see only published forms.

**Auth:** Any authenticated user

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `status` | `draft \| published \| archived` | Filter by status |

**Response:**
```json
{
  "forms": [
    {
      "id": "uuid",
      "slug": "emailantrag",
      "title": "E-Mail-Antrag",
      "status": "published",
      "sensitivity": "standard",
      "version": 3,
      "workflowId": "uuid",
      "createdAt": "…",
      "updatedAt": "…"
    }
  ]
}
```

### `POST /api/forms`

Create a new form (draft). **Admin only.**

**Body:**
```json
{
  "title": "My Form",
  "slug": "my-form",
  "schema": { /* Form.io schema */ },
  "sensitivity": "standard",
  "workflowId": "uuid"
}
```

**Response `201`:** `{ "form": { … } }`

### `GET /api/forms/[id]`

Get a single form by ID, including attached workflow and version history. **Admin only.**

### `PUT /api/forms/[id]`

Update a form. **Admin only.**

Updating `schema` or `title` on a published form automatically creates a new `FormVersion` snapshot and increments `version`. Publishing (setting `status` to `published`) requires a workflow to be attached and validates all workflow routing targets.

**Body:** Any subset of:
```json
{
  "title": "…",
  "slug": "…",
  "schema": { /* Form.io schema */ },
  "translations": { "en": { /* translated labels */ } },
  "sensitivity": "standard",
  "workflowId": "uuid",
  "parentFormId": "uuid",
  "status": "published"
}
```

**Response `200`:** `{ "form": { … } }`

**Errors:**
- `409 FORM_HAS_NO_WORKFLOW` — attempting to publish without a workflow
- `404 WORKFLOW_NOT_FOUND` / `404 PARENT_FORM_NOT_FOUND` — referenced ID does not exist

### `POST /api/forms/[id]/translate-draft`

Generate a draft English translation of the form using DeepL. **Admin only.** Requires `DEEPL_API_KEY` to be configured; returns `409 TRANSLATION_UNAVAILABLE` otherwise.

The generated translation is saved to the form's `translations.en` field. It should be reviewed before publishing.

**Response `200`:** `{ "translation": { … }, "form": { … } }`

---

## Submissions

### `GET /api/submissions`

List submissions visible to the current user.

- **Submitters** see their own submissions only
- **Approvers** see submissions with a pending task assigned to them (and, if `teamScope` is enabled on their account, all submissions from their org unit)
- **Admin / Compliance** see all submissions; sensitive submissions require a break-glass grant

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `status` | `SubmissionStatus` | Filter by status |
| `formId` | UUID | Filter by form |
| `sensitivity` | `standard \| pii \| sensitive` | Filter by sensitivity level |
| `includeSensitive` | `true` | Include sensitive submissions (requires break-glass grant) |

### `POST /api/submissions`

Create a new draft submission for a published form.

**Body:**
```json
{
  "formId": "uuid",
  "data": { /* Form.io submission data */ }
}
```

**Response `201`:** `{ "submission": { … } }`

### `GET /api/submissions/[id]`

Get a single submission. Sensitive submissions require the `X-Break-Glass-Reason` header (minimum 10 characters). Access is always audited.

**Headers (sensitive forms only):**
```
X-Break-Glass-Reason: Reviewing for compliance audit, case ref #1234
```

**Errors:**
- `404` — not found or not visible to the current user
- `428 BREAK_GLASS_REQUIRED` — sensitive submission; reason header missing or too short

### `PATCH /api/submissions/[id]`

Update a submission's data. Only the submission owner can edit. Only `draft` and `needs_revision` submissions are editable.

**Body:**
```json
{
  "data": { /* updated form data */ },
  "submit": true
}
```

Setting `submit: true` on a `draft` submission transitions it to `submitted` and starts the Temporal approval workflow. Setting `submit: true` on a `needs_revision` submission sends a `resubmitted` signal to the running workflow.

**Errors:**
- `403 FORBIDDEN` — not the submission owner
- `409 SUBMISSION_NOT_EDITABLE` — submission is not in an editable status
- `409 FORM_HAS_NO_WORKFLOW` — form has no attached workflow (required to submit)

### `POST /api/submissions/[id]/approve`

Approve the current workflow stage. **Approver or Admin only.**

**Body:**
```json
{ "taskId": "uuid", "note": "Approved — all documents present." }
```

### `POST /api/submissions/[id]/reject`

Reject the submission. **Approver or Admin only.**

**Body:**
```json
{ "taskId": "uuid", "note": "Missing transcript." }
```

### `POST /api/submissions/[id]/revise`

Request changes from the submitter. **Approver or Admin only.**

**Body:**
```json
{ "taskId": "uuid", "note": "Please attach the signed form." }
```

---

## Workflows

### `GET /api/workflows`

List all workflows. **Admin only.**

**Response:**
```json
{
  "workflows": [
    {
      "id": "uuid",
      "name": "Standard Approval",
      "version": 2,
      "definition": [ /* WorkflowStage[] */ ],
      "createdAt": "…"
    }
  ]
}
```

### `POST /api/workflows`

Create a new workflow. **Admin only.**

**Body:**
```json
{
  "name": "Two-Stage Approval",
  "definition": [ /* WorkflowStage[] */ ]
}
```

See [workflow-authoring.md](workflow-authoring.md) for the `WorkflowStage` schema.

### `GET /api/workflows/[id]`

Get a single workflow, including attached forms. **Admin only.**

### `PUT /api/workflows/[id]`

Update a workflow name and definition. Increments `version`. **Admin only.**

**Body:**
```json
{
  "name": "…",
  "definition": [ /* WorkflowStage[] */ ]
}
```

---

## Users

> **Note:** There are no REST API endpoints for listing or creating users. User management is handled server-side via the admin UI pages. The only user-related API endpoint is role assignment.

### `PATCH /api/users/[id]/roles`

Update a user's roles and team scope setting. **Admin only.** Immediately increments `sessionVersion`, invalidating the user's existing sessions.

**Body:**
```json
{
  "roles": ["approver", "submitter"],
  "teamScope": false
}
```

**Response `200`:** `{ "user": { … } }`

**Errors:**
- `400 ROLE_NOT_FOUND` — one of the supplied role names does not exist
- `404 USER_NOT_FOUND` — user does not exist

---

## Delegations

### `POST /api/delegations`

Create a delegation window. An approver nominates a delegate to cover their approvals for a time range. Admins can create delegations on behalf of any approver by supplying `approverId`; non-admins can only create delegations for themselves.

**Auth:** Approver or Admin

**Body:**
```json
{
  "delegateId": "uuid",
  "startsAt": "2026-06-01T00:00:00Z",
  "endsAt": "2026-06-07T23:59:59Z",
  "approverId": "uuid"
}
```

(`approverId` is optional for admins; ignored for approvers.)

**Response `201`:** `{ "delegation": { … } }`

**Errors:**
- `409 DELEGATION_OVERLAP` — existing delegation overlaps the requested window
- `409 DELEGATION_SELF_NOT_ALLOWED` — approver and delegate are the same user
- `409 DELEGATION_APPROVER_ROLE_REQUIRED` — the approver account lacks the approver role
- `409 DELEGATION_DELEGATE_ROLE_REQUIRED` — the delegate account lacks the approver role
- `409 DELEGATION_INACTIVE_USER` — approver or delegate is deactivated

### `DELETE /api/delegations/[id]`

Remove a delegation. Approvers can only delete their own; admins can delete any.

---

## Sensitive Access (Break-Glass)

### `POST /api/sensitive-access`

Create a short-lived access grant for a sensitive submission or sensitive submission list. The grant is stored as an HMAC-SHA256 signed cookie with a 10-minute TTL.

**Body:**
```json
{
  "scope": "submission:uuid",
  "reason": "Compliance audit, case #1234 — minimum 10 characters required"
}
```

`scope` values:
- `submission:<id>` — grant for a specific submission detail page
- `admin-submissions` — grant for the admin submissions console with sensitive filters

**Response `200`:** Sets a signed `sensitive_access` cookie.

**Errors:**
- `400` — reason too short (minimum 10 characters)

---

## Audit Log

### `GET /api/audit-log`

Retrieve audit log entries. **Admin or Compliance only.**

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `actorId` | UUID | Filter by actor |
| `action` | string | Filter by action (e.g. `submission.created`) |
| `resourceType` | string | Filter by resource type |
| `resourceId` | UUID | Filter by specific resource |
| `from` | ISO date | Start of date range |
| `to` | ISO date | End of date range |
| `page` | integer | Page number (default: 1) |
| `pageSize` | integer | Results per page (default: 50, max: 200) |
| `format` | `csv` | Download as CSV instead of JSON |

**Common `action` values:**

| Action | Trigger |
|---|---|
| `submission.created` | Submission submitted from draft |
| `submission.resubmitted` | Revision submitted back to workflow |
| `submission.accessed` | Submission detail viewed |
| `sensitive.accessed` | Sensitive submission viewed (includes reason) |
| `sensitive.list_accessed` | Admin sensitive list viewed (includes reason) |
| `form.updated` | Form schema or metadata changed |
| `form.published` | Form status changed to published |
| `form.translation_draft_generated` | DeepL translation generated |
| `workflow.updated` | Workflow definition changed |
| `user.role_changed` | Admin changed a user's roles |
| `delegation.created` | Delegation window created |
| `auth.login_failed` | Failed login (reason: `invalid_credentials`, `rate_limited`, `account_locked`, `deactivated`) |
| `auth.login_success` | Successful login |

---

## Org Sync

### `POST /api/org/sync`

Trigger an immediate LDAP org sync. **Admin only.**

**Response `202`:** Triggers the sync; does not wait for completion.

---

## Notifications

### `GET /api/notifications/unread`

Get the current user's unread notification count and the 10 most recent unread items.

**Response:**
```json
{
  "count": 3,
  "items": [
    {
      "id": "uuid",
      "type": "submission_revision_requested",
      "title": "Revision requested",
      "body": "An approver requested changes to your submission.",
      "linkUrl": "/submissions/uuid",
      "readAt": null,
      "createdAt": "…"
    }
  ]
}
```

### `POST /api/notifications/[id]/read`

Mark a specific notification as read.

**Response `200`:** `{ "ok": true }`
