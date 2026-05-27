# FormFlow Production Readiness Audit

Date: 2026-05-27 (second pass)

Scope: current repository state in `c:\Users\anton\Desktop\formflow`. I read the previous audit (`CODEBASE_AUDIT_2026-05-27.md`) and then did a fresh review of the auth flow, submission access paths, localization, legal pages, security header configuration, notification content, and the in-memory rate-limit implementation. This pass verifies how much of the prior audit has landed, and surfaces new issues found during that review.

## Executive Summary

Several items from the first audit have been closed. The break-glass flow now POSTs the justification rather than sending it in a URL query string. The health endpoint no longer returns raw error messages. The email notification body no longer embeds reviewer notes. The admin submissions console now gates on a break-glass grant when sensitive records are explicitly requested. The sign-in page now links to real legal and help routes.

Three new issues of material severity were uncovered:

- `src/proxy.ts` is the intended Next.js middleware but is misnamed. Next.js only recognises a file named `middleware.ts` (or `.js`) at the project root or in `src/`. As a result, the CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, and HSTS headers defined in that file are never attached to any response, and the locale-header injection it performs does not run for page renders.
- The in-memory rate-limit implementation resets on every process restart and does not survive across replicas. In any horizontally scaled or autoscaling deployment the window-based brute-force protection for login effectively does not exist.
- The legal pages still contain explicit placeholder text instructing operators to replace it before going live. They render in the application today and are reachable from the sign-in footer.

The codebase is close but not ready for a university production rollout. The middleware rename is a one-line fix with wide impact. The legal content and rate-limit persistence require deliberate institutional decisions before they can be resolved.

## Verification Snapshot

Static review only. I did not run the test suite because this pass surfaces findings rather than changing runtime code.

## Findings

### 1. `src/proxy.ts` is misnamed and therefore never applied as Next.js middleware

Severity: High

Evidence:

- `src/proxy.ts:1-72`
- `src/proxy.ts:70-72` — `export const config = { matcher: "/:path*" }` matches the Next.js middleware API exactly
- `src/proxy.ts:6-17` — defines a full CSP, Referrer-Policy, Permissions-Policy, X-Content-Type-Options, X-Frame-Options, and HSTS block
- `src/proxy.ts:19-31` — `withSecurityHeaders()` applies all of them to responses
- `src/proxy.ts:33-68` — `proxy()` does locale detection and locale-header injection
- No file named `middleware.ts` exists anywhere in the repository

Next.js only loads middleware from a file named `middleware.ts` (or `.js`) at the project root or under `src/`. Any other filename, including `proxy.ts`, is treated as an ordinary module and never invoked by the framework on incoming requests.

Impact:

- All security headers defined in the file are silently absent from every response: Content-Security-Policy, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options, and HSTS. The previous audit identified missing security headers as a medium finding; those headers were subsequently written but the file rename that would activate them never happened.
- The `x-formflow-locale` header is not injected for server-rendered page requests. The root layout at `src/app/layout.tsx:17` reads that header and falls back to the default locale when it is absent, so `<html lang>` always renders as the default locale (`de`) regardless of the URL segment. English pages are mis-declared in the HTML root. The locale layout at `src/app/[lang]/layout.tsx:18` still wraps in `<div lang={locale}>`, so the inner subtree is correctly labelled, but the document root declaration is wrong.
- Clickjacking, script-injection, and mixed-content attacks are unmitigated at the application layer. These become particularly significant for a deployment that renders third-party Form.io components.

Fix:

- Rename `src/proxy.ts` to `src/middleware.ts`. The exported function must also be renamed from `proxy` to `default` (or the default export must call `proxy`) to satisfy the Next.js middleware contract.
- Verify the CSP against the Form.io runtime. Form.io injects inline styles and may load scripts from its own CDN; `script-src 'self'` will block those unless an explicit source or nonce is added.
- Test that the locale redirect still fires correctly after the rename.

### 2. In-memory rate-limit state resets on restart and is not shared across replicas

Severity: High

Evidence:

- `src/lib/auth-security.ts:43` — `const rateLimitBuckets = new Map<string, RateLimitBucket>()`
- `src/lib/auth-security.ts:124-141` — buckets are written and read from this module-level Map
- `src/lib/auth-security.ts:280-291` — session revocation uses a `sessionVersion` increment in the database, which is cross-process; the rate-limit implementation is not analogous

Impact:

