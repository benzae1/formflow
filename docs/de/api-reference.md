# FormFlow-API-Referenz

Alle Anwendungsendpunkte liegen unter `/api`. JSON-Fehler haben die Form `{ "code": "...", "message": "..." }`. NextAuth verwaltet `/api/auth/*` mit eigenen Antwortkonventionen.

## Anmeldung und Mutationsvertrag

Außer `GET /api/health`, `GET /api/csrf` und NextAuth-Endpunkten benötigen Routen eine gültige Sitzung.

Jeder Anwendungsrequest mit `POST`, `PUT`, `PATCH` oder `DELETE` benötigt:

```text
x-formflow-intent: mutation
x-csrf-token: <Wert aus GET /api/csrf>
Origin: <erlaubte App-Origin>
Referer: <URL auf erlaubter App-Origin>
Cookie: formflow-csrf=<gleiches Token>; <NextAuth-Sitzungscookie>
```

Im Webclient `getMutationHeaders()` verwenden. `GET /api/csrf` ist öffentlich und setzt das CSRF-Cookie.

## Routenübersicht

| Methode und Pfad | Zugriff | Verhalten |
|---|---|---|
| `GET /api/health` | Öffentlich | Prüft PostgreSQL und Temporal; 200/503 |
| `GET /api/csrf` | Öffentlich | Erstellt CSRF-Cookie/-Token |
| `GET /api/forms` | Admin | Alle Formulare mit Workflow/Rollen |
| `POST /api/forms` | Admin | Entwurf und Version-1-Snapshot anlegen |
| `GET /api/forms/:id` | Admin | Formular, Workflow, Rollen, Versionen |
| `PUT /api/forms/:id` | Admin | Metadaten/Schema/Status/Zugriff ändern |
| `POST /api/forms/:id/translate-draft` | Admin | Englischen DeepL-Entwurf speichern |
| `GET /api/workflows` | Admin | Workflows listen |
| `POST /api/workflows` | Admin | Validierten Workflow anlegen |
| `GET /api/workflows/:id` | Admin | Workflow und zugeordnete Formulare |
| `PUT /api/workflows/:id` | Admin | Name/Definition ersetzen, Version erhöhen |
| `GET /api/roles` | Admin | System- und Custom-Rollen listen |
| `POST /api/roles` | Admin | Custom-Rolle anlegen |
| `PUT /api/roles/:id` | Admin | Umbenennen/Label ändern, wenn sicher |
| `DELETE /api/roles/:id` | Admin | Nicht referenzierte Custom-Rolle löschen |
| `PATCH /api/users/:id/roles` | Admin | Rollen/Teamzugriff ersetzen; Sitzungen widerrufen |
| `GET /api/submissions` | Angemeldet | Sichtbare Einreichungen listen |
| `POST /api/submissions` | Angemeldet + Formularzugriff | Entwurf speichern oder sofort absenden |
| `GET /api/submissions/:id` | Sichtbare Person | Gefilterte/entschlüsselte Details; ggf. Sensitive Grant |
| `PATCH /api/submissions/:id` | Eigentümer | Entwurf/Überarbeitung speichern oder absenden |
| `POST /api/submissions/:id/approve` | Zugewiesene Person | Freigabe signalisieren |
| `POST /api/submissions/:id/reject` | Zugewiesene Person | Ablehnung signalisieren |
| `POST /api/submissions/:id/revise` | Zugewiesene Person | Überarbeitung signalisieren |
| `POST /api/sensitive-access` | Angemeldet | Signierte Zehn-Minuten-Freigabe |
| `POST /api/delegations` | Admin/Approver | Vertretungszeitraum anlegen |
| `DELETE /api/delegations/:id` | Admin/eigener Approver | Vertretung löschen |
| `GET /api/notifications/unread` | Angemeldet | Ungelesene Anzahl und zehn neueste |
| `POST /api/notifications/:id/read` | Eigentümer | Eigene Nachricht gelesen markieren |
| `GET /api/audit-log` | Admin/Compliance | Cursor-Seite oder CSV |
| `POST /api/org/sync` | Admin | Organisationsabgleich synchron ausführen |

Es gibt keine Delete-Endpunkte für Formulare/Workflows, keinen allgemeinen REST-Endpunkt zum Listen/Anlegen/Deaktivieren von Benutzern, keinen Delegations-List-Endpunkt und keine Published-Forms-API für Nicht-Admins.

## Formulare

### Anlage/Änderung

```json
{
  "slug": "travel-request",
  "title": "Reiseantrag",
  "schema": {
    "display": "form",
    "components": [{ "type": "button", "key": "submit", "action": "submit", "label": "Absenden" }]
  },
  "translations": null,
  "sensitivity": "standard",
  "workflowId": null,
  "parentFormId": null,
  "allowedRoleNames": ["submitter"],
  "status": "published"
}
```

`status` ist nur beim Update erlaubt. Bei Anlage sind `slug`, `title`, `schema` erforderlich. Leere `allowedRoleNames` erlauben allen angemeldeten Rollen die Nutzung; Admins haben immer Zugriff. Veröffentlichte Formulare brauchen einen ausführbaren Workflow. Rollen-/Benutzer-/Gruppen-/Org-Ziele, Kindformulare und `goTo`-Stufen werden validiert. Der Code prüft die Existenz eines Kindformulars, aber entgegen älterer Doku nicht dessen Veröffentlichungsstatus.

