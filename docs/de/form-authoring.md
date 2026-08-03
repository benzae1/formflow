# Leitfaden zur Formularerstellung

FormFlow verwendet eine gehärtete Teilmenge von Form.io. Administration legt Metadaten unter `/<locale>/admin/forms` an und bearbeitet das Schema unter `/<locale>/admin/forms/<id>/builder`. Die Oberfläche unterstützt grundlegenden JSON-Import/-Export; ein Formular-Delete-Endpunkt fehlt weiterhin.

## Ablauf

1. Entwurf mit eindeutigem kleingeschriebenem Slug anlegen.
2. Deutsches Basisformular im Builder gestalten.
3. Formularsensitivität und erlaubte Rollen setzen.
4. Verschlüsselungs-/Leseregeln pro Feld setzen.
5. Validierten Workflow zuordnen.
6. Falls erforderlich englische Übersetzung erzeugen/prüfen.
7. Vorschau in beiden Sprachen und mit allen relevanten Rollen testen.
8. Veröffentlichen.

Veröffentlichte URLs sind `/de/forms/<slug>` und `/en/forms/<slug>`. `/forms/<slug>` wird von der aktuellen Middleware nach Deutsch umgeleitet.

## JSON-Import und -Export

Die Formularliste kann aus einem hochgeladenen Objekt der Form `{ "title", "slug", "schema" }` ein Formular anlegen. Im Builder lässt sich das Schema der gerade bearbeiteten Sprache aus demselben Format ersetzen; der Export enthält deutschen/Basistitel, Slug und Basisschema.

Dies ist ein Schemaaustausch, kein vollständiges Backup- oder Deploymentformat. Übersetzungen, Sensitivität, Workflow-/Elternbezüge, erlaubte Rollen, Governance-Metadaten außerhalb des Schemas, Versionen, Ownership, Retention und Freigaben fehlen. Der Browser prüft zunächst nur `schema.components`; die verbindliche gehärtete Schemavalidierung erfolgt beim normalen Create-/Update-API-Aufruf. Importierte Formulare müssen vor Veröffentlichung geprüft, konfiguriert, gespeichert und getestet werden. Steuerelemente und Meldungen für Import/Export sind auch auf deutschen Seiten derzeit fest englisch.

## Formularzugriff und Sensitivität

Leere erlaubte Rollen bedeuten Zugriff für alle Angemeldeten. Bei nicht leerer Liste muss mindestens eine Rolle passen; Admins umgehen dieses Formulargate. Verliert eine Person den Zugriff nach Anlage eines Entwurfs/einer Überarbeitung, kann sie diesen auch nicht mehr absenden.

| Wert | Aktuelles Verhalten |
|---|---|
| `standard` | Standardmäßig in globalen Admin-/Compliance-Listen |
| `pii` | Aus Standardliste verborgen; Listengrant nötig |
| `sensitive` | Gleiches Listengate plus Einzelgrant für Detailansicht |

Für Eigentümer und zugewiesene Prüfende gelten Datensatzsichtbarkeit und zusätzlich Feldleseregeln. Einstufung nach dem sensibelsten möglichen Inhalt und institutioneller Vorgabe.

## Unterstützte Komponenten

Die Server-Allowlist akzeptiert:

`button`, `checkbox`, `columns`, `container`, `content`, `datagrid`, `day`, `editgrid`, `email`, `fieldset`, `number`, `panel`, `phoneNumber`, `radio`, `select`, `selectboxes`, `table`, `textarea`, `textfield`, `well`.

Nicht auf allgemeine Form.io-Komponenten verlassen, die hier fehlen, etwa Datei-Upload, Signatur, Datetime, Survey, Wizard/PDF. Das Schema muss `display: "form"` und einen Submit-Button enthalten.

Zusätzliche Regeln:

- eindeutige Keys, beginnend mit Buchstabe, danach nur Buchstaben/Ziffern/Unterstriche;
- lokale Select-Quellen `values`/`json`;
- keine inhaltlichen Werte für `calculateValue`, `customConditional`, `customDefaultValue`, `customValidation`, `logic`;
- keine Script-Tags, Inline-Eventhandler oder `javascript:` in Content-HTML;
- nur unterstützte Custom Properties.

## Feldsicherheit

Das Panel **Feldzugriffseinstellungen** schreibt String-Properties:

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

