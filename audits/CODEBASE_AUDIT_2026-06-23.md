# FormFlow Production Readiness Audit

Date: 2026-06-23

Scope: current repository state at `/home/test/Desktop/formflow`. I reviewed the previous audit (`audits/CODEBASE_AUDIT_2026-05-29.md`), read the git log since that date, and then did a fresh static review of every file changed in those commits plus a second pass over the retention, encryption, form import/export, role-management, and approval-workflow subsystems.

## Executive Summary

Six of the seven findings from the May 29 audit have been closed. The break-glass enforcement is now consistent across the UI and API for both the list and individual-submission paths. Rate-limit state is backed by a PostgreSQL atomic upsert. The email sender is validated at startup. Standard-sensitivity admin page loads are now audited. Encryption documentation now matches the implementation. Retention metadata columns and a purge script have been added.

The single highest-priority open item from the previous audit — legal, privacy, accessibility, and help placeholders — is still live.

Four new issues were uncovered during this pass:

- The retention script (`scripts/retention-operations.ts`) will fail at runtime on any submission that still has associated `ApprovalTask` rows whose `purgeAt` date has not been reached, because no `onDelete: Cascade` directive exists on the Prisma schema relation and the script does not delete related tasks as a unit with the submission.
- The application never populates `retainUntil`, `purgeAt`, or `deletedAt` on any model. The retention columns exist in the schema and the purge script reads them, but nothing writes them. Until they are set — either by business logic or by operator intervention — the purge script is a no-op.
- `formiojs ^4.21.7` is listed as a direct dependency in `package.json` but is not imported anywhere in source. The project uses `@formio/js ^5.3.0` and `@formio/react ^6.2.0`. The phantom entry inflates the dependency surface without serving a purpose.
- The sensitive-access cookie grants only one active grant at a time. Each new `POST /api/sensitive-access` call replaces the entire cookie, so a user who obtains a grant for one sensitive submission and then opens a second loses the first grant. This causes spurious 428 errors in multi-window sessions.

The codebase is meaningfully closer to production readiness than in May. The access-control surface is now coherent. The most important near-term work is the legal placeholder content (required by German law before launch) and the retention lifecycle gap (required for DSGVO compliance).

## Verification Snapshot

Static review only. I did not run the test suite because this pass surfaces findings rather than changing runtime code. Key commits reviewed since the May 29 audit:

- `4ab4ef5` — Enforce signed break-glass grants in submissions APIs
- `b3d4d5c` — Persist auth throttles and add retention operations
- `3harden` — Harden config validation and align operational docs
- `5666659` — Added ability to import and export form JSON schemas
- `77e89a6` — Updated emailantrag.json to match the expected import schema
- `f09f2ba` — Set submission status to closed at end of approval workflow
- `5cd2d48` — Fix CSRF cookie Secure flag on HTTP deployments
- `33207bd` / `9a4ea6f` — Role and workflow stability fixes

## Findings

### 1. Legal, privacy, accessibility, and help pages still contain production placeholders

Severity: High

Evidence:

- `src/lib/legal-copy.ts:26-27` — German imprint says "Vor dem Produktivstart sollten hier die vollstandigen offiziellen Anbieterangaben, Postanschrift und zentralen Kontaktwege der Universitat eingefugt werden."
- `src/lib/legal-copy.ts:54-55` — German privacy section says operators need to add legal bases, recipient groups, processors, and email-delivery details before going live.
- `src/lib/legal-copy.ts:76-77` — German accessibility section says the real assessment status must be documented before launch.
- `src/app/[lang]/help/page.tsx` — help page contains launch-placeholder support-channel text.
- English equivalents at `src/lib/legal-copy.ts:102-103`, `130-131`, and `158-159` contain identical placeholder instructions.

Impact:

- German institutional deployments must publish a complete Impressum under § 5 TMG and a complete DSGVO privacy notice before any user data is processed. These notices are reachable from the public sign-in footer today.
- The placeholder text explicitly instructs operators to make the replacement, so any user who reads the current notice will see instructions rather than legal content.

Fix:

- Replace `src/lib/legal-copy.ts` and help-page content with institution-approved copy reviewed by legal, data-protection, accessibility, and IT-support owners.
- Treat as a release-blocking item. The sign-in page links these pages directly (`src/app/signin/sign-in-client.tsx:386-396`), so they are visible before authentication.

---

### 2. Retention script will fail due to missing cascade on `ApprovalTask → Submission`

Severity: Medium

Evidence:

- `prisma/schema.prisma:171-191` — `ApprovalTask` has `submissionId String` referencing `Submission.id` with no `onDelete` directive. Prisma defaults to `NoAction`, which maps to a PostgreSQL foreign-key `RESTRICT` constraint.
- `scripts/retention-operations.ts:59-64` — the script deletes approval tasks where `purgeAt <= now`, then deletes submissions where `purgeAt <= now` OR `deletedAt != null`.
- `scripts/retention-operations.ts:65-72` — no check is made that a submission's approval tasks have all been cleared before attempting the submission delete.

Impact:

