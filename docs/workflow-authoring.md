# FormFlow — Workflow Authoring Guide

A **workflow** is a JSON array of stages that controls what happens after a form is submitted. The workflow runs inside Temporal, which means it is durable — it survives process restarts and can wait for human decisions for days or weeks.

Workflows are created in the admin panel at `/de/admin/workflows` and then attached to a form before it is published.

---

## Workflow Definition Schema

A workflow definition is an array of `WorkflowStage` objects:

```typescript
type WorkflowDefinition = WorkflowStage[];

type WorkflowStage = {
  id: string;                          // Unique identifier within the workflow
  name: string;                        // Display name shown to users
  type: "approval" | "notification" | "trigger-form" | "condition";
  assignTo?: RoutingTarget | RoutingTarget[];  // Who receives the task (approval stages)
  childFormId?: string;                // Form to trigger (trigger-form stages)
  conditions?: RoutingCondition[];     // Expressions to evaluate (condition stages)
  sla?: {
    hours: number;                     // Hours until the task is overdue
    reminderAt: number[];              // Hours before SLA breach to send reminders, e.g. [24, 2]
  };
  onApprove?: "next-stage" | "close"; // What happens when approved
  onReject?: "close" | "return-to-submitter" | { goTo: string }; // What happens when rejected
};
```

Stages are executed in array order. The workflow ends when it reaches the last stage or when a stage produces a `close` outcome.

---

## Stage Types

### `approval`

Creates an `ApprovalTask` and waits for the assigned approver to act. The approver can approve, reject, or request a revision.

**Required fields:** `id`, `name`, `type`, `assignTo`

**Optional fields:** `sla`, `onApprove`, `onReject`

```json
{
  "id": "stage-1",
  "name": "Department Review",
  "type": "approval",
  "assignTo": { "type": "role", "value": "approver" },
  "sla": {
    "hours": 72,
    "reminderAt": [48, 24, 2]
  },
  "onApprove": "next-stage",
  "onReject": "return-to-submitter"
}
```

If `onApprove` is omitted, it defaults to `"next-stage"` (or `"close"` if this is the last stage).
If `onReject` is omitted, it defaults to `"close"`.

### `notification`

Sends an in-app notification (and optionally an email) without waiting for a human response. Execution continues immediately to the next stage.

**Required fields:** `id`, `name`, `type`, `assignTo`

```json
{
  "id": "notify-admin",
  "name": "Notify Administrator",
  "type": "notification",
  "assignTo": { "type": "role", "value": "admin" }
}
```

### `trigger-form`

Starts a new submission of a linked child form. The child form goes through its own workflow independently. The parent workflow continues immediately (trigger-and-forget).

**Required fields:** `id`, `name`, `type`, `childFormId`

```json
{
  "id": "trigger-it-ticket",
  "name": "Create IT Ticket",
  "type": "trigger-form",
  "childFormId": "uuid-of-it-request-form"
}
```

### `condition`

Evaluates one or more boolean expressions against the submission data. Routes to the next stage based on the result. If no condition matches, the workflow closes.

**Required fields:** `id`, `name`, `type`, `conditions`

```json
{
  "id": "check-department",
  "name": "Route by Department",
  "type": "condition",
  "conditions": [
    { "expression": "data.department === 'informatik'" }
  ]
}
```

Condition expressions are evaluated with the submission `data` object in scope. The expression must return a boolean.

---

## Routing Targets (`assignTo`)

The `assignTo` field controls who receives an approval task or notification.

### Role target

Assigns to all users with a specific role.

```json
{ "type": "role", "value": "approver" }
```

### User target

Assigns to a specific user by their database UUID.

```json
{ "type": "user", "value": "user-uuid" }
```

### Org target

Assigns based on the submitter's position in the org unit tree. Requires the org sync to have populated `OrgMembership` records.

```json
{ "type": "org", "value": "submitter.manager" }
```

| Org value | Resolves to |
|---|---|
| `submitter.manager` | The user flagged as `isManager` in the submitter's org unit |
| `submitter.skip-level` | The manager of the submitter's manager |
| `department.head` | The top-level manager in the submitter's department tree |

### Group target

Assigns to members of a named org unit (matched by `externalId`).

```json
{ "type": "group", "value": "ou=informatik,o=uni" }
```

### Multiple targets

Pass an array to assign to multiple targets simultaneously (all receive the task):

