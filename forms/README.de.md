# Beispielformulare

Dieses Verzeichnis enthält Form.io-Schemas als Quelle/Referenz. Es ist keine Importbibliothek und wird weder vom Seed noch zur Laufzeit gelesen.

## `emailantrag.json`

`emailantrag.json` ist ein deutsches Form.io-Schema (`display: "form"`) für einen Shared-Mailbox-/E-Mail-Antrag. Es enthält umfangreiche hochschulspezifische Inhalte und Links. Als Beispiel/Referenz behandeln, nicht als automatisch aktuell freigegebenen Richtlinientext.

Vor Nutzung:

1. prüfen, dass jedes Feld/jede Komponente `validateFormioSchema` besteht;
2. institutionelle Formulierungen, Kontakte, Links, Pflichtfelder, Barrierefreiheit und Datenklassifikation prüfen;
3. über einen bewusst gebauten Admin-/API-Ablauf nachbilden/importieren—die aktuelle UI hat keinen JSON-Importbutton;
4. erlaubte Rollen, Sensitivität, Feld-`sensitive`-/Leseregeln, Workflow, Owner, Retentionpolicy und Englisch setzen;
5. testen und Freigaben aus dem Formularleitfaden einholen.

Ältere Form.io-Felder `encrypted` im Export aktivieren keine FormFlow-Verschlüsselung. FormFlow verwendet `component.properties.sensitive: "true"`.

Keine realen Einreichungsdaten, Zugangsdaten, Secrets oder Produktions-Exports hier ablegen.
