# FormFlow — Roles and Permissions

## Roles

FormFlow uses four application roles. A user can hold multiple roles simultaneously.

| Role | Description |
|---|---|
| `submitter` | Can fill in and submit forms; can view their own submissions |
| `approver` | Can action approval tasks assigned to them; can view submissions in their task queue |
| `admin` | Full administrative access: manage forms, workflows, users, org units, and see all submissions |
| `compliance` | Read-only access to the global submission console and audit log; cannot modify anything |

Every LDAP user automatically receives `submitter` on first login. Elevated roles are assigned by an admin in the user management panel, or pre-configured via LDAP UID allowlists and attribute maps.

---

## Permission Matrix

### Forms

| Action | submitter | approver | admin | compliance |
|---|---|---|---|---|
| View published forms | ✓ | ✓ | ✓ | ✓ |
| Submit a form | ✓ | ✓ | ✓ | — |
| Create/edit/delete forms | — | — | ✓ | — |
| Publish / archive a form | — | — | ✓ | — |
| View draft forms | — | — | ✓ | — |

### Submissions

| Action | submitter | approver | admin | compliance |
|---|---|---|---|---|
| View own submissions | ✓ | ✓ | ✓ | — |
| View assigned approval tasks | — | ✓ | ✓ | — |
| View all standard submissions | — | ✓¹ | ✓ | ✓ |
| View PII/sensitive submissions | — | ✓¹² | ✓² | ✓² |
| Approve/reject/request revision | — | ✓³ | ✓ | — |
| Edit own draft/revision | ✓ | ✓ | ✓ | — |

¹ Approvers see submissions in their task queue and (if `teamScope` is enabled for their account) all submissions from their org unit.  
² Requires break-glass justification (logged to audit trail).  
³ Only on tasks specifically assigned to them.

### Workflows

| Action | submitter | approver | admin | compliance |
|---|---|---|---|---|
| View workflows | — | — | ✓ | — |
| Create/edit/delete workflows | — | — | ✓ | — |

### Users

| Action | submitter | approver | admin | compliance |
|---|---|---|---|---|
| View user list | — | — | ✓ | — |
| Create/edit/deactivate users | — | — | ✓ | — |
| Change role assignments | — | — | ✓ | — |

### Audit Log

| Action | submitter | approver | admin | compliance |
|---|---|---|---|---|
| View audit log | — | — | ✓ | ✓ |
| Export audit log as CSV | — | — | ✓ | ✓ |

### Org Units

| Action | submitter | approver | admin | compliance |
|---|---|---|---|---|
| View org tree | — | — | ✓ | — |
| Trigger LDAP org sync | — | — | ✓ | — |

### Delegations

| Action | submitter | approver | admin | compliance |
|---|---|---|---|---|
| Create delegation for self | — | ✓ | ✓ | — |
| View own delegations | — | ✓ | ✓ | — |
| Delete own delegations | — | ✓ | ✓ | — |

---

## Break-Glass Access

Submissions on forms with `sensitivity: pii` or `sensitivity: sensitive` require the accessing user to provide a written justification before viewing the record. This applies regardless of role.

The access flow:
1. User navigates to a sensitive submission detail page
2. They are intercepted by the break-glass gate before seeing any data
3. They enter a reason (minimum 10 characters)
4. The reason is POSTed to `POST /api/sensitive-access`
5. A short-lived (10-minute) HMAC-signed cookie is issued
6. The submission page loads and the access is written to `AuditLog`

The same signed cookie is required for API reads of sensitive submissions and for admin/compliance list views that include `pii` or `sensitive` records.

The audit log entry records the actor, timestamp, submission ID, sensitivity level, and the stated reason. These entries cannot be deleted through the application.

---

## Approver Team Scope

An approver account can have `teamScope: true` set by an admin. When enabled:

- The approver can see all submissions from their org unit in the submission list, not just their own assigned tasks
- This is intended for team leads who need visibility across their team's submissions

Team scope does not grant the ability to approve tasks not assigned to the user — only visibility.

---

## Role Assignment

### Via the admin panel

1. Navigate to `/de/admin/users`
2. Select a user
3. Check/uncheck roles as needed
4. Save

Role changes immediately increment the user's `sessionVersion`, invalidating any existing JWT tokens. The user will be logged out on their next request.

### Via LDAP UID allowlists (`.env`)

```bash
LDAP_ADMIN_UIDS="uid1,uid2"
LDAP_APPROVER_UIDS="uid3,uid4"
LDAP_COMPLIANCE_UIDS="uid5"
```

These are applied at every LDAP login. UIDs not in the list will have the corresponding role removed. This means if you remove a UID from the list, the user loses the role on their next login.

### Via LDAP attribute mapping (`.env`)

```bash
LDAP_ROLE_ATTRIBUTE="eduPersonAffiliation"
LDAP_ROLE_ATTRIBUTE_MAP="Mitarbeiter=approver,Student=submitter"
```

The LDAP attribute value is matched against the map at login time. Multiple values in the attribute are each checked against the map.

---

## Security Implementation Notes

- Role checks on API routes use `requireRole(["admin", "compliance"])` from `src/lib/permissions.ts`
- Role checks on page routes use `requirePageRole(["admin"])` from `src/lib/page-auth.ts`
- Submission visibility is enforced at the database query level via `src/lib/submission-visibility.ts` — users cannot access records they are not permitted to see, even by guessing IDs
- The `compliance` role has read access equivalent to `admin` for submissions and audit logs, but cannot make any changes — this is enforced per-endpoint, not at the middleware level
