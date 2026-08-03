# Example forms

This directory contains source/reference Form.io export files. It is not read by the seed or application at runtime, but compatible files can be selected manually through the admin JSON-import UI.

## `emailantrag.json`

`emailantrag.json` is a German Form.io `display: "form"` schema for a shared-mailbox/email request. It includes substantial institution-specific content and links. Treat it as an example/reference, not automatically approved current policy text.

Before use:

1. confirm every field/component still passes `validateFormioSchema`;
2. review institutional wording, contacts, links, required fields, accessibility, and data classification;
3. import it with the admin **Import JSON** action, then confirm the server accepts the hardened schema;
4. assign allowed roles, form sensitivity, field-level `sensitive`/read settings, a workflow, owner, retention policy, and English translation;
5. test and obtain the publication approvals in the form authoring guide.

The current UI export/import envelope is `{ "title", "slug", "schema" }`; it is not a complete form backup and does not carry translations, sensitivity, workflow, roles, ownership, retention, approvals, or history. The legacy Form.io top-level/component `encrypted` booleans in exported JSON do not enable FormFlow encryption. FormFlow uses `component.properties.sensitive: "true"`.

Do not put real submission data, credentials, secrets, or production exports in this directory.
