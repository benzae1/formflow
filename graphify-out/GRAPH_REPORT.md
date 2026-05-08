# Graph Report - formflow  (2026-05-07)

## Corpus Check
- 73 files · ~8,389 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 168 nodes · 162 edges · 13 communities detected
- Extraction: 70% EXTRACTED · 30% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 31|Community 31]]

## God Nodes (most connected - your core abstractions)
1. `POST()` - 16 edges
2. `GET()` - 10 edges
3. `PATCH()` - 8 edges
4. `approvalWorkflow()` - 8 edges
5. `requireUser()` - 6 edges
6. `requireRole()` - 6 edges
7. `sendNotification()` - 6 edges
8. `Page()` - 5 edges
9. `apiErrorResponse()` - 5 edges
10. `filterSubmissionDataForUser()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `FormBuilderPage()` --calls--> `requireRole()`  [INFERRED]
  src\app\admin\forms\[id]\builder\page.tsx → src\lib\permissions.ts
- `GET()` --calls--> `requireRole()`  [INFERRED]
  src\app\api\workflows\route.ts → src\lib\permissions.ts
- `GET()` --calls--> `requireUser()`  [INFERRED]
  src\app\api\workflows\route.ts → src\lib\permissions.ts
- `GET()` --calls--> `submissionVisibilityWhere()`  [INFERRED]
  src\app\api\workflows\route.ts → src\lib\submission-visibility.ts
- `POST()` --calls--> `requireRole()`  [INFERRED]
  src\app\api\workflows\route.ts → src\lib\permissions.ts

## Hyperedges (group relationships)
- **Repository Onboarding Documents** — agents_md, claude_md, readme_md [INFERRED 0.88]
- **Next.js Project Guidance** — agents_md, nextjs_breaking_changes, next_docs_guide, deprecation_notices, nextjs_guidance_rationale [EXTRACTED 0.97]
- **Prisma Local Setup Flow** — readme_md, getting_started, local_env_setup, prisma_migrate, prisma_7, prisma_config_ts, prisma_schema_prisma [EXTRACTED 0.96]
- **Document Icon Visual Composition** — file_document_icon, file_folded_corner_page, file_text_lines_indicator [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (7): writeAuditLog(), ApiError, apiErrorResponse(), syncOrg(), GET(), POST(), PUT()

### Community 1 - "Community 1"
Cohesion: 0.2
Nodes (12): cancelRemainingTasks(), completeTask(), createApprovalTasks(), createChildSubmission(), getWorkflowForSubmission(), markSubmissionInReview(), markTaskOverdueIfPending(), sendReminderIfTaskPending() (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.19
Nodes (10): decryptValue(), encryptValue(), getKey(), collectFieldRules(), filterSubmissionDataForUser(), maybeDecrypt(), encryptSensitiveSubmissionData(), getSensitiveFieldKeys() (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.19
Nodes (12): Deprecation Notices, Local Development Server, FormFlow, Getting Started, Local Environment Setup, Next Internal Docs Guide, Next.js Breaking Changes, Read Project-Specific Next.js Docs Before Coding (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.2
Nodes (5): getSession(), FormBuilderPage(), InboxPage(), requireRole(), requireUser()

### Community 5 - "Community 5"
Cohesion: 0.29
Nodes (2): getFailedTemporalWorkflowCount(), getTemporalClient()

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (1): Page()

### Community 7 - "Community 7"
Cohesion: 0.83
Nodes (3): resolveAssignees(), resolveOrgTarget(), resolveSingleTarget()

### Community 8 - "Community 8"
Cohesion: 0.5
Nodes (4): Document File Icon, Folded-Corner Page Shape, Generic Document or Attachment Affordance, Text Lines Indicator

### Community 9 - "Community 9"
Cohesion: 0.5
Nodes (3): Minimalist Vector Logo, Vercel Brand Mark, White Triangular Glyph

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (3): Earth Globe, Geographic Grid, Globe Icon

### Community 11 - "Community 11"
Cohesion: 0.67
Nodes (3): window.svg asset, Browser Window Icon, Window Header Controls

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (2): Next.js Brand Identity, Next.js Wordmark Logo

## Knowledge Gaps
- **12 isolated node(s):** `prisma.config.ts`, `Local Environment Setup`, `prisma/schema.prisma`, `Local Development Server`, `Folded-Corner Page Shape` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 5`** (7 nodes): `formatDateTime()`, `getFailedTemporalWorkflowCount()`, `SectionCard()`, `toneClasses()`, `page.tsx`, `temporal.ts`, `getTemporalClient()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 6`** (6 nodes): `Page()`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `Next.js Brand Identity`, `Next.js Wordmark Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `POST()` connect `Community 0` to `Community 2`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `PATCH()` connect `Community 2` to `Community 0`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `requireUser()` connect `Community 4` to `Community 0`, `Community 2`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `POST()` (e.g. with `requireRole()` and `writeAuditLog()`) actually correct?**
  _`POST()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GET()` (e.g. with `requireRole()` and `apiErrorResponse()`) actually correct?**
  _`GET()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `PATCH()` (e.g. with `requireUser()` and `submissionVisibilityWhere()`) actually correct?**
  _`PATCH()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `approvalWorkflow()` (e.g. with `getWorkflowForSubmission()` and `markSubmissionInReview()`) actually correct?**
  _`approvalWorkflow()` has 7 INFERRED edges - model-reasoned connections that need verification._