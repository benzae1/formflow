# FormFlow Production Readiness Audit

Date: 2026-05-29

Scope: current repository state in `c:\Users\anton\Desktop\formflow`. I refreshed the code graph with `graphify update .`, read the updated graph report (`graphify-out/GRAPH_REPORT.md`), reviewed the previous second-pass audit (`audits/CODEBASE_AUDIT_2026-05-27b.md`), and then did a fresh static review of the submission access paths, break-glass implementation, authentication rate limits, legal/support pages, notification delivery, retention posture, encryption-key documentation, middleware, and audit surfaces.

## Executive Summary

The most important fix from the previous pass has landed: `src/middleware.ts` now exists, exports a default middleware function, injects the locale request header, and attaches security headers. The localized submission and admin routes are also more complete than in the earlier audit, and the graph now sees middleware as a first-class community rather than a disconnected intended feature.

The production-readiness picture is still not clean. The largest new issue is that the JSON submissions API can bypass the admin UI's break-glass gate. An admin or compliance user can call `GET /api/submissions?includeSensitive=true` directly and receive sensitive submission rows without obtaining a signed sensitive-access cookie or giving a justification. The individual submission API also uses a separate `X-Break-Glass-Reason` header instead of the signed grant used by the UI, so the UI and API do not enforce the same access model.

Several prior blockers remain: login rate-limit counters are still process-local, legal pages still contain launch placeholders, email can still send from `notifications@example.com`, and there is still no codified retention or erasure mechanism in the data model. I also found a key-rotation documentation mismatch: the docs describe `FIELD_ENCRYPTION_KEYS` as `id:hexkey`, but the code parses `id=hexkey`; the docs also say the single-key fallback uses `key-1`, while the code stores it under `default`.

This codebase is materially closer than it was on May 27, but it is still not ready for a university production rollout. The access-control inconsistency should be treated as the next highest-priority engineering fix because it undermines the new break-glass UX.

## Verification Snapshot

Static review only. I did not run the test suite because this pass creates an audit report rather than changing runtime code. I did run `graphify update .`; the refreshed graph reports 190 files, 587 nodes, 874 edges, and 28 communities as of 2026-05-29.

## Findings

### 1. `GET /api/submissions?includeSensitive=true` bypasses the admin break-glass gate

Severity: High

Evidence:

- `src/app/admin/submissions/AdminSubmissionsPage.tsx:32-39` - the admin UI detects `includeSensitive`, `pii`, or `sensitive` filters and renders `BreakGlassGate` when no signed grant exists.
- `src/app/admin/submissions/AdminSubmissionsPage.tsx:57-63` - the admin UI writes `sensitive.list_accessed` only after a signed grant is present.
- `src/app/api/submissions/route.ts:40-48` - the JSON API reads `includeSensitive` directly from the query string and passes it into `submissionVisibilityWhere()`.
- `src/lib/submission-visibility.ts:13-16` - for admin or compliance roles, `includeSensitive: true` returns `{}`, meaning no sensitivity filter at all.
- `src/app/api/submissions/route.ts:56-63` - the API writes `submission.viewed` entries with the generic reason `submission.viewed`; it does not require or record a break-glass justification for list access.

Impact:

- Any authenticated admin or compliance user can bypass the UI gate by calling the API directly.
- Sensitive and PII rows become available without the signed cookie produced by `/api/sensitive-access`.
- The audit trail loses the reason that the UI requires for elevated access, replacing it with a generic list-read reason.
- This partially reopens the sensitive-list exposure that the May 27 second pass considered fixed at the page layer.

Fix:

- Move the sensitive-list grant check into `GET /api/submissions`, not only the admin page.
- Require `getSensitiveAccessGrant(cookieStore, user.id, "admin-submissions")` before honoring `includeSensitive=true` or sensitivity filters of `pii` / `sensitive`.
- Write `sensitive.list_accessed` with the grant reason from the API layer, then let the UI become a convenience wrapper rather than the enforcement point.

### 2. Individual sensitive submission access uses two different break-glass models

Severity: High

Evidence:

- `src/app/[lang]/submissions/[id]/page.tsx:41-54` - the UI requires a signed sensitive-access cookie before rendering a sensitive submission.
- `src/app/[lang]/submissions/[id]/page.tsx:56-60` - after the UI grant, the page audits access with the signed grant reason.
- `src/app/api/submissions/[id]/route.ts:47-56` - the API does not check the signed cookie; it accepts any `X-Break-Glass-Reason` header with at least 10 characters.
- `src/app/api/submissions/[id]/route.ts:59-62` - the API then audits that header value as the sensitive-access reason.

Impact:

- A user who can see a sensitive submission according to `getVisibleSubmissionById()` can bypass the UI's signed grant flow by sending an arbitrary header.
- The UI creates an auditable access grant via `/api/sensitive-access`; the API does not. This makes downstream review harder because some sensitive accesses have a prior `sensitive.access.granted` event and some do not.
- API clients are not bound to the same 10-minute grant window as browser users.

