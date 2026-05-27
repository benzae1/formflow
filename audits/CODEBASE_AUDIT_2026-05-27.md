# FormFlow Production Readiness Audit

Date: 2026-05-27

Scope: current repository state in `c:\Users\anton\Desktop\formflow`. I used `graphify-out/GRAPH_REPORT.md` as the repo map, reviewed the current audit, and then inspected the auth flow, submission access paths, workflow/runtime plumbing, deployment templates, privacy/compliance touchpoints, and accessibility-sensitive layout/i18n surfaces. This is a fresh pass, not just a delta note.

## Executive Summary

FormFlow is materially closer to production than the 2026-05-17 audit suggested. Several previously high-risk items are now fixed, including Temporal workflow registration for org sync, publish-time workflow target validation, draft-vs-resubmit behavior for revised submissions, and Temporal UI version pinning.

It is still not production-ready. The remaining blockers are less about core CRUD correctness and more about governance, privacy, and operational hardening:

- The public sign-in experience still exposes placeholder legal/compliance links instead of real imprint, privacy, and accessibility statements.
- Sensitive-submission controls are inconsistent: the detail page has a break-glass gate, but the global admin/compliance list does not apply the same control or audit discipline.
- Break-glass justifications are passed in the URL query string, which is the wrong transport for sensitive access reasons.
- The app does not currently set baseline security headers or a CSP.
- I did not find a codified retention / deletion / DSAR workflow in the product or repo.

## Verification Snapshot

Static review only for this pass. I did not run the test suite because this audit adds documentation rather than changing runtime code.

## Findings

### 1. Public legal/compliance links are placeholders

Severity: High

Evidence:

- `src/app/signin/sign-in-client.tsx:352`
- `src/app/signin/sign-in-client.tsx:360`
- `src/app/signin/sign-in-client.tsx:361`
- `src/app/signin/sign-in-client.tsx:362`

The sign-in screen renders `Help`, `Imprint`, `Privacy`, and `Accessibility` links as `href="#"`. I also did not find corresponding routes/pages in `src/app`.

Impact:

- This is a real go-live blocker for a German/EU deployment.
- Users are presented with legal/compliance affordances that do not resolve anywhere.
- At minimum, the app appears incomplete; at worst, it fails institutional requirements around `Impressum`, privacy information, and accessibility statements.

Fix:

- Add real routes/pages for imprint, privacy notice, accessibility statement, and support/help.
- Make the sign-in page point to those pages, ideally locale-aware.
- Have the privacy page describe controller, purpose, legal basis, recipients/processors, retention, and data-subject rights.

### 2. Sensitive submission list access is weaker than the detail-page break-glass flow

Severity: High

Evidence:

- `src/lib/submission-visibility.ts:13-22`
- `src/app/admin/submissions/AdminSubmissionsPage.tsx:26-68`
- `src/app/admin/submissions/AdminSubmissionsPage.tsx:107-109`
- `src/app/[lang]/submissions/[id]/page.tsx:41-59`

The submission detail page enforces a break-glass justification for sensitive records, but the admin/compliance global submission console can include PII/sensitive work by checking a box. That list is queried directly from the database and does not call `auditSubmissionAccess`. The list also exposes submitter identity, form title, status, timestamps, and sensitivity labels without any justification prompt.

Impact:

- Sensitive-case discovery is easier than sensitive-case access.
- Compliance/admin users can enumerate sensitive submissions without the same accountability model used for the detail page.
- That weakens the audit trail around special-category or high-risk personal data handling.

Fix:

- Reuse one access policy for both list and detail views.
- If sensitive records appear in list views, require an explicit reason and audit that event.
- Consider split behavior: standard metadata list only by default, then gated reveal for names/sensitive records.

### 3. Break-glass reasons are sent in the URL query string

Severity: Medium

Evidence:

- `src/components/submissions/BreakGlassGate.tsx:25-35`
- `src/app/[lang]/submissions/[id]/page.tsx:25`
- `src/app/[lang]/submissions/[id]/page.tsx:30`
- `src/app/[lang]/submissions/[id]/page.tsx:55-59`

The break-glass form submits with `method="get"` and a `reason` field, and the detail page reads that reason from `searchParams`.

Impact:

- Justifications can leak into browser history, reverse-proxy logs, analytics, screenshots, copied URLs, and shared terminals.
- A control intended to strengthen sensitive-access accountability becomes a source of secondary data exposure.

Fix:

- Change the flow to POST the justification or send it in a header/body on a server action/API call.
- Keep the reason out of the address bar and out of referrer chains.

### 4. Locale handling is not reflected at the document root

Severity: Medium

Evidence:

