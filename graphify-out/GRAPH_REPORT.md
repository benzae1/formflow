# Graph Report - formflow  (2026-05-17)

## Corpus Check
- 175 files · ~50,594 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 542 nodes · 810 edges · 27 communities detected
- Extraction: 68% EXTRACTED · 32% INFERRED · 0% AMBIGUOUS · INFERRED: 258 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 42|Community 42]]

## God Nodes (most connected - your core abstractions)
1. `POST()` - 34 edges
2. `GET()` - 31 edges
3. `localizePath()` - 19 edges
4. `update()` - 18 edges
5. `PATCH()` - 16 edges
6. `getMutationHeaders()` - 14 edges
7. `getLocaleContext()` - 14 edges
8. `getCurrentUser()` - 13 edges
9. `approvalWorkflow()` - 13 edges
10. `PUT()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `update()` --calls--> `revokeUserSessions()`  [INFERRED]
  src\app\admin\workflows\WorkflowsManagerClient.tsx → src\lib\auth-security.ts
- `encryptSensitiveSubmissionData()` --calls--> `createSubmissionFixture()`  [INFERRED]
  src\lib\formio-data.ts → tests\support\fixtures.ts
- `proxy()` --calls--> `isLocale()`  [INFERRED]
  C:\Users\Carlotta\Documents\antonsSachen\formflow\src\proxy.ts → C:\Users\Carlotta\Documents\antonsSachen\formflow\src\lib\i18n\config.ts
- `getFailedTemporalWorkflowCount()` --calls--> `getTemporalClient()`  [INFERRED]
  src\app\admin\page.tsx → src\lib\temporal.ts
- `createForm()` --calls--> `localizePath()`  [INFERRED]
  src\app\admin\forms\FormsManagerClient.tsx → C:\Users\Carlotta\Documents\antonsSachen\formflow\src\lib\i18n\routing.ts

## Hyperedges (group relationships)
- **Repository Onboarding Documents** — agents_md, claude_md, readme_md [INFERRED 0.88]
- **Next.js Project Guidance** — agents_md, nextjs_breaking_changes, next_docs_guide, deprecation_notices, nextjs_guidance_rationale [EXTRACTED 0.97]
- **Prisma Local Setup Flow** — readme_md, getting_started, local_env_setup, prisma_migrate, prisma_7, prisma_config_ts, prisma_schema_prisma [EXTRACTED 0.96]
- **Document Icon Visual Composition** — file_document_icon, file_folded_corner_page, file_text_lines_indicator [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (41): buildRoleConnections(), getCurrentUser(), getDefaultRouteForRoles(), getDefaultRoutePathForRoles(), getSession(), isLocale(), getDictionary(), AdminLayout() (+33 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (33): requirePendingApprovalTask(), buildCsrfCookie(), createCsrfToken(), getCsrfCookieValue(), parseCookieHeader(), ApiError, apiErrorResponse(), normalizeSubmissionData() (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (31): cancelRemainingTasks(), completeTask(), createApprovalTasks(), createChildSubmission(), getSubmissionWorkflowContext(), markSubmissionInReview(), markTaskOverdueIfPending(), notifySubmitterOfOutcome() (+23 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (17): updateRoles(), generateDraftTranslation(), save(), buildMutationHeaders(), createDelegation(), removeDelegation(), request(), createForm() (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (20): connectRoles(), createFormFixture(), createSensitiveFormFixture(), createSubmissionFixture(), createWorkflowFixture(), ensureSystemRoles(), hashTestPassword(), resetDatabase() (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (23): normalizeAuditValue(), writeAuditLog(), authorizeCredentials(), getRoleNames(), haveSameRoles(), checkRateLimited(), clearRateLimitBuckets(), consumeRateLimitBucket() (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (24): authenticateLdapUser(), bindForSearch(), getLdapBaseDnsFromEnv(), getLdapUrlsFromEnv(), parseLdapBaseDns(), splitCommaSeparatedEnvList(), splitLdapUrlList(), createClient() (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.21
Nodes (21): collectColumnDescriptors(), collectComponentDescriptors(), collectFieldDescriptors(), collectRowDescriptors(), decryptSubmissionData(), deepMapValues(), encryptSensitiveSubmissionData(), filterSubmissionDataForUser() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (11): changeType(), chooseWorkflow(), formatIssues(), handleDrop(), makeKey(), moveStage(), newStageRow(), newWorkflow() (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (16): bindForSearch(), createLdapOrgAdapter(), fetchDirectory(), getAttribute(), getDisplayName(), getFirst(), getValues(), normalizeDirectory() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.19
Nodes (12): Deprecation Notices, Local Development Server, FormFlow, Getting Started, Local Environment Setup, Next Internal Docs Guide, Next.js Breaking Changes, Read Project-Specific Next.js Docs Before Coding (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.24
Nodes (12): generateDraftFormTranslation(), isDraftTranslationAvailable(), translateTexts(), applySchemaTranslations(), collectSchemaTranslationEntries(), getLocaleTranslation(), getValueAtPath(), parseFormTranslations() (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.23
Nodes (8): collectFormFieldSettings(), updateFormFieldSettings(), validateFormioSchema(), visitFormioComponents(), walkColumns(), walkComponents(), walkRows(), getSensitiveFieldKeys()

### Community 13 - "Community 13"
Cohesion: 0.32
Nodes (11): authenticated_conn(), discover_dn(), dump_own_entry(), _label(), main(), make_conn(), Anonymous search to find the full DN for a uid., Two-step: discover DN anonymously, then bind with credentials. (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.25
Nodes (2): getStatusLabel(), titleCaseStatus()

### Community 15 - "Community 15"
Cohesion: 0.83
Nodes (3): getMissingTables(), main(), run()

### Community 16 - "Community 16"
Cohesion: 0.5
Nodes (1): Loading()

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (2): collectLabels(), SubmissionFormView()

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (4): Document File Icon, Folded-Corner Page Shape, Generic Document or Attachment Affordance, Text Lines Indicator

### Community 20 - "Community 20"
Cohesion: 0.5
Nodes (3): Minimalist Vector Logo, Vercel Brand Mark, White Triangular Glyph

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (2): connectRoles(), main()

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (2): FormBuilder(), serializeSchema()

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (2): StatusBadge(), toneForStatus()

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (2): ensureOrgSyncSchedule(), run()

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (3): Earth Globe, Geographic Grid, Globe Icon

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (3): window.svg asset, Browser Window Icon, Window Header Controls

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (2): Next.js Brand Identity, Next.js Wordmark Logo

## Knowledge Gaps
- **14 isolated node(s):** `Anonymous search to find the full DN for a uid.`, `Two-step: discover DN anonymously, then bind with credentials.`, `prisma.config.ts`, `Local Environment Setup`, `prisma/schema.prisma` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 14`** (9 nodes): `ui.ts`, `describeStage()`, `formatDate()`, `formatDateTime()`, `getBooleanLabel()`, `getRoleLabel()`, `getStatusLabel()`, `summarizeWorkflow()`, `titleCaseStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (4 nodes): `Loading()`, `loading.tsx`, `loading.tsx`, `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (4 nodes): `SubmissionFormView.tsx`, `collectLabels()`, `renderValue()`, `SubmissionFormView()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (3 nodes): `seed.ts`, `connectRoles()`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (3 nodes): `FormBuilder()`, `serializeSchema()`, `FormBuilder.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (3 nodes): `StatusBadge.tsx`, `StatusBadge()`, `toneForStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (3 nodes): `worker.ts`, `ensureOrgSyncSchedule()`, `run()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `Next.js Brand Identity`, `Next.js Wordmark Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `POST()` connect `Community 1` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 11`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Why does `update()` connect `Community 2` to `Community 8`, `Community 1`, `Community 5`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `GET()` connect `Community 1` to `Community 0`, `Community 2`, `Community 4`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Are the 24 inferred relationships involving `POST()` (e.g. with `assertMutationRequest()` and `requireRole()`) actually correct?**
  _`POST()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `GET()` (e.g. with `requireRole()` and `apiErrorResponse()`) actually correct?**
  _`GET()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `localizePath()` (e.g. with `Home()` and `AdminLayout()`) actually correct?**
  _`localizePath()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `update()` (e.g. with `decrypt()` and `encrypt()`) actually correct?**
  _`update()` has 16 INFERRED edges - model-reasoned connections that need verification._