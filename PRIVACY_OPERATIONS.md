# Privacy Operations

Date: 2026-05-27

This document defines the minimum operational privacy process for running FormFlow in production until a fuller institutional policy supersedes it.

## Data Classes

- `Submission`: end-user form answers, workflow snapshot, parent-child linkage, and status history.
- `ApprovalTask`: assignee, due date, decision note, and timestamps.
- `Notification`: in-app delivery history and outbound email trigger content.
- `AuditLog`: actor, action, resource, metadata, and access justifications.
- `OrgUnit` / `OrgMembership`: LDAP-derived organizational routing context.

## Retention Baseline

- `Submission` and `ApprovalTask`: retain according to the owning university process and record-keeping rules for the specific form. Each published production form should have an assigned retention owner before launch.
- `Notification`: treat as operational data. Purge when no longer needed for user support or incident reconstruction.
- `AuditLog`: retain long enough to investigate sensitive-access events, permission changes, and workflow incidents. Do not delete ad hoc.
- `OrgUnit` / `OrgMembership`: refresh from source of truth and remove stale memberships during sync.

## DSAR / Case Handling

1. Identify the relevant form and legal basis before changing or exporting any data.
2. Export the relevant submission, workflow, and audit context from the database for review.
3. Check whether deletion is legally permitted or whether the record must instead be restricted or archived.
4. If deletion is approved, remove or anonymize the minimum required records and record the action in `AuditLog`.
5. Record the request outcome, approver, and completion date in the institution's case-management channel.

## Sensitive Access

- Sensitive submission access requires an explicit justification in the application.
- Justifications must be treated as audit data and must not be moved into URLs, tickets, or email threads unless required for an investigation.

## Launch Checklist

- Assign a retention owner for every production form.
- Publish the final privacy notice, imprint, and accessibility statement.
- Confirm the support mailbox for privacy and access requests.
- Confirm backup, restore, and secure deletion procedures with infrastructure owners.
