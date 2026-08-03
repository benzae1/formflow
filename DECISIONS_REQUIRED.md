# FormFlow — institutional decisions required before launch

Date: 2026-08-03

Audience: product owner, university IT, information security, data protection, legal/accessibility owners, records management, and the departments operating forms

These decisions cannot be made safely from source code. Engineering blockers are tracked separately in [HANDOFF_AUDIT.md](HANDOFF_AUDIT.md). Both lists must be closed before real university data is processed.

## Decision register

| ID | Decision | Required owner | Why it blocks launch | Evidence/output required |
|---|---|---|---|---|
| G-1 | Name the service owner, technical owner, on-call/support owner, and funding/maintenance horizon | IT management/product sponsor | No accountable team remains after solo-developer handoff | Named roles, service catalogue entry, escalation path |
| G-2 | Approve the service scope and which administrative processes/data categories may use it | Product owner + departments + data protection | Generic forms can collect data beyond the platform's assessed purpose/risk | Approved use policy and prohibited-use list |
| G-3 | Provide final imprint, privacy notice, accessibility statement, and support details | Legal/DPO/accessibility/support | The live pages explicitly contain placeholder instructions | Approved bilingual copy and review date |
| G-4 | Define legal basis, controller/recipient responsibilities, processor list, and data-flow approvals per use case | DPO/legal/procurement | LDAP, hosting, email and optional DeepL process identity/content data | Processing register/DPIA decision, contracts/DPAs where required |
| G-5 | Define retention trigger and period per form/process and per record class | Records management + DPO + form owner | Columns exist but remain null; there is no default safe period | Retention matrix and disposal approval workflow |
| G-6 | Define DSAR, correction, restriction, erasure, legal-hold, and evidence handling | DPO + records management + service owner | Current process requires direct DB operations with no case UI | Tested runbook, mailbox/case system, approvers, response targets |
| G-7 | Choose the authoritative identity/role source and lifecycle rules | IAM + security + business owners | LDAP login may replace manual roles; sync may deactivate users; tasks can remain assigned | Role catalogue, mappings, joiner/mover/leaver and emergency admin process |
| G-8 | Approve LDAP schema/filter/base DNs and organizational semantics | IAM/directory owner | Routing assumes `ou`, `manager`, and department/head semantics that may not match production LDAP | Staging directory test report and signed mapping |
| G-9 | Select email delivery path, sender/reply/bounce handling, and message policy | Messaging team + DPO/procurement | Current implementation supports Resend only and email is operationally important | Approved provider/relay, sender, DPA, bounce/support owner |
| G-10 | Decide whether DeepL translation is permitted and what text may leave the institution | DPO/procurement/content owner | Admin-triggered translation sends form text to DeepL Free API | Approval or explicit disablement; human-review owner |
| G-11 | Approve accessibility target, assessment scope, feedback/enforcement channel, and remediation SLA | Accessibility owner + product owner | No formal assessment has been run; Form.io builder/renderer are complex third-party UI | Independent test, statement, prioritized remediation plan |
| G-12 | Set availability, RPO/RTO, maintenance window, audit retention, monitoring, and incident response targets | IT operations + security | Repository contains no production SLO/runbook/backup automation | Service level, backup/restore evidence, alert/on-call runbook |
| G-13 | Approve hosting region, network zones, secret/key custody, and administrator access | Infrastructure + security + DPO | Production topology and encryption-key recovery are not defined | Architecture/security review and access-control records |
| G-14 | Define form publication governance | Product owner + form owners + DPO/accessibility | Admins can publish arbitrary schemas/workflows; technical validation is not policy approval | Named approvers and documented form release checklist |
| G-15 | Define go-live acceptance and rollback authority | Sponsor + service owner + security/DPO | Technical and institutional risks need an explicit acceptance gate | Signed launch checklist, rollback owner, launch date |

## Minimum policy artifacts

Before production, store these outside the code repository in the institution's controlled documentation/case system:

- service ownership and escalation matrix;
- supported/prohibited use policy;
- system/data-flow diagram and processing inventory;
- role and LDAP mapping catalogue;
- per-form publication and retention records;
- privacy/DSAR/legal-hold runbooks;
- incident response, breach escalation, backup/restore, and disaster recovery runbooks;
- vendor/processor approvals for hosting, email, and optional translation;
- accessibility assessment and remediation record;
- launch decision and risk acceptance.

## Content handoff locations

When approved content is available:

- legal/privacy/accessibility text: `src/lib/legal-copy.ts`;
- support channels: `src/app/[lang]/help/page.tsx` and the shared nonlocalized page;
- email sender/config: deployment secrets and `src/temporal/activities/notificationActivities.ts` if the provider changes;
- LDAP rules: deployment configuration and, if schema assumptions change, `src/lib/ldap.ts` plus `src/jobs/ldapOrgAdapter.ts`;
- retention rules: new form-level policy fields/services, not manual edits to production rows as the permanent solution.

Institutional review should verify the exact current laws and internal policies at rollout time; this repository is not legal advice.
