# Workflow authoring guide

Administrators edit workflows at `/<locale>/admin/workflows`. A definition is an ordered JSON array stored in PostgreSQL and snapshotted onto each submitted case. Temporal executes the snapshot durably.

## Stage shape

```ts
type WorkflowStage = {
  id: string;
  name: string;
  type: "approval" | "notification" | "trigger-form" | "condition";
  assignTo?: RoutingTarget | RoutingTarget[];
  childFormId?: string;
  conditions?: Array<{ expression: string }>;
  sla?: { hours: number; reminderAt: number[] };
  onApprove?: "next-stage" | "close";
  onReject?: "close" | "return-to-submitter" | { goTo: string };
};
```

IDs should be non-empty, stable, unique slugs even though the current Zod schema does not enforce all three constraints. `name` should be meaningful to operators. Empty workflow arrays pass the create schema but cannot be attached as a runnable published workflow.

## Approval stage

```json
{
  "id": "department-review",
  "name": "Department review",
  "type": "approval",
  "assignTo": { "type": "role", "value": "approver" },
  "sla": { "hours": 72, "reminderAt": [24, 48] },
  "onApprove": "next-stage",
  "onReject": "return-to-submitter"
}
```

The worker creates one pending task per resolved assignee. If several tasks exist, the first valid approve/reject/revision decision wins and the others are cancelled. This is **one-of-many approval**, not unanimous approval.

`onApprove: "close"` ends successfully with submission status `approved`. If omitted, approval continues; the final stage also ends as `approved`. `onReject` defaults effectively to rejection/termination.

A revision decision completes/cancels current tasks, changes status to `needs_revision`, waits for explicit resubmission, then repeats the same stage with new tasks.

## Notification stage

```json
{
  "id": "notify-office",
  "name": "Notify office",
  "type": "notification",
  "assignTo": { "type": "role", "value": "admin" }
}
```

Resolved users receive in-app messages and, when configured, email. The stage does not wait. If no users resolve at runtime, it silently continues without a notification; authoring validation should not be treated as a guarantee for every future case.

## Condition stage

Conditions use [`expr-eval`](https://github.com/silentmatt/expr-eval), not JavaScript. Allowed variable prefixes are `data.`, `form.`, and `submitter.`; expression length is limited to 500 characters.

```json
{
  "id": "large-request",
  "name": "Large request?",
  "type": "condition",
  "conditions": [{ "expression": "data.amount >= 1000" }],
  "onReject": { "goTo": "normal-review" }
}
```

All expressions are combined with logical AND. If all evaluate truthy, execution continues to the next array stage. If any is false—or evaluation fails because data is missing/wrongly typed—the stage follows `onReject`:

- `return-to-submitter`: wait for correction, then evaluate the condition again;
- `{ "goTo": "stage-id" }`: jump to that stage;
- `close`: set `rejected` and end;
- omitted: continue to the next stage.

Avoid JavaScript syntax/functions such as `===` or `Number(...)`. Test each expression with representative and missing values.

## Trigger-form stage

```json
{
  "id": "collect-follow-up",
  "name": "Collect follow-up form",
  "type": "trigger-form",
  "childFormId": "form-uuid"
}
```

This creates an empty **draft** child submission for the original submitter, links it to the parent, notifies the user, and immediately continues the parent workflow. It does not wait for completion and does not start the child's workflow. Current validation requires the form to exist but does not require publication or user access.

## Routing targets

| Type | Value | Runtime resolution |
|---|---|---|
| `role` | Role name | All active users with that role |
| `user` | User UUID | That exact user; must be active when workflow is saved |
| `group` | **OrgUnit database UUID** | All memberships in that unit |
| `org` | `submitter.manager` | Other manager membership in submitter's unit |
| `org` | `submitter.skip-level` | Manager in the unit's parent |
| `org` | `department.head` | Head/manager in submitter's department unit or parent |

Multiple targets are unioned and duplicate user IDs removed. The group value is not LDAP DN/external ID, despite older documentation.

Save-time org validation only proves that some current directory configuration can resolve the requested target. It cannot guarantee that every future submitter has the necessary membership/hierarchy. If an approval stage resolves zero users at runtime, the Temporal workflow fails and the case remains operationally stuck until repaired.

## SLA, reminders, and delegation

`sla.hours` sets `dueAt` and schedules the overdue action that many hours after task creation. Each `reminderAt` value is also interpreted as hours **after stage start**, not hours before the deadline. Keep reminder values positive and below `sla.hours`; the validator does not enforce ordering/range.

When the stage resolves, its timer scope is cancelled. At the overdue point, an active delegation may reassign the task; otherwise the assignee and admins are notified. Current code does not apply delegation at initial task creation, despite what older documentation said.

## Rejection routing

| Setting | Result |
|---|---|
| `close` or omitted | Current task rejected; submission `rejected`; workflow ends |
| `return-to-submitter` | Revision loop at the same stage |
| `{ "goTo": "id" }` | Continue at referenced stage |

`goTo` references are checked. Avoid backward cycles without an explicit business escape condition; Temporal can otherwise keep the case alive indefinitely.

The schema contains a `closed` submission status, but the current approval workflow does not set it. Terminal successful/unsuccessful outcomes are `approved`/`rejected`.

## Validation and versioning

Workflow create/update validates stage shape and all current database references. Update replaces the whole definition and increments `Workflow.version`. Already created submissions keep their workflow snapshot and are unaffected by later edits.

Publishing/saving a form with a workflow validates that the workflow is non-empty/runnable again. There is no explicit workflow publish state and no delete endpoint.

## Authoring checklist

- [ ] Unique stable stage IDs and meaningful names
- [ ] One-of-many semantics are acceptable for multi-target approvals
- [ ] Direct users active; roles/groups populated
- [ ] Every target resolves for each intended submitter cohort
- [ ] Expressions use `expr-eval` syntax and handle missing data
- [ ] `goTo` routes cannot create unintended infinite loops
- [ ] Reminders are measured from stage start and precede overdue time
- [ ] Delegation's current overdue-only behavior is acceptable
- [ ] Triggered form is published, accessible, and monitored manually
- [ ] Revision, rejection, timeout, worker restart, and duplicate-activity behavior tested in staging