- `src/app/layout.tsx:16`
- `src/app/[lang]/layout.tsx:18`

The root layout hardcodes `<html lang="de">`, while the localized layout only wraps children in `<div lang={locale}>`.

Impact:

- English pages are still served under a German document language at the HTML root.
- This is an accessibility and standards issue for screen readers, pronunciation, spellchecking, and some search/indexing behavior.
- It also undercuts the credibility of the bilingual rollout.

Fix:

- Set the actual document language on `<html>` based on the active locale.
- Keep any section-level `lang` overrides only for genuinely mixed-language content.

### 5. No baseline browser security headers or CSP are configured

Severity: Medium

Evidence:

- `next.config.ts:3-5`
- Repo search found no `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, or HSTS configuration.

Impact:

- The app is missing standard web hardening for a system that handles internal workflows and potentially sensitive personal data.
- Clickjacking, over-permissive embedding, and script-source sprawl are not actively constrained.
- This becomes more important because the UI uses third-party rendering layers such as Form.io.

Fix:

- Add a minimum header set: CSP, `X-Frame-Options` or `frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`, and HSTS at the edge.
- Verify any CSP against Form.io and Next runtime needs rather than shipping a permissive placeholder.

### 6. The health endpoint is public and returns raw internal error details

Severity: Medium

Evidence:

- `src/app/api/health/route.ts:4-35`

The endpoint is unauthenticated and includes raw database/Temporal error strings in the JSON response.

Impact:

- Operational details can leak to anyone who can hit the route.
- During outages, the endpoint may disclose internal connection/configuration information that is useful for reconnaissance.

Fix:

- Return a minimal success/failure payload publicly, or protect the route behind infrastructure/network controls.
- Log detailed failures server-side instead of returning raw messages to clients.

### 7. Reviewer notes are copied into email notifications

Severity: Medium

Evidence:

- `src/temporal/activities/approvalActivities.ts:205-219`
- `src/temporal/activities/approvalActivities.ts:222-235`
- `src/temporal/activities/notificationActivities.ts:37-52`

Revision and rejection notifications can embed approver notes in the email body, and the mailer sends the full notification body as HTML email content.

Impact:

- Free-text reviewer comments can easily contain personal data, sensitive case details, or internal assessments.
- Email is usually less controlled than the app itself and may be retained longer or forwarded outside the intended audience.

Fix:

- Keep emails generic and drive users back into the authenticated app for detail.
- If note-by-email is required, make it a deliberate per-form or per-workflow policy with a strong warning.

### 8. I did not find a codified retention / erasure / DSAR workflow

Severity: Medium

Evidence:

- Repo search did not surface product code for retention, purge schedules, data-subject export, or erasure handling.
- `prisma/schema.prisma:133-189` defines `Submission`, `ApprovalTask`, and `Notification` records without retention metadata such as archive/purge dates or deletion state.
- The only clear export surface I found is audit-log CSV export in `src/app/api/audit-log/route.ts`.

Impact:

- For EU deployment, “we store sensitive workflow data indefinitely unless ops handles it manually” is a risky default.
- This creates ambiguity around storage limitation, case closure, and subject-rights response procedures.

Fix:

- Define a retention policy per artifact type: submissions, approval notes, notifications, audit logs, LDAP-derived org data.
- Decide what must be immutable for compliance and what can be minimized/purged.
- Implement at least an operator-run export/delete process, even if self-service DSAR is out of scope.

## Resolved Or Stale Since The Previous Audit

- The org-sync workflow registration issue appears fixed: `src/temporal/worker.ts:59` now points `workflowsPath` at `require.resolve("./workflows")`, and `src/temporal/workflows/index.ts` exports `orgSyncWorkflow`.
- Workflow target validation is now materially better: `src/lib/validation/workflow-server.ts` checks role, user, group, org, child-form, and `goTo` targets.
- Revision saves no longer auto-resubmit unless `input.submit` is true: `src/app/api/submissions/[id]/route.ts:193`.
- Temporal UI is version-pinned in both compose files.

## Residual Risks / Open Questions

- I did not verify a full production ingress setup. The compose example is a good starting point for service separation, but TLS termination, reverse-proxy policy, backup strategy, and secret rotation are still external concerns.
- I did not validate the actual institutional text that should appear on the legal/privacy/accessibility pages.
- I did not re-run automated accessibility testing or keyboard/screen-reader passes.

## Recommended Go-Live Order

1. Ship real imprint/privacy/accessibility/help pages and wire the sign-in links.
2. Unify sensitive-access controls across list and detail views.
3. Move break-glass reasons out of the URL.
4. Add security headers/CSP and sanitize `/api/health`.
5. Decide and document retention/DSAR handling before production data starts accumulating.