Fix:

- Pick one break-glass contract and enforce it everywhere. The cleanest option is to require the signed sensitive-access cookie for page and API reads.
- If machine clients need header-based access, add a separate explicit API-token flow and audit it with a distinct action, not the same browser break-glass path.
- Add an integration test for `GET /api/submissions/[id]` that proves sensitive records return `428` or `403` without a valid grant.

### 3. In-memory rate-limit state resets on restart and is not shared across replicas

Severity: High

Evidence:

- `src/lib/auth-security.ts:43` - `const rateLimitBuckets = new Map<string, RateLimitBucket>()`
- `src/lib/auth-security.ts:124-140` - failed login buckets are read and updated in that module-level map.
- `src/lib/auth-security.ts:296-303` - account lockout state is persisted to the database, but the faster per-login/IP rate-limit window is not.

Impact:

- A process restart, deployment, or crash wipes all rate-limit windows.
- In a deployment with multiple web replicas, each replica has its own independent login/IP counter.
- Attackers can distribute attempts across replicas or wait for deployments to reset counters, weakening brute-force protection before database-backed lockout triggers.

Fix:

- Store rate-limit counters in Redis or PostgreSQL with atomic increment/reset semantics.
- Keep the current public helper API, but replace the internal `Map` with a shared store.
- Add a deployment note that the app should not be exposed to the public internet until rate-limit state is cross-process.

### 4. Legal, privacy, accessibility, and support pages still contain production placeholders

Severity: High

Evidence:

- `src/lib/legal-copy.ts:22-27` - German imprint copy still says provider details, mailing address, and contact channels must be inserted before production.
- `src/lib/legal-copy.ts:52-55` - German privacy copy still asks operators to add legal bases, recipient groups, processors, and email-delivery details.
- `src/lib/legal-copy.ts:74-78` - German accessibility copy still asks for the real assessment status and limitations.
- `src/lib/legal-copy.ts:99-104`, `src/lib/legal-copy.ts:129-132`, and `src/lib/legal-copy.ts:151-154` - English equivalents remain placeholders.
- `src/app/signin/sign-in-client.tsx:386` and `src/app/signin/sign-in-client.tsx:394-396` - help, imprint, privacy, and accessibility are linked from the sign-in screen.
- `src/app/[lang]/help/page.tsx:28-29` - the localized help page also contains launch-placeholder support-channel text.

Impact:

- The application publishes incomplete legal notices from public entry points.
- German institutional deployments need complete Impressum, privacy, accessibility, and support/contact disclosures before launch.
- The privacy notice still does not explain the real processors, retention periods, legal bases, or DSAR contact path.

Fix:

- Replace `src/lib/legal-copy.ts` and help-page placeholders with institution-approved copy.
- Have legal, data protection, accessibility, and IT support owners sign off before production.
- Treat this as release-blocking, not cosmetic content work.

### 5. Standard-sensitivity submissions are shown in the admin page without an audit record

Severity: Medium

Evidence:

- `src/app/admin/submissions/AdminSubmissionsPage.tsx:57-63` - the page writes a list-access audit event only for sensitive list requests with a grant.
- `src/app/admin/submissions/AdminSubmissionsPage.tsx:76-84` - default admin-page reads return standard-sensitivity submissions.
- `src/app/admin/submissions/AdminSubmissionsPage.tsx:164-166` - the list displays submitter identity and update timestamp.

Impact:

- Admin and compliance users can enumerate standard-sensitivity submissions, submitters, forms, and timestamps through the server-rendered page without a corresponding access log.
- Standard submissions can still contain personal data; routine compliance-console reads should be accountable even when they do not require break-glass.
- The JSON API does audit each returned row, so the page and API now have inconsistent audit semantics.

Fix:

- Write an audit event for every admin submissions page load, including standard-only reads and applied filters.
- Consider logging a single `submission_list.viewed` event instead of one row-level event per submission for list pages.

### 6. Email sender address still defaults to an undeliverable placeholder

Severity: Medium

Evidence:

- `src/temporal/activities/notificationActivities.ts:31-35` - email can be sent whenever the input asks for email, the user has an address, Resend is configured, and `DISABLE_EMAIL_DELIVERY` is not `true`.
- `src/temporal/activities/notificationActivities.ts:40-42` - the sender falls back to `FormFlow <notifications@example.com>` when `EMAIL_FROM_ADDRESS` is unset.

Impact:

- `example.com` is reserved and not a deliverable institutional mailbox.
- Production email may fail deliverability checks, lose bounce handling, or appear untrustworthy to recipients.
- Workflow notifications are operationally important; missed revision and approval notices can stall real processes.

Fix:

- Require `EMAIL_FROM_ADDRESS` when email delivery is enabled.
- Fail startup or emit a prominent health warning when `RESEND_API_KEY` is set, `DISABLE_EMAIL_DELIVERY !== "true"`, and `EMAIL_FROM_ADDRESS` is missing.

### 7. No codified retention, erasure, or DSAR workflow exists in the data model