- Any submission that has associated `ApprovalTask` rows that do not themselves have `purgeAt` set (or whose `purgeAt` is still in the future) will cause the `deleteMany` at line 65 to fail with a PostgreSQL foreign-key violation.
- Because `deleteMany` runs inside a single Prisma call, a single blocked row will cause the entire submission batch to fail silently at the database level, leaving the run appearing to succeed with zero deleted rows.
- Operators following the script in `--purge` mode will receive a misleading result summary.

Fix (two options, pick one):

Option A — add `onDelete: Cascade` to `ApprovalTask.submission` in `prisma/schema.prisma` and migrate. The cascade will propagate submission deletes to related tasks automatically. This is the cleanest approach.

Option B — in `retention-operations.ts`, before deleting submissions, delete their related approval tasks unconditionally:

```typescript
await db.approvalTask.deleteMany({
  where: {
    submission: {
      OR: [{ purgeAt: { lte: now } }, { deletedAt: { not: null } }],
    },
  },
});
```

Run this before the current `deletedApprovalTasks` step. The same FK issue applies to `childSubmissions` self-reference in `Submission` if parent submissions are deleted before children; audit that path as well.

---

### 3. Application code never sets `retainUntil`, `purgeAt`, or `deletedAt`

Severity: Medium

Evidence:

- `prisma/schema.prisma:159-161` — `Submission` has `retainUntil DateTime?`, `purgeAt DateTime?`, and `deletedAt DateTime?`.
- `prisma/schema.prisma:183-184` and `:199-202` — `ApprovalTask`, `Notification`, and `AuditLog` have equivalent fields.
- A codebase-wide search for writes to `retainUntil`, `purgeAt`, or `deletedAt` returns zero results in `src/`.
- `scripts/retention-operations.ts:19-38` — the report mode counts rows where these fields are set. Under the current code, that count will always be zero.

Impact:

- All submissions, tasks, notifications, and audit records accumulate indefinitely regardless of operator intent.
- The `--purge` mode of the retention script is safe in the sense that it cannot delete anything, but it also provides no DSGVO compliance value.
- DSAR erasure and purpose-limitation obligations cannot be met programmatically until write paths exist.

Fix:

- Define and implement the business rules for when each record type should be eligible for purge. A reasonable starting point:
  - Set `purgeAt = now() + retention_period` on `Submission` when its status transitions to `closed` or `rejected`.
  - Cascade `purgeAt` to related `ApprovalTask` and `Notification` rows at the same time.
  - Set `deletedAt` on `Submission` when an erasure request is honored.
- Add a Temporal workflow or Next.js API route (admin-only) for honoring DSAR erasure requests that sets `deletedAt` and logs the action.
- Expand `PRIVACY_OPERATIONS.md` into a runnable checklist that references these code paths.

---

### 4. `formiojs` v4 is a phantom direct dependency

Severity: Low

Evidence:

- `package.json:46` — `"formiojs": "^4.21.7"` is listed as a direct runtime dependency.
- A search of `src/**` for `import … from "formiojs"` returns no results.
- `src/components/form-builder/FormBuilder.tsx:4-5` and `src/components/form-renderer/FormRenderer.tsx:4` import from `@formio/react` and `@formio/js` only.
- `@formio/react ^6.2.0` depends on `@formio/js ^5.x` and does not require `formiojs ^4.x` as a peer.

Impact:

- `formiojs` v4 pulls a large bundle of its own transitive dependencies into `node_modules` and `package-lock.json`, increasing install time and attack surface.
- Security scanners (Dependabot, Snyk) will report vulnerabilities found in `formiojs ^4` as actionable items for this project even though the package is never loaded.
- An accidental import of `formiojs` instead of `@formio/js` in a future file would silently use the older, unsupported major.

Fix:

- Remove `"formiojs": "^4.21.7"` from `package.json` and run `npm install` to prune it from `package-lock.json`.
- If any tooling or test helper imports `formiojs`, migrate it to `@formio/js`.

---

### 5. Sensitive-access cookie holds only one grant; concurrent multi-window sessions break

Severity: Low

Evidence:

- `src/lib/sensitive-access.ts:102-116` — `buildSensitiveAccessCookie` always constructs the cookie value as `serializeSignedCookie([nextGrant])` — a single-element array — and issues a `Max-Age=600` cookie that replaces any prior value.
- `src/app/api/sensitive-access/route.ts:48-56` — the grant returned by `POST /api/sensitive-access` overwrites the cookie rather than appending to it.
- `src/lib/sensitive-access.ts:92-99` — `getSensitiveAccessGrant` reads all active grants from the cookie and returns the first matching one.

Impact:

- If a user opens two sensitive submissions in separate tabs — or opens the admin sensitive list and then a specific sensitive submission — the second grant replaces the first. The first tab then gets a 428 on the next action that reads the cookie, requiring a second justification.
- No data is exposed; this is a usability regression that will erode trust in the break-glass UX, particularly for compliance roles that routinely review multiple sensitive submissions.

Fix:

