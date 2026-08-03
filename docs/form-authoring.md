# Form authoring guide

FormFlow uses a hardened subset of Form.io. Administrators create metadata under `/<locale>/admin/forms` and edit the schema at `/<locale>/admin/forms/<id>/builder`. There is no JSON-import action or form-delete endpoint in the current UI/API; example JSON must be recreated through the builder or posted through an authenticated, CSRF-protected admin API client after validation.

## Authoring lifecycle

1. Create a draft with a unique lowercase slug.
2. Open the builder and design the German base form.
3. Set form sensitivity and allowed roles.
4. Set field encryption/read rules.
5. Attach a validated workflow.
6. Create/review the English translation if required.
7. preview and test in both locales with every relevant role;
8. publish.

Published user URLs are `/de/forms/<slug>` and `/en/forms/<slug>`. Unlocalized `/forms/<slug>` is redirected to German by the current middleware.

## Form-level access and sensitivity

Empty allowed roles mean every authenticated user can open/submit a published form. A non-empty list requires at least one matching role; admins bypass this form gate. Removing a user's access after a draft/revision was created also prevents that user from submitting/resubmitting it.

Sensitivity controls administrative visibility:

| Value | Current behavior |
|---|---|
| `standard` | Included in admin/compliance lists by default |
| `pii` | Hidden from default global list; sensitive list grant required to include/filter it |
| `sensitive` | Same list gate as PII, plus a per-submission ten-minute grant for detail reads |

Owners and assigned approvers use record visibility rules; field read rules still apply. Classify based on the most sensitive possible content and obtain institutional guidance.

## Supported components

The server allowlist currently accepts:

`button`, `checkbox`, `columns`, `container`, `content`, `datagrid`, `day`, `editgrid`, `email`, `fieldset`, `number`, `panel`, `phoneNumber`, `radio`, `select`, `selectboxes`, `table`, `textarea`, `textfield`, and `well`.

Do not rely on components documented by generic Form.io material but absent from this list (for example file upload, signature, datetime, survey, wizard/PDF display). The schema must use `display: "form"` and include a submit button.

The validator also enforces:

- unique keys that start with a letter and contain only letters, digits, or underscores;
- local `values`/`json` select data sources;
- no meaningful `calculateValue`, `customConditional`, `customDefaultValue`, `customValidation`, or `logic`;
- no script tags, inline event handlers, or `javascript:` in content HTML;
- only supported custom properties.

## Field security settings

Use the builder's **Field access settings** panel. It writes these string properties:

```json
{
  "type": "textfield",
  "key": "studentNumber",
  "label": "Matrikelnummer",
  "properties": {
    "sensitive": "true",
    "readRoles": "admin, compliance",
    "ownerCanRead": "true"
  }
}
```

- `sensitive: "true"` encrypts the stored value recursively, including nested fields in supported containers/grids.
- `readRoles` is a comma-separated list allowed to receive the value. Empty means everyone can read it.
- `ownerCanRead` defaults to true and lets the owner bypass a non-empty role list. Set it to `"false"` together with a restrictive `readRoles` list to hide the stored value from an owner who lacks those roles.

The old `encrypted` custom property is not supported. Encryption is independent of the form's `pii`/`sensitive` classification: one protects selected database values, the other controls record access.

The current AES-256-GCM envelope is:

```json
{
  "__encrypted": true,
  "keyId": "default",
  "iv": "hex",
  "tag": "hex",
  "value": "hex"
}
```

Never publish encrypted fields until production key storage, backup, recovery, and rotation have been tested.

## Validation and submitted data

Form.io's client validation improves UX, but the API also normalizes data from the saved localized schema. Unknown fields and incompatible shapes/types are rejected. Button state is discarded. Required/date/range/value checks are applied for the supported data types.

Test nested containers, data grids, select boxes, numeric/boolean option values, optional empty values, and both locales. The persisted schema snapshot is the authority for historical rendering and field access.

## German/English form content

German is the base `Form.title` and `Form.schema`. English content is stored as a full localized object:

```json
{
  "en": {
    "title": "Travel request",
    "schema": { "display": "form", "components": [] },
    "reviewStatus": "reviewed",
    "generatedAt": "2026-08-03T10:00:00.000Z"
  }
}
```

With `DEEPL_API_KEY`, the builder can generate an English draft from translatable schema strings. It uses DeepL's free API endpoint and sets `needs_review`. Check labels, descriptions, choices, validation messages, policy terms, accessibility, and layout manually. If English is absent, the German form is used as fallback.

## Versions and snapshots

Creation writes `FormVersion` 1. While a form is already published, changing its title, schema, or translations increments the form version and writes a snapshot. Publishing a draft without changing those fields does not by itself create another version.

Each submission stores the localized schema at submission/draft creation, form version, locale, and workflow definition/version. A draft submitted later refreshes its snapshot from the then-current form/workflow. Historical views prefer the submission snapshot.

There is no UI to compare or restore `FormVersion` records; that is a future usability/operations improvement.

## Parent and triggered forms

Forms can store `parentFormId`, and workflows can use `trigger-form` with `childFormId`. The latter creates an empty draft child submission linked to the parent submission and notifies the original submitter. It does not automatically submit or run the child workflow.

The current server verifies that the referenced child form exists, not that it is published or accessible to the submitter. Test the complete follow-up journey before use.

## Publication checklist

- [ ] Correct sensitivity classification and institutional processing purpose
- [ ] Allowed roles are minimal and tested
- [ ] Supported components only; stable unique field keys
- [ ] Server and client validation tested with invalid/boundary data
- [ ] Sensitive/read-role/owner rules reviewed per field
- [ ] Encryption keys and recovery process proven
- [ ] Runnable workflow with active/resolvable targets
- [ ] German and English content reviewed by responsible owners
- [ ] Owner, approver, admin, compliance, and unauthorized journeys tested
- [ ] Retention owner/period and DSAR owner assigned outside the current UI
- [ ] Accessibility and privacy review completed