- A process restart (deployment, crash, OOM kill, autoscaling event) wipes all rate-limit windows. An attacker who observes or causes a restart gets a clean slate for brute-forcing credentials immediately after.
- In any environment running more than one application replica (including a rolling deployment with two pods alive during a release), each replica maintains its own independent bucket. An attacker can distribute attempts across replicas and stay below the per-replica threshold indefinitely.
- The account lockout mechanism (`lockedUntil` written to the database) does survive across replicas and restarts because it is persisted. But lockout only triggers after several failed attempts have accumulated within a single replica's window. A distributed attacker can stay below lockout threshold on every replica while exhausting the global credential space.

Fix:

- Move rate-limit state to Redis or PostgreSQL. A simple approach is a table of `(key, count, reset_at)` rows with an atomic upsert. The existing `rateLimitBuckets` API can be preserved as a thin wrapper.
- Alternatively, rely entirely on the database-backed account-lockout path and remove the in-memory bucket. The lockout already survives across replicas; the rate-limit window does not add meaningful protection if it resets on restart.

### 3. Legal pages contain placeholder text and do not satisfy Impressum or DSGVO disclosure requirements

Severity: High

Evidence:

- `src/lib/legal-copy.ts:22-37` — imprint DE section body contains "Vor dem Produktivstart sollten hier die vollstandigen offiziellen Anbieterangaben, Postanschrift und zentralen Kontaktwege der Universitat eingefugt werden."
- `src/lib/legal-copy.ts:54-56` — privacy DE section body instructs operators to fill in legal bases, recipient groups, processors, and email-delivery provider before launch
- `src/lib/legal-copy.ts:60-63` — retention period and data-subject rights section is explicitly marked as a placeholder
- `src/lib/legal-copy.ts:75-79` — accessibility statement prompts operators to document real assessment status
- English equivalents at lines 98-165 are identical in structure and equally incomplete
- `src/app/signin/sign-in-client.tsx:360-362` links to `/imprint`, `/privacy`, and `/accessibility` — these routes resolve and render the placeholder content

Impact:

- A German public institution operating under the Telemediengesetz and DSGVO is required to publish a complete Impressum (§ 5 TMG) including the legal name of the responsible body, mailing address, and a reachable contact. Publishing a page that says to fill these in later is a compliance failure.
- The privacy notice must state the controller identity, legal basis for each processing activity, retention periods, and how data subjects can exercise their rights. None of these are present.
- The accessibility statement (BITV 2.0 / EN 301 549) must reflect a real conformance assessment result, known limitations, and a complaint contact. The template text does not meet that requirement.
- These pages are live and reachable today.

Fix:

- Replace all placeholder copy in `src/lib/legal-copy.ts` with the actual institutional text before production launch. The university's legal, data protection, and IT departments should sign off on each section.
- The privacy notice in particular must be reviewed against the actual processors in use: Resend (email delivery), the PostgreSQL host, and Temporal Cloud or self-hosted Temporal.
- Verify that the accessibility statement references a genuine BITV/WCAG conformance test.

### 4. Standard-sensitivity submissions are shown in the admin list without any audit record

Severity: Medium

Evidence:

- `src/app/admin/submissions/AdminSubmissionsPage.tsx:78-84` — when `includeSensitive` is false and no sensitivity filter is set, the query restricts to `form.sensitivity === "standard"` but returns the full submitter identity and metadata
- `src/app/admin/submissions/AdminSubmissionsPage.tsx:57-68` — the audit-log write for the sensitive-list path fires only when `requestsSensitiveRecords && sensitiveGrant` is truthy
- `src/app/admin/submissions/AdminSubmissionsPage.tsx:165` — submitter name or email is rendered unconditionally for every row in the list

Impact:

- Admin and compliance users can enumerate submitter identities, form titles, timestamps, and status for every standard-sensitivity submission without any accountability record.
- This is a lesser concern than the previous finding about sensitive submissions appearing ungated, which has now been fixed. However, even standard-sensitivity submissions can contain personal data (names, contact details, academic records), and the audit trail for the approval-and-compliance console has a structural gap for routine reads.
- Under DSGVO article 30, processing activities including access events on administrative systems are typically required to be documented.

Fix:

- Write an audit log entry for every admin-list page load, not only when sensitive records are explicitly requested. At minimum record the actor, timestamp, and applied filters.
- Consider whether submitter identity should be masked by default in the list view and revealed only on detail access, which is already gated.

### 5. Email sender address defaults to an undeliverable placeholder

Severity: Medium

Evidence:

- `src/temporal/activities/notificationActivities.ts:41` — `from: process.env.EMAIL_FROM_ADDRESS ?? "FormFlow <notifications@example.com>"`

Impact:

- `notifications@example.com` is an IANA-reserved example domain and will not accept bounce or delivery-failure messages. Mail transfer agents may also classify it as spam or reject it outright.
- If `EMAIL_FROM_ADDRESS` is not set in production, every notification email will either fail to deliver or arrive from an address that cannot receive replies or bounce reports.
- Missed notifications in a workflow platform have a direct operational impact: approval deadlines pass unnoticed, submitters do not receive revision requests, and the audit trail for email delivery becomes unreliable.

