# FormFlow — API Reference

All API routes are under `/api/`. Every response is JSON. Errors follow a consistent shape:

```json
{ "code": "ERROR_CODE", "message": "Human-readable message" }
```

## Authentication

All routes require a valid NextAuth session cookie. Unauthenticated requests receive `401 Unauthorized`.

## Mutation Protection

All `POST`, `PATCH`, and `DELETE` routes require:

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

**Auth:** None required (session cookie is enough)

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

Get a single form by ID.

### `PATCH /api/forms/[id]`

Update a form. **Admin only.** Updating `schema` on a published form creates a new `FormVersion` snapshot and increments `version`.

**Body:** Partial form fields — any of `title`, `slug`, `schema`, `sensitivity`, `workflowId`, `status`.

### `POST /api/forms/[id]/publish`

Publish a draft form. Validates that the attached workflow has valid routing targets before publishing. **Admin only.**

**Response `200`:** `{ "form": { … } }`

**Errors:**
- `409 WORKFLOW_TARGET_INVALID` — a workflow stage references a user, role, or org that does not exist

---

## Submissions

### `GET /api/submissions`

List submissions visible to the current user.

- **Submitters** see their own submissions
- **Approvers** see submissions with a pending task assigned to them (and all submissions in their org scope if `teamScope` is enabled)
- **Admin / Compliance** see all submissions (with optional sensitive filter — requires break-glass grant)

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `status` | `SubmissionStatus` | Filter by status |
| `formId` | UUID | Filter by form |
| `sensitivity` | `standard \| pii \| sensitive` | Filter by sensitivity |
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

Get a single submission. Sensitive submissions require the `X-Break-Glass-Reason` header (minimum 10 characters). The access is always audited.

**Headers (sensitive forms only):**
```
X-Break-Glass-Reason: Reviewing for compliance audit, case ref #1234
```

**Errors:**
- `404` — not found or not visible to user
- `428 BREAK_GLASS_REQUIRED` — sensitive submission, reason header missing or too short

### `PATCH /api/submissions/[id]`

Update a submission. Only the submission owner can edit. Only `draft` and `needs_revision` submissions are editable.

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
- `409 SUBMISSION_NOT_EDITABLE` — wrong status
- `409 FORM_HAS_NO_WORKFLOW` — form has no attached workflow (required for submission)

### `POST /api/submissions/[id]/approve`

Approve a submission at the current workflow stage. **Approver or Admin only.**

**Body:**
```json
{ "taskId": "uuid", "note": "Approved — all documents present." }
```

### `POST /api/submissions/[id]/reject`

Reject a submission. **Approver or Admin only.**

**Body:**
```json
{ "taskId": "uuid", "note": "Missing transcript." }
```

### `POST /api/submissions/[id]/request-revision`

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

### `PATCH /api/workflows/[id]`

Update a workflow. Increments `version`. **Admin only.**

### `DELETE /api/workflows/[id]`

Delete a workflow. Fails if any published forms reference it. **Admin only.**

---

## Users

### `GET /api/users`

List all users. **Admin only.**

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `role` | role name | Filter by role |
| `q` | string | Search by name or email |

### `POST /api/users`

Create a local user (not LDAP). **Admin only.**

**Body:**
```json
{
  "email": "max.mustermann@uni-weimar.de",
  "name": "Max Mustermann",
  "password": "…",
  "roles": ["submitter"]
}
```

### `PATCH /api/users/[id]`

Update a user's roles or deactivation status. **Admin only.**

**Body:** Any of `roles`, `deactivatedAt`, `name`.

---

## Delegations

### `GET /api/delegations`

List the current user's active delegations.

### `POST /api/delegations`

Create a delegation window. The current user nominates a delegate to cover their approvals for a time range.

**Body:**
```json
{
  "delegateId": "uuid",
  "startsAt": "2026-06-01T00:00:00Z",
  "endsAt": "2026-06-07T23:59:59Z"
}
```

**Errors:**
- `409 DELEGATION_OVERLAP` — existing delegation overlaps the requested window

### `DELETE /api/delegations/[id]`

Remove a delegation. Only the delegation owner can delete it.

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

**Response `200` (JSON):**
```json
{
  "entries": [
    {
      "id": "uuid",
      "actorId": "uuid",
      "action": "submission.created",
      "resourceType": "submission",
      "resourceId": "uuid",
      "beforeState": null,
      "afterState": { … },
      "metadata": { … },
      "createdAt": "…"
    }
  ],
  "total": 1234,
  "page": 1,
  "pageSize": 50
}
```

**Common `action` values:**

| Action | Trigger |
|---|---|
| `submission.created` | Submission submitted from draft |
| `submission.resubmitted` | Revision submitted back to workflow |
| `submission.approved` | Final approval |
| `submission.rejected` | Final rejection |
| `submission.accessed` | Submission detail viewed |
| `sensitive.accessed` | Sensitive submission viewed (with reason) |
| `sensitive.list_accessed` | Admin sensitive list viewed (with reason) |
| `auth.login_failed` | Failed login (includes reason: `invalid_credentials`, `rate_limited`, `account_locked`, `deactivated`) |
| `auth.login_success` | Successful login |
| `user.role_changed` | Admin changed a user's roles |

---

## Org Sync

### `POST /api/org/sync`

Trigger an immediate LDAP org sync. **Admin only.**

**Response `202`:** `{ "message": "Org sync triggered." }`

---

## Notifications

### `GET /api/notifications`

List the current user's unread notifications (polled by the inbox component).

### `PATCH /api/notifications/[id]`

Mark a notification as read.

**Body:**
```json
{ "readAt": "2026-05-27T10:00:00Z" }
```
