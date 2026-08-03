# Roles and permissions

Users can hold multiple roles. Authorization is additive except where a route requires ownership/assignment. The four built-in role names are protected from rename/delete; administrators can create custom lowercase roles for form access, field read rules, and workflow routing.

## Built-in roles

| Role | Current purpose |
|---|---|
| `submitter` | Default LDAP/local seed role; normal owner experience |
| `approver` | Inbox and action on tasks assigned to the user; optional team visibility |
| `admin` | Forms, workflows, roles/users, org sync, dashboards, global submissions, audit |
| `compliance` | Read-oriented dashboard, global submissions, audit log |

The submission API technically accepts any authenticated user who has form-level access; it does not require the literal `submitter` role. Use allowed roles to express audience restrictions.

## Permission matrix

| Capability | Submitter/other authenticated | Approver | Admin | Compliance |
|---|---:|---:|---:|---:|
| Open allowed published form | Yes | Yes | Yes (bypass allowed-role gate) | Yes if allowed |
| Create/save/submit own case | Yes if form allowed | Yes if form allowed | Yes | Yes if form allowed |
| View own cases | Yes | Yes | Yes | Yes (as owner) |
| View assigned cases | No | Yes | Only if assigned or global visibility | Only via global visibility |
| Team-scope case visibility | No | If `teamScope=true` | Not needed | No |
| Act on approval task | Only if directly assigned | Only if directly assigned | Only if directly assigned | Only if directly assigned |
| Global standard submission view | No | No (unless assigned/team/owner) | Yes | Yes |
| Global PII/sensitive list | No | No global privilege | Yes with list grant | Yes with list grant |
| Sensitive detail | If otherwise visible, with per-record grant | Same | Same | Same |
| Manage forms/workflows | No | No | Yes | No |
| Manage roles/user role sets | No | No | Yes | No |
| View/CSV audit log | No | No | Yes | Yes |
| View org/admin sync | No | No | Yes | No |
| Create own delegation | No | Yes | Yes | No |
| Create delegation for another approver | No | No | Yes | No |

Approval decision routes deliberately check task ownership, not role names. A user assigned by a direct/role/group/org target can act even if they later lack `approver`; conversely, an admin cannot override somebody else's pending task through these endpoints.

## Form and field access

Form `allowedRoles` is a many-to-many relation. Empty means any authenticated user; otherwise at least one role must match. Admin always passes. The public-looking form route still requires authentication.

Per field:

- empty `properties.readRoles` means everyone may read the value and makes `ownerCanRead` irrelevant;
- with a non-empty list, matching roles may read the value;
- the owner may additionally bypass that non-empty list unless `properties.ownerCanRead` is `"false"`;
- values are removed from the response when the caller fails the rule, even after decryption.

Field rules should use existing role names. Safe role deletion/rename checks search these schema references.

## Submission visibility

Record visibility is applied in Prisma queries:

- normal users: own submissions;
- approvers: own plus any historical/current task assigned to them; optional `teamScope` adds submissions whose owners share an org-unit ID;
- admin/compliance: all records when explicitly including sensitive categories, otherwise only `standard`.

The list grant is currently enforced specifically for admin/compliance requests that ask for PII/sensitive data. Approvers using assignment/team scope are not given global access, but their list path is not subjected to that admin-list grant. A `sensitive` detail always needs a per-record grant for any role. A `pii` detail currently does not.

## Break-glass grant

The UI posts a reason of at least ten characters to `/api/sensitive-access`. The server audits grant creation and sets a signed HttpOnly cookie for ten minutes. The API later validates actor, scope, signature, and expiry, and audits actual detail/list access.

This is an accountability control, not an emergency privilege escalation: the user must already have record visibility. It does not grant access to an otherwise invisible submission.

## Team scope

An admin can set `teamScope` on an approver. Visibility is based on shared `OrgMembership.orgUnitId`, not the full descendants of a manager's organizational tree. It grants visibility only; task actions still require assignment. Treat it as broad data access and review it periodically.

## Role and account administration

The admin users page lists directory/local users, edits complete role sets and team scope, manages custom roles, and shows delegation controls. It does not create local users, set passwords, deactivate/reactivate accounts, or reassign open tasks.

Role updates do not increment `sessionVersion`, so existing sessions are not deliberately revoked. The JWT callback reloads current database roles during session processing. Verify the exact privilege-removal timing in the deployment and use an explicit session-revocation operation when immediate invalidation is required.

LDAP login can replace the user's roles based on allowlists/attribute mapping. Manual assignments to LDAP users may therefore be overwritten on their next login. Define one authoritative role-governance policy.

Account deactivation is driven by organization reconciliation for identities missing from a non-empty sync result. Pending tasks are not automatically reassigned; admins only receive a notification. This is a handoff blocker/high-priority workflow gap.

## Delegation limits

Both approver and delegate must be active and have `approver` or `admin`. Windows cannot overlap for the same approver. The current workflow consults delegation only when a task becomes overdue, not when the task is first assigned. The user-management UI supplies the listing; there is no GET delegations API.