Änderungen an Titel, Schema oder Übersetzungen eines bereits veröffentlichten Formulars erhöhen `version` und erzeugen einen Snapshot. Reine Metadatenänderungen erhöhen die Version nicht.

DeepL benötigt `DEEPL_API_KEY` und speichert den deutschen Ausgangsstand unter `translations.en` mit `reviewStatus: "needs_review"`.

## Workflows

```json
{
  "name": "Department approval",
  "definition": [
    {
      "id": "review",
      "name": "Review",
      "type": "approval",
      "assignTo": { "type": "role", "value": "approver" },
      "onApprove": "close",
      "onReject": "return-to-submitter"
    }
  ]
}
```

Das vollständige Schema steht im Workflow-Leitfaden. `PUT` ersetzt Name und Definition vollständig und ist kein Partial Update.

## Rollen und Benutzer

Custom-Rollennamen sind kleingeschriebene Slugs. `admin`, `approver`, `compliance`, `submitter` können nicht umbenannt/gelöscht werden. Custom-Rollen sind geschützt, solange Benutzer, Feldleseregeln, Workflows oder relevante offene Pool-Aufgaben darauf verweisen.

```json
{ "roles": ["approver", "submitter"], "teamScope": false }
```

Der Request ersetzt die komplette Rollenmenge und erhöht `sessionVersion`, auch bei Selbständerung eines Admins. Die Antwort kann noch eintreffen, die aktuelle Sitzung ist bei der nächsten Prüfung widerrufen.

## Einreichungen

### Liste

Optionale Queryparameter: `status`, `formId`, `sensitivity`, `includeSensitive=true`. Diese Strings sind vor dem Prisma-Cast nicht vollständig schema-validiert; nur gültige Enums/UUIDs verwenden.

- Eigentümer sehen eigene Datensätze.
- Approver zusätzlich zugewiesene Aufgaben; `teamScope` ergänzt dieselben Organisationseinheiten.
- Admin/Compliance sehen standardmäßig nur `standard`.
- Admin/Compliance benötigen bei PII-/Sensitive-Filtern oder `includeSensitive=true` eine `admin-submissions`-Freigabe.

Jeder Listenaufruf erzeugt einen Auditdatensatz. Felddaten werden nach Schema-Leseregeln gefiltert.

### Anlage

```json
{
  "formId": "uuid",
  "data": { "field": "value" },
  "saveAsDraft": false,
  "parentSubmissionId": null
}
```

Das Formular muss veröffentlicht und für die Rollen erlaubt sein. Unbekannte Felder/Typen werden gemäß lokalisiertem Schema abgewiesen, sensible Felder verschlüsselt. Standardmäßig startet `saveAsDraft: false` sofort Temporal. Mit `true` bleibt der Status `draft` und ein Workflow ist nicht erforderlich.

### Lesen/Ändern

Detailzugriff folgt den Sichtbarkeitsregeln. Nur Sensitivität `sensitive` verlangt `submission:<id>`. `pii` verlangt aktuell keine Einzelgrant. Zugriff wird auditiert; Daten werden entschlüsselt und für die Person gefiltert.

```json
{ "data": { "field": "new value" }, "submit": true }
```

Nur `draft` und `needs_revision` sind editierbar. `submit` startet beim Entwurf den gesnapshotteten Workflow oder signalisiert `resubmitted`. Speichern ohne `submit: true` setzt den Workflow nicht fort.

### Entscheidungen

```json
{ "taskId": "uuid", "note": "Optionale Notiz" }
```

Die Person muss exakt diese offene Aufgabe besitzen; `admin` oder `approver` allein reicht nicht. Der Endpunkt protokolliert das Signal und antwortet, bevor der Worker Task-/Statusänderung zwingend angewendet hat.

## Sensitive-Access-Freigabe

```json
{
  "scope": "submission:uuid",
  "reason": "Fallprüfung Referenz 1234"
}
```

Scopes: `submission:<id>` oder `admin-submissions`. Begründung mindestens zehn Zeichen. Erfolg setzt für zehn Minuten das HttpOnly-/SameSite=Lax-Cookie `formflow-sensitive-access` und auditiert die Freigabe. Der Cookie-Builder speichert aktuell nur die neueste Freigabe; eine neue ersetzt vorherige Scopes.

## Vertretungen

```json
{
  "delegateId": "uuid",
  "startsAt": "2026-08-10T00:00:00Z",
  "endsAt": "2026-08-20T00:00:00Z",
  "approverId": "uuid"
}
```

Nichtadministrative Approver handeln nur für sich. Beide Personen müssen aktiv und `approver` oder `admin` sein; Selbstvertretung und Überschneidung werden abgewiesen. Vertretung wird bei Taskanlage und Überfälligkeit berücksichtigt.

## Auditlog

`GET /api/audit-log` unterstützt exakt `action`, `resourceType`, `actorId`, Zeilen-ID-`cursor` und `format=csv`. Seitengröße ist 50; JSON liefert `{ logs, nextCursor }`. CSV enthält nur den aktuellen 50er-Ausschnitt und die Spalten `createdAt`, `action`, `resourceType`, `resourceId`, `actorId`.

Die früher dokumentierten Parameter `from`, `to`, `resourceId`, `page`, `pageSize` sind nicht implementiert.