```json
{
  "assignTo": [
    { "type": "role", "value": "approver" },
    { "type": "user", "value": "user-uuid" }
  ]
}
```

---

## SLA and Reminders

The `sla` field sets a deadline for approval stages.

```json
"sla": {
  "hours": 72,
  "reminderAt": [48, 24, 2]
}
```

- `hours` — the task is marked overdue after this many hours
- `reminderAt` — array of hours *before* the SLA deadline at which reminder notifications are sent

When an SLA breach occurs, the workflow checks for an active delegation (`Delegation` table) and may reassign the task to the delegate.

---

## Rejection Routing

The `onReject` field controls what happens when an approver rejects:

| Value | Behaviour |
|---|---|
| `"close"` | Submission moves to `rejected` status and the workflow ends |
| `"return-to-submitter"` | Submission moves to `needs_revision`; submitter can edit and resubmit |
| `{ "goTo": "stage-id" }` | Jump to a specific stage by ID (useful for conditional re-review) |

---

## Example Workflows

### Single-stage approval

The simplest possible workflow: one approver, no SLA, rejection closes the case.

```json
[
  {
    "id": "review",
    "name": "Approval",
    "type": "approval",
    "assignTo": { "type": "role", "value": "approver" },
    "onApprove": "close",
    "onReject": "close"
  }
]
```

### Two-stage approval with revision path

Department head reviews first; if approved, the admin does a final check. Rejection at either stage returns the submission to the submitter for revision.

```json
[
  {
    "id": "dept-review",
    "name": "Department Head Review",
    "type": "approval",
    "assignTo": { "type": "org", "value": "submitter.manager" },
    "sla": { "hours": 48, "reminderAt": [24, 2] },
    "onApprove": "next-stage",
    "onReject": "return-to-submitter"
  },
  {
    "id": "admin-review",
    "name": "Administrative Final Check",
    "type": "approval",
    "assignTo": { "type": "role", "value": "admin" },
    "sla": { "hours": 24, "reminderAt": [12, 2] },
    "onApprove": "close",
    "onReject": "return-to-submitter"
  }
]
```

### Conditional routing by form data

Route to different approvers based on the submitted data. In this example, a request for more than €1,000 requires the dean's approval; smaller amounts go to the department head.

```json
[
  {
    "id": "amount-check",
    "name": "Check Request Amount",
    "type": "condition",
    "conditions": [
      { "expression": "Number(data.amount) >= 1000" }
    ]
  },
  {
    "id": "dean-review",
    "name": "Dean Approval (High Value)",
    "type": "approval",
    "assignTo": { "type": "user", "value": "dean-user-uuid" },
    "onApprove": "close",
    "onReject": "return-to-submitter"
  },
  {
    "id": "dept-review",
    "name": "Department Head Approval",
    "type": "approval",
    "assignTo": { "type": "org", "value": "department.head" },
    "onApprove": "close",
    "onReject": "return-to-submitter"
  }
]
```

### Approval with downstream form trigger

After a leave request is approved, automatically create an IT access ticket using a linked child form.

```json
[
  {
    "id": "review",
    "name": "Leave Request Review",
    "type": "approval",
    "assignTo": { "type": "org", "value": "submitter.manager" },
    "onApprove": "next-stage",
    "onReject": "close"
  },
  {
    "id": "it-ticket",
    "name": "Create System Access Update",
    "type": "trigger-form",
    "childFormId": "uuid-of-system-access-form"
  }
]
```

---

## Publishing Validation

When a form is published (`POST /api/forms/[id]/publish`), the server validates every routing target in the attached workflow:

- `role` targets — the role must exist in the database
- `user` targets — the user must exist and be active
- `group` targets — the org unit `externalId` must exist
- `org` targets — no pre-validation (resolved dynamically at runtime from the submitter's org membership)
- `childFormId` — the referenced form must exist and be published
- `goTo` targets in `onReject` — the referenced stage ID must exist in the same workflow

Publishing fails with `409 WORKFLOW_TARGET_INVALID` if any check fails. This prevents dead-end workflows from reaching submitters.

---

## Workflow Versioning

Workflows have a `version` integer that increments each time the workflow is updated. When a submission is created, the current workflow version and full definition are snapshotted onto the submission (`workflowVersion`, `workflowDefinition`). This means:

- Already-running workflows are unaffected by workflow updates
- The submission record permanently captures what rules applied to it
- Auditors can review the exact workflow definition that governed any historical submission