Severity: Medium

Evidence:

- `prisma/schema.prisma:133-158` - `Submission` has no `deletedAt`, `purgeAt`, `retainUntil`, or archival fields.
- `prisma/schema.prisma:161-178` - `ApprovalTask` has no deletion, purge, or retention marker.
- `prisma/schema.prisma:180-190` - `Notification` has no purge marker.
- `prisma/schema.prisma:226-240` - `AuditLog` has no retention class or export/review marker.
- `PRIVACY_OPERATIONS.md:15-20` - retention is described as a manual policy baseline, not encoded behavior.
- `PRIVACY_OPERATIONS.md:22-28` - DSAR handling is described as manual database export/change work.

Impact:

- Submissions, approval notes, notifications, and audit rows accumulate indefinitely unless operators intervene manually.
- DSAR and erasure requests require direct database work with no application-level guardrails.
- Retention owners can be assigned in policy, but the app has no way to enforce their decisions.

Fix:

- Add retention metadata to submissions and related records, starting with `retainUntil` or `purgeAt`.
- Add an operator script or scheduled workflow that reports and/or purges eligible data.
- Expand `PRIVACY_OPERATIONS.md` into a tested runbook with evidence capture for DSAR outcomes.

### 8. Encryption key rotation documentation does not match the implementation

Severity: Medium

Evidence:

- `src/lib/encryption.ts:10-17` - the implementation parses `FIELD_ENCRYPTION_KEYS` as comma-separated `id=hex` entries.
- `src/lib/encryption.ts:31-33` - the legacy single-key path stores `FIELD_ENCRYPTION_KEY` under key ID `default`.
- `src/lib/encryption.ts:44-51` - the active key ID comes from `FIELD_ENCRYPTION_KEY_ID`, or the first `FIELD_ENCRYPTION_KEYS` entry, or `default`.
- `docs/developer-guide.md:71-74` - the docs say the single key is used as `key-1`, describe multi-key entries as `id:hexkey`, and say to update `FIELD_ENCRYPTION_KEY` to the new key ID.
- `docs/architecture.md:244` repeats the `id:hexkey` format.

Impact:

- Operators following the docs may configure `FIELD_ENCRYPTION_KEYS=key-1:...`, which the code silently ignores because it looks for `=`.
- If no valid key remains, encryption/decryption will fail at runtime. If a fallback key is present, operators may believe key rotation is active when it is not.
- The stored key IDs in encrypted payloads will not match the documented `key-1` expectation for single-key deployments.

Fix:

- Update docs to match the code (`id=hex`, active key via `FIELD_ENCRYPTION_KEY_ID`, single-key ID `default`) or change the code to match the documented `id:hexkey` / `key-1` contract.
- Add a startup validation that rejects malformed `FIELD_ENCRYPTION_KEYS` entries instead of skipping entries without `=`.
- Add a small integration test for multi-key decrypt/encrypt behavior and active-key selection.

## Resolved Since The Previous Audit

- **Middleware is now active.** `src/middleware.ts` exists, exports `default function middleware()`, sets the security headers, and injects `x-formflow-locale`.
- **The root locale header path is now plausible.** `src/app/layout.tsx` reads `x-formflow-locale`, and the middleware now provides it for routed requests.
- **The admin submissions UI now has a break-glass list gate.** The server-rendered admin page blocks sensitive-list filters unless the user has a signed grant. The API bypass in Finding 1 still needs to be fixed.
- **Sensitive-access grants are signed and short-lived.** `src/lib/sensitive-access.ts` signs grants with `NEXTAUTH_SECRET`, scopes them to actor plus resource, sets `HttpOnly`, and expires them after 10 minutes.
- **The code graph has been refreshed.** `GRAPH_REPORT.md` now reflects the current `src/middleware.ts` and the expanded source tree.

## Residual Risks / Open Questions

- The middleware CSP still allows `script-src 'unsafe-inline'` in production (`src/middleware.ts:7-9`) and `style-src 'unsafe-inline'` (`src/middleware.ts:21`). This may be necessary for Form.io, but it should be tested and narrowed if possible.
- I did not run automated accessibility checks or a browser smoke test against Form.io rendering under the current CSP.
- The audit-log CSV export is role-gated, but the export itself is not audited. Consider logging compliance exports as a separate action.
- TLS termination, backups, restore drills, secret rotation cadence, and infrastructure-level logging are still outside the repository.

## Recommended Go-Live Order

1. Enforce the signed break-glass grant in `GET /api/submissions` and align `GET /api/submissions/[id]` with the same grant model.
2. Replace all legal, privacy, accessibility, and support placeholders with approved institutional copy.
3. Move login rate-limit buckets to a shared persistent store.
4. Require `EMAIL_FROM_ADDRESS` whenever outbound email is enabled.
5. Define and implement retention metadata plus a purge/reporting workflow.
6. Fix the encryption key documentation/implementation mismatch and validate key config at startup.
7. Add admin-list access audit events for standard-sensitivity reads.
