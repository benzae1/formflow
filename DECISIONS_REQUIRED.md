# FormFlow — Decisions Required Before Production Launch

Date: 2026-05-27  
Prepared by: Development team  
For: Project lead / Data Protection Officer / IT management

This document lists the items that cannot be resolved by the development team alone. Each one requires an institutional decision, legal sign-off, or content provided by a responsible person within the university. Nothing here is a coding problem; all of it is a policy or governance gap.

---

## 1. Legal page content (Impressum, Datenschutz, Barrierefreiheit)

**What is needed:** Written, approved text for three pages that are already live in the application.

**Why it is urgent:** Under German law, a publicly accessible web service operated by the university must publish:

- A complete **Impressum** (§ 5 TMG) naming the responsible legal body, mailing address, and a reachable contact channel.
- A **Datenschutzhinweis** (Art. 13/14 DSGVO) stating the controller identity, the legal basis for each processing activity, which processors are involved (including the email delivery provider and any cloud infrastructure), retention periods, and how data subjects can exercise their rights (access, rectification, erasure, restriction, objection).
- An **Erklärung zur Barrierefreiheit** (BITV 2.0 / EU-Richtlinie 2016/2102) documenting the actual conformance status of the application, known limitations, and a complaint contact.

The application currently shows placeholder text on all three pages that explicitly states it must be replaced before launch. These pages are reachable from the public sign-in screen today.

**Who needs to act:**

| Page | Responsible party |
|---|---|
| Impressum | IT / legal department — needs the official university provider details |
| Datenschutzhinweis | Data protection officer — must confirm legal bases and processor list |
| Barrierefreiheit | IT accessibility lead — must provide or commission a BITV conformance assessment |

**Developer action required once content is supplied:** Drop-in replacement in one source file (`src/lib/legal-copy.ts`). Estimated effort: under one hour.

---

## 2. Data retention policy

**What is needed:** A written decision on how long each category of data is kept before it is deleted or archived.

**Why it is urgent:** DSGVO Article 5(1)(e) (storage limitation) requires that personal data is kept only as long as necessary for the purpose for which it was collected. The application currently stores the following indefinitely with no automated purge:

- **Submissions** — may contain health, disciplinary, HR, or other special-category data depending on the form
- **Approval decisions and reviewer notes** — contain assessor identities and reasoning
- **In-app notifications** — contain submitter names and submission links
- **Audit log entries** — contain access records with user IDs and timestamps
- **LDAP-derived organisational data** — names, roles, org unit membership

The Privacy Operations guide (`PRIVACY_OPERATIONS.md`) acknowledges this gap and describes manual database procedures as a stopgap. That is not a sustainable production posture.

**Questions that need answers before the system goes live:**

1. How long are submitted forms retained after a case is closed? (Suggestion from legal perspective: tie to the retention period of the underlying administrative act — typically 5 or 10 years for university records, but this must be confirmed.)
2. Are approval notes subject to the same retention period as the submission, or shorter?
3. Can audit log records be purged, or must they be kept for the full retention period as evidence of lawful processing?
4. What triggers the retention clock — submission date, approval date, or case closure date?
5. Should certain form types carry different retention classes (e.g. health-related forms vs. room-booking forms)?

**Who needs to act:** Data protection officer, in consultation with the records management or legal department.

**Developer action required once policy is decided:** Add a `retainUntil` date to the database schema and implement a scheduled deletion job. Estimated effort: 2–3 days.

---

## 3. Data subject request (DSAR) process

**What is needed:** A defined procedure for responding to requests from individuals who want to access, correct, or delete their personal data.

**Why it is urgent:** DSGVO Articles 15–21 give data subjects enforceable rights. The application does not have a self-service DSAR feature. Requests must currently be handled manually by someone with direct database access. There is no documented process, no defined response time target (the legal maximum is one month from receipt), and no record of how requests are handled.

**Questions that need answers:**

1. Which role or team receives DSAR requests — the form platform team, the data protection officer, or the individual department that published the form?
2. Is the functional mailbox address for privacy requests already decided? (It needs to appear on the Datenschutzhinweis page.)
3. For an erasure request: does deleting a submission also delete the associated audit log, or does the audit log need to be retained as evidence?
4. For an access request: what is the defined scope — just the submitter's own submissions, or also references to their name in other users' submissions and approval notes?

**Who needs to act:** Data protection officer, IT management.

**Developer action required once process is decided:** Implement tooling proportional to the expected request volume. At minimum, an admin interface to export and delete a single user's data. Estimated effort: 3–5 days.

---

## 4. Email delivery provider and sender address

**What is needed:** A decision on which email service sends application notifications, and a real sender address.

**Why it is urgent:** The application sends notifications for task assignments, revision requests, approvals, and rejections. The current configuration defaults to `notifications@example.com` as the sender address. This is an IANA-reserved example domain; emails sent from it will be rejected or marked as spam by most mail servers.

Additionally, the email delivery provider (currently Resend) is a third-party data processor. Under DSGVO, using a processor requires a Data Processing Agreement (DPA). If the university already has an approved email relay or SMTP gateway, using that instead of a third-party SaaS would simplify the DPA requirement.

**Questions that need answers:**

1. Should notifications be sent via the university's own SMTP relay, or via a third-party service such as Resend?
2. If a third-party service is used, has the DPA been reviewed and signed?
3. What sender address should appear on notifications — a shared functional mailbox, a no-reply address, or per-department addresses?

**Who needs to act:** IT infrastructure team (for SMTP relay option) or procurement/legal (for third-party SaaS DPA).

**Developer action required once decided:** Set the `EMAIL_FROM_ADDRESS` environment variable and, if switching providers, update `RESEND_API_KEY` or replace the mailer module. Estimated effort: under one day.

---

## 5. Accessibility conformance assessment

**What is needed:** A formal BITV 2.0 (or WCAG 2.1 AA) test of the application, performed or commissioned by the university.

**Why it is urgent:** EU Directive 2016/2102, implemented in German law, requires public-sector bodies to publish an accessibility statement documenting conformance status. The statement must be based on an actual assessment, not a design intent. Publishing a statement that says "this application aims to be accessible" without a test result does not meet the requirement.

**Questions that need answers:**

1. Is there an internal accessibility team or preferred external vendor for BITV testing?
2. What is the target conformance level — WCAG 2.1 AA (standard for public bodies) or higher?
3. Which user journeys are in scope — sign-in only, the full submission flow, the approver inbox, the admin console?
4. What is the remediation timeline for any failures found?

**Who needs to act:** IT accessibility lead, project lead.

**Developer action required once assessment is complete:** Fix any identified failures and update the accessibility statement page with the real result.

---

## Summary table

| # | Item | Blocking go-live? | Owner |
|---|---|---|---|
| 1 | Legal page content (Impressum, Datenschutz, Barrierefreiheit) | Yes — pages are live with placeholder text | DPO + Legal + IT |
| 2 | Data retention policy | Yes — indefinite storage without a legal basis | DPO + Records management |
| 3 | DSAR process and mailbox | Yes — no defined response procedure | DPO + IT management |
| 4 | Email sender address and DPA | Yes — default address will cause delivery failures | IT infrastructure / Procurement |
| 5 | Accessibility conformance assessment | Yes — BITV statement requires a real test result | IT accessibility lead |

All five items need to be resolved before the system handles real user data. Items 1 and 4 have the shortest development tail once decisions are made. Items 2, 3, and 5 require institutional processes that may take several weeks to complete.
