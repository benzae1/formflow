# Beispielformulare

Dieses Verzeichnis enthält Form.io-Exportdateien als Quelle/Referenz. Seed und Anwendung lesen es nicht automatisch; kompatible Dateien können aber manuell über den JSON-Import der Administration ausgewählt werden.

## `emailantrag.json`

`emailantrag.json` ist ein deutsches Form.io-Schema (`display: "form"`) für einen Shared-Mailbox-/E-Mail-Antrag. Es enthält umfangreiche hochschulspezifische Inhalte und Links. Als Beispiel/Referenz behandeln, nicht als automatisch aktuell freigegebenen Richtlinientext.

Vor Nutzung:

1. prüfen, dass jedes Feld/jede Komponente `validateFormioSchema` besteht;
2. institutionelle Formulierungen, Kontakte, Links, Pflichtfelder, Barrierefreiheit und Datenklassifikation prüfen;
3. mit **Import JSON** in der Administration importieren und anschließend bestätigen, dass der Server das gehärtete Schema akzeptiert;
4. erlaubte Rollen, Sensitivität, Feld-`sensitive`-/Leseregeln, Workflow, Owner, Retentionpolicy und Englisch setzen;
5. testen und Freigaben aus dem Formularleitfaden einholen.

Das aktuelle UI-Format lautet `{ "title", "slug", "schema" }`; es ist kein vollständiges Formularbackup und enthält keine Übersetzungen, Sensitivität, Workflows, Rollen, Ownership, Retention, Freigaben oder Historie. Ältere Form.io-Felder `encrypted` im Export aktivieren keine FormFlow-Verschlüsselung. FormFlow verwendet `component.properties.sensitive: "true"`.

Keine realen Einreichungsdaten, Zugangsdaten, Secrets oder Produktions-Exports hier ablegen.