- Change `buildSensitiveAccessCookie` to read the existing grants from the current cookie (passed in as a parameter), append or update the new grant, drop any expired entries, and re-sign the merged list.
- Cap the number of concurrent grants (e.g. five) to bound the cookie size.

---

### 6. Sensitive-access cookie Secure flag uses `NODE_ENV`; CSRF cookie uses URL scheme

Severity: Low

Evidence:

- `src/lib/sensitive-access.ts:114` — `const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";`
- `src/lib/csrf.ts:37-39` — `const secure = appUrl?.startsWith("https://") ? "; Secure" : "";`

Impact:

- If the application is deployed to a non-production environment that uses HTTPS (staging, preview), the sensitive-access cookie will be sent over HTTP while the CSRF cookie will correctly require HTTPS. The inconsistency is unlikely to cause a real vulnerability in practice but introduces an unexplained discrepancy that confuses auditors and operators.
- More critically, if a future operator runs the app in `NODE_ENV=development` over a public HTTPS endpoint (not uncommon in cloud preview deployments), the sensitive-access cookie will lack the `Secure` attribute and could be intercepted.

Fix:

- Align `sensitive-access.ts` to use the same URL-scheme test as `csrf.ts`:

```typescript
const appUrl = process.env.NEXTAUTH_URL?.trim() || process.env.APP_URL?.trim();
const secure = appUrl?.startsWith("https://") ? "; Secure" : "";
```

---

## Resolved Since The Previous Audit

- **`GET /api/submissions?includeSensitive=true` break-glass bypass is fixed.** The API now calls `getSensitiveAccessGrant` before honoring sensitive filters and returns `428` without a valid signed cookie (`src/app/api/submissions/route.ts:58-73`).
- **Dual break-glass models for individual submissions are unified.** `GET /api/submissions/[id]` now requires the signed sensitive-access cookie and returns `428` without it, matching the page-layer contract (`src/app/api/submissions/[id]/route.ts:54-68`).
- **Login rate-limit state is now backed by PostgreSQL.** `src/lib/auth-security.ts:117-141` uses an atomic `INSERT … ON CONFLICT DO UPDATE` to maintain per-key counters in `LoginRateLimitBucket`. State survives restarts and is shared across replicas.
- **Standard-sensitivity admin page loads are now audited.** `src/app/admin/submissions/AdminSubmissionsPage.tsx:98-105` calls `auditSubmissionListAccess` unconditionally, not only for sensitive requests.
- **Email startup validation is enforced.** `src/temporal/activities/notificationActivities.ts:10-12` throws at module load time if `RESEND_API_KEY` is set, `DISABLE_EMAIL_DELIVERY !== "true"`, and `EMAIL_FROM_ADDRESS` is empty. The example fallback to `notifications@example.com` is gone.
- **Encryption documentation matches the implementation.** `docs/developer-guide.md:79-83` now correctly describes `FIELD_ENCRYPTION_KEYS` as comma-separated `id=hexkey` pairs, the single-key fallback as key ID `default`, and malformed entries as rejected at runtime rather than silently skipped.
- **Retention metadata columns are present in the schema.** `prisma/schema.prisma:159-167` adds `retainUntil`, `purgeAt`, and `deletedAt` to `Submission`, and equivalent columns to `ApprovalTask`, `Notification`, and `AuditLog`. `scripts/retention-operations.ts` provides a report/purge operator tool. The gap in Finding 3 above is that the application never writes these fields.

## Residual Risks / Open Questions

- The form builder and public form renderer both run under `script-src 'self' 'unsafe-inline' 'unsafe-eval'` because Form.io uses `Function()`-based templates. This is a necessary concession while Form.io is used, but the `unsafe-inline` allowance (present for all routes including non-Form.io ones) should be reviewed for tightening on routes that do not mount Form.io components.
- The audit log stores `beforeState` and `afterState` for form updates (`src/app/api/forms/[id]/route.ts:172-179`). These fields include the full JSON schema and translations blob. This is metadata rather than personal data, but the AuditLog table should be surveyed to confirm no plaintext submission data leaks into state snapshots.
- `next-auth ^4.24.14` is in LTS maintenance mode. No active CVE applies to this version at the time of writing, but the upgrade path to v5 requires session-handler changes and should be planned before v4 reaches end of life.
- TLS termination, backup/restore drills, secret rotation cadence, and infrastructure-level logging remain outside the repository and should be documented in the deployment runbook before go-live.

## Recommended Go-Live Order

1. Replace all legal, privacy, accessibility, and help placeholders with approved institutional copy. This is required by law and is blocking.
2. Fix the retention script FK ordering bug (Finding 2, option A: add `onDelete: Cascade`).
3. Implement business logic to set `purgeAt`/`deletedAt` when submissions close or are subject to DSAR (Finding 3).
4. Remove the orphan `formiojs ^4.21.7` dependency (Finding 4 — low risk, high hygiene value).
5. Fix the sensitive-access cookie to merge multiple concurrent grants (Finding 5).
6. Align the sensitive-access cookie Secure flag to use the URL-scheme test (Finding 6).
