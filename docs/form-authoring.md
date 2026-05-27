# FormFlow — Form Authoring Guide

Forms in FormFlow are defined using [Form.io](https://formio.io/), a JSON-based form schema standard. The admin panel includes a drag-and-drop form builder that produces this JSON automatically. You can also import forms directly by uploading or pasting JSON.

---

## Creating a Form

1. Sign in as an admin and navigate to `/de/admin/forms`
2. Click **New form**
3. Give the form a title and a URL slug (e.g. `emailantrag`)
4. Choose a sensitivity level (see below)
5. Use the form builder to add fields
6. Attach a workflow
7. Click **Publish** when ready

Once published, the form is available at `/forms/[slug]`.

---

## Form Sensitivity Levels

Every form has a sensitivity classification that controls how submissions are accessed.

| Level | Description | Access control |
|---|---|---|
| `standard` | No special personal data | Normal role-based access |
| `pii` | Contains identifiable personal data (name, address, matriculation number, etc.) | Break-glass justification required to view submission list with this filter |
| `sensitive` | Contains special-category data (health, disciplinary, etc.) | Break-glass justification required for every submission detail access |

Break-glass access is logged to the audit trail with the user's stated reason. The justification must be at least 10 characters and is stored in a short-lived (10-minute) signed cookie.

Choose the sensitivity level based on the most sensitive data the form can contain, not on what most submissions will contain.

---

## Form.io Schema

FormFlow stores the Form.io schema as JSON in the `Form.schema` column. The schema produced by the form builder follows the [Form.io specification](https://help.form.io/developers/form-json). Key fields:

```json
{
  "components": [
    {
      "type": "textfield",
      "key": "vorname",
      "label": "Vorname",
      "validate": { "required": true }
    },
    {
      "type": "textfield",
      "key": "matrikelnummer",
      "label": "Matrikelnummer",
      "properties": { "encrypted": "true" }
    }
  ]
}
```

---

## Marking Sensitive Fields for Encryption

Individual form fields can be encrypted at rest, independently of the form's overall sensitivity level. This is useful for fields like matriculation numbers, health information, or financial data even on otherwise standard-sensitivity forms.

To mark a field as encrypted:

1. In the form builder, select the field
2. Open **Advanced** → **Custom Properties**
3. Add the property `encrypted` with value `"true"`

At submission time, `encryptSensitiveSubmissionData()` replaces the field value with an AES-256-GCM encrypted envelope. The value is transparently decrypted when displayed in the submission detail view to users with the appropriate access.

Encrypted field values in the database look like:

```json
{
  "__encrypted": true,
  "iv": "base64-encoded-iv",
  "tag": "base64-encoded-auth-tag",
  "data": "base64-encoded-ciphertext",
  "keyId": "key-1"
}
```

### Which fields should be encrypted?

Encrypt fields that contain data you would not want exposed if the database were compromised:

- Matriculation/student ID numbers
- National identification numbers
- Medical or health information
- Financial account details
- Disciplinary information

Fields that are already non-sensitive even in isolation (e.g. a free-text "comments" field) do not need encryption. Over-encrypting increases CPU cost and makes debugging harder.

---

## Form Translations

FormFlow supports bilingual (German/English) forms. If a form has a `translations` field, the form builder will display the translated labels when the user's locale is `en`.

The `translations` structure is a JSON object mapping locale codes to alternative field labels:

```json
{
  "en": {
    "vorname": { "label": "First name" },
    "matrikelnummer": { "label": "Student ID number" }
  }
}
```

The LLM-assisted translation service (`src/lib/form-translation-service.ts`) can generate draft translations for an existing German form schema. The output should always be reviewed by a human before publishing.

---

## Form Versioning

Every time a published form's schema is updated and saved, the system:

1. Creates a `FormVersion` snapshot of the previous schema
2. Increments the form's `version` integer

**Submissions capture a snapshot of the schema at time of submission** (`formSchemaSnapshot`). This means:
- Historical submissions always render correctly, even if the form has changed since
- You can safely add, remove, or relabel fields on published forms without breaking existing submissions
- Approval workflows also snapshot the workflow definition for the same reason

---

## Example Form: E-Mail-Antrag (`emailantrag.json`)

The `forms/emailantrag.json` file is a complete example of a German university form for requesting a university email account. It demonstrates:

- Multi-section layout using panels
- Required field validation
- Dropdown select fields
- Checkbox fields with conditional logic
- Signature and date fields
- German labels with typical university form conventions

### Structure overview

```
Panel: Persönliche Angaben (Personal details)
  ├─ Vorname (First name)           [textfield, required]
  ├─ Nachname (Last name)           [textfield, required]
  ├─ Matrikelnummer                 [textfield, required, encrypted]
  ├─ E-Mail (existing)              [email]
  └─ Studiengang (Programme)        [select]

Panel: Antrag (Request)
  ├─ Art des Antrags (Request type) [select]
  ├─ Begründung (Justification)     [textarea]
  └─ Bestätigung (Confirmation)     [checkbox, required]

Panel: Unterschrift (Signature)
  ├─ Ort und Datum (Place + Date)   [textfield]
  └─ Unterschrift (Signature)       [signature]
```

### Loading this form into a development instance

The seed script (`prisma/seed.ts`) automatically imports all JSON files in the `forms/` directory as published forms. After running `docker compose up --build`, the E-Mail-Antrag form is available at `/forms/emailantrag`.

### Using this form as a template

To base a new form on `emailantrag.json`:

1. Copy the file: `cp forms/emailantrag.json forms/my-new-form.json`
2. Edit the JSON to change the title, slug, and components
3. Restart the stack or re-run the seed: `docker compose restart init`
4. The new form appears in the admin panel and at `/forms/my-new-form`

Alternatively, import the JSON through the admin UI: Admin → Forms → New form → Import JSON.

---

## Form.io Component Reference

The most commonly used Form.io component types in this project:

| Component type | Description | Notes |
|---|---|---|
| `textfield` | Single-line text input | Use `validate.required: true` for required fields |
| `textarea` | Multi-line text input | Good for justification and comments |
| `email` | Email address input | Validates format client-side |
| `number` | Numeric input | Use `validate.min` / `validate.max` for range limits |
| `select` | Dropdown | Values defined in `data.values` array |
| `radio` | Radio button group | Values defined in `values` array |
| `checkbox` | Single checkbox | Returns boolean |
| `datetime` | Date/time picker | Returns ISO string |
| `signature` | Signature pad | Returns base64 image — do not encrypt (too large) |
| `panel` | Grouping container | Has `title` and `components` array |
| `columns` | Multi-column layout | Use `columns` array with `width` percentages |
| `htmlelement` | Static HTML display | Use for instructions or section headings |
| `survey` | Grid of questions | Multiple rows, shared set of columns |

---

## Publishing Checklist

Before publishing a form for production use:

- [ ] All required fields have `validate.required: true`
- [ ] Fields containing personal data are marked `encrypted: true` in custom properties (if warranted)
- [ ] Sensitivity level matches the most sensitive data the form can collect
- [ ] A workflow is attached (forms cannot be submitted without a workflow)
- [ ] The workflow has been published-validated (happens automatically on form publish)
- [ ] Both German and English labels are correct (check the translations JSON)
- [ ] The form has been test-submitted in a staging environment
- [ ] The legal/privacy page mentions this form's data processing (update `legal-copy.ts`)