Fix:

- Set `EMAIL_FROM_ADDRESS` to a real institutional mailbox (e.g. `formflow@uni-weimar.de` or a no-reply equivalent) before production launch.
- Add a startup assertion or log warning if `EMAIL_FROM_ADDRESS` is unset when `DISABLE_EMAIL_DELIVERY` is not `true`.

### 6. No codified retention, erasure, or DSAR workflow

Severity: Medium

Evidence:

- `prisma/schema.prisma:133-189` — `Submission`, `ApprovalTask`, and `Notification` models have no `deletedAt`, `purgeAt`, or `archivedAt` fields
- `src/app/api/audit-log/route.ts` — provides CSV export of audit events; no delete or redact endpoint exists
- `PRIVACY_OPERATIONS.md` — describes manual procedures for data-subject requests but notes that no automated tooling is in place
- No Temporal workflow or scheduled job purges records by age

Impact:

- Submissions, approval notes, notifications, and audit records accumulate indefinitely. For a system processing academic or HR workflows this is a DSGVO storage-limitation problem.
- Data-subject access and erasure requests must currently be handled entirely by manual database queries with no documented scope, verification step, or confirmation record.
- If a submission contains health, disciplinary, or other sensitive personal data, indefinite retention increases the risk surface without a corresponding legal justification.

Fix:

- Define and document binding retention periods per artifact type: submissions, approval decisions, approval notes, notifications, audit log rows.
- Implement at minimum a scheduled operator script that marks or deletes expired records; a fully self-service DSAR portal is not required at launch but the manual process should be documented and tested.
- Add a `purgeAt` or `retainUntil` column to `Submission` that is set at submission creation or closure based on the form's configured retention class.

## Resolved Since The Previous Audit

- **Break-glass reasons are no longer passed in the URL.** The `BreakGlassGate` component now POSTs to `/api/sensitive-access` using `fetch` with mutation headers. The previous implementation used a GET form with `reason` in the query string.
- **Health endpoint no longer returns raw error details.** The `GET /api/health` handler now silently catches database and Temporal errors and reports only boolean `ok` flags. The previous implementation surfaced raw exception messages.
- **Reviewer notes are no longer embedded in email notifications.** `notifySubmitterOfRevision` and `notifySubmitterOfOutcome` now send generic messages directing users to the authenticated application. The `note` parameter is accepted by the activity signature but is not included in the email body.
- **Admin submissions console gates on break-glass for explicitly requested sensitive records.** When `includeSensitive=true` or a sensitivity filter of `pii` or `sensitive` is applied, the page renders a `BreakGlassGate` and writes an audit log entry on grant. The previous audit found this gating absent entirely.
- **Sign-in footer links resolve to real routes.** `/imprint`, `/privacy`, `/accessibility`, and `/help` are all routed pages. The previous audit found them pointing to `href="#"`.
- **Root layout reads locale from a request header rather than hardcoding `de`.** `src/app/layout.tsx:17-18` now derives locale from `x-formflow-locale` with a fallback. Note that this header is only injected once `proxy.ts` is renamed to `middleware.ts` (see Finding 1).

## Residual Risks / Open Questions

- The CSP in `src/proxy.ts:9` sets `script-src 'self'`. Form.io 5.x loads workers and may reference external resources at runtime. The CSP needs to be tested against an actual Form.io render before declaring it valid.
- I did not verify that the `x-formflow-locale` header injection, once middleware is active, correctly propagates through all server-component render paths including the root layout, API routes, and server actions.
- I did not run automated or manual accessibility testing. The Bauhaus design system uses semantic HTML and ARIA patterns, but no WCAG conformance scan has been performed.
- TLS termination, reverse-proxy configuration, backup strategy, and secret rotation remain external concerns not visible in the repository.

## Recommended Go-Live Order

1. Rename `src/proxy.ts` to `src/middleware.ts` and export the function as `default`. Verify the CSP against Form.io, then confirm security headers appear on production responses.
2. Replace all placeholder copy in `src/lib/legal-copy.ts` with approved institutional text and obtain sign-off from the data protection officer.
3. Move the rate-limit buckets to a persistent store (Redis or PostgreSQL) before exposing the system to the public internet.
4. Set `EMAIL_FROM_ADDRESS` to a real institutional address and confirm end-to-end email delivery in a staging environment.
5. Define a retention policy and implement at minimum a runbook for responding to DSAR and erasure requests before production data starts accumulating.
6. Add an audit log write for every admin-list page load.