- `sensitive: "true"` verschlüsselt rekursiv, auch verschachtelt in unterstützten Containern/Grids.
- `readRoles` listet kommagetrennte Rollen mit Leserecht; leer bedeutet Leserecht für alle.
- `ownerCanRead` ist standardmäßig wahr und lässt Eigentümer eine nicht leere Rollenliste umgehen. Zusammen mit restriktiven `readRoles` auf `"false"` setzen, um den Wert vor einem Eigentümer ohne passende Rolle zu verbergen.

Die ältere Property `encrypted` wird nicht unterstützt. Feldverschlüsselung und Formularsensitivität sind getrennt: Erstere schützt ausgewählte DB-Werte, Letztere den Datensatzzugriff.

Aktuelle AES-256-GCM-Hülle:

```json
{
  "__encrypted": true,
  "keyId": "default",
  "iv": "hex",
  "tag": "hex",
  "value": "hex"
}
```

Verschlüsselte Felder erst produktiv nutzen, wenn Schlüsselablage, Backup, Recovery und Rotation getestet sind.

## Validierung und Antwortdaten

Form.io-Clientvalidierung verbessert die UX, zusätzlich normalisiert die API nach gespeichertem lokalisiertem Schema. Unbekannte Felder und unpassende Formen/Typen werden abgewiesen, Buttonstatus verworfen. Pflicht-, Datums-, Bereichs- und Wertregeln gelten für unterstützte Typen.

Verschachtelte Container, Data Grids, Select Boxes, numerische/boolesche Optionen, optionale Leerwerte und beide Sprachen testen. Der gespeicherte Schema-Snapshot ist für historische Darstellung und Feldzugriff maßgeblich.

## Deutsch/Englisch

Deutsch liegt in `Form.title` und `Form.schema`. Englisch ist ein vollständiges Objekt:

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

Mit `DEEPL_API_KEY` erzeugt der Builder einen englischen Entwurf und setzt `needs_review`. Labels, Hinweise, Auswahlwerte, Validierung, Fachbegriffe, Barrierefreiheit und Layout müssen manuell geprüft werden. Fehlt Englisch, wird Deutsch verwendet.

## Versionen und Snapshots

Bei Anlage entsteht `FormVersion` 1. Bei einem bereits veröffentlichten Formular erhöhen Titel-/Schema-/Übersetzungsänderungen die Version und erzeugen einen Snapshot. Reines Veröffentlichen eines unveränderten Entwurfs erzeugt nicht automatisch eine weitere Version.

Einreichungen speichern lokalisiertes Schema, Formversion, Locale und Workflowdefinition/-version. Beim späteren Absenden eines Entwurfs wird der Snapshot aus dem dann aktuellen Formular/Workflow aktualisiert. Historische Ansichten bevorzugen den Einreichungssnapshot.

Eine UI zum Vergleichen/Wiederherstellen von `FormVersion` fehlt noch.

## Eltern- und Folgeformulare

Formulare können `parentFormId` speichern; Workflows können `trigger-form` mit `childFormId` verwenden. Letzteres erzeugt einen leeren, mit der Elterneinreichung verknüpften Kindentwurf und benachrichtigt die ursprüngliche Person. Der Kindworkflow startet nicht automatisch.

Der Server prüft derzeit nur die Existenz des Kindformulars, nicht Veröffentlichung oder Zugriff der Person. Den vollständigen Folgeprozess testen.

## Veröffentlichungscheckliste

- [ ] Sensitivität und Verarbeitungszweck bestätigt
- [ ] Erlaubte Rollen minimal und getestet
- [ ] Nur unterstützte Komponenten; stabile eindeutige Feldkeys
- [ ] Client-/Servervalidierung mit Grenz-/Fehlerwerten getestet
- [ ] Sensitive-/Leserollen-/Eigentümerregeln je Feld geprüft
- [ ] Schlüssel und Recovery nachgewiesen
- [ ] Ausführbarer Workflow mit aktiven/auflösbaren Zielen
- [ ] Deutsche/englische Inhalte fachlich freigegeben
- [ ] Eigentümer-, Approver-, Admin-, Compliance- und unbefugte Abläufe getestet
- [ ] Aufbewahrungs- und DSAR-Verantwortung außerhalb der aktuellen UI festgelegt
- [ ] Barrierefreiheits- und Datenschutzprüfung abgeschlossen
