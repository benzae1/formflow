# FormFlow — Form Library

This directory contains Form.io form definition files. These are **not** loaded automatically — they serve as importable templates and reference examples. To use a form, import it through the admin UI.

## Available Forms

### `emailantrag.json` — E-Mail-Antrag (Email Account Request)

A form for requesting a university email account at Bauhaus-Universität Weimar.

| Property | Value |
|---|---|
| Slug | `emailantrag` |
| Language | German |
| Sensitivity | `standard` |
| URL | `/forms/emailantrag` |

**Sections:**

1. **Persönliche Angaben** — Personal details: first name, last name, student ID (encrypted), existing email address, and degree programme
2. **Antrag** — The request itself: request type, justification, and a confirmation checkbox
3. **Unterschrift** — Signature panel: place, date, and signature pad

**Notable features:**
- Student ID (`matrikelnummer`) is marked `encrypted: true` — encrypted at rest with AES-256-GCM
- Select fields for request type and degree programme with predefined options
- Required field validation on all essential fields
- Signature pad component for handwritten confirmation

---

## Adding a New Form

### Option 1: Via the admin UI

1. Sign in as an admin
2. Navigate to `/de/admin/forms` → **New form**
3. Fill in the title, slug, and sensitivity level
4. Use the drag-and-drop form builder
5. Attach a workflow
6. Click **Publish**

### Option 2: Store a JSON file here for manual reference

Place a Form.io schema file in this directory as a reference or template. The seed script does not read this directory; to use a form definition you need to recreate it through the admin UI form builder.

---

## Form Schema Format

FormFlow uses Form.io schemas. The minimum required fields are:

```json
{
  "title": "Form title",
  "slug": "url-slug",
  "components": [ /* Form.io components */ ]
}
```

Optional top-level fields:

| Field | Type | Description |
|---|---|---|
| `sensitivity` | `standard \| pii \| sensitive` | Data sensitivity level (default: `standard`) |
| `translations` | `{ [locale]: { [fieldKey]: { label: string } } }` | Translated field labels |

See [docs/form-authoring.md](../docs/form-authoring.md) for full documentation on form authoring, sensitive field encryption, and translations.
