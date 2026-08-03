# FormFlow-Architektur

Dieses Dokument beschreibt den Repository-Stand ab Codecommit `6af84e3`, rebasiert auf Remote-Commit `6b1759b`, einschließlich der anschließenden Dokumentationsübergabe. FormFlow ist eine Next.js-16-App-Router-Anwendung mit PostgreSQL und einem separaten Temporal-Worker.

## Laufzeitübersicht

```text
Browser
  |
  | HTTPS, NextAuth-Cookie, CSRF-Token bei Änderungen
  v
Next.js-Webprozess (:3000)
  |-- serverseitig gerenderte Seiten unter /de und /en
  |-- JSON-API unter /api
  |-- PostgreSQL über Prisma
  |-- Temporal-Client (:7233)
  |-- LDAP für Anmeldung und Verzeichnissync (optional)
  |-- DeepL für Übersetzungsentwürfe (optional)
  `-- Resend für E-Mail-Zustellung (optional)

Temporal-Worker
  |-- approvalWorkflow
  |-- orgSyncWorkflow mit Zeitplan
  |-- PostgreSQL-Aktivitäten
  `-- Resend-Aktivitäten (optional)

PostgreSQL
  `-- Anwendungsdaten; lokales Compose nutzt denselben Server auch für eine eigene Temporal-DB
```

Der Basis-Compose-Stack enthält `postgres`, `temporal`, `temporal-ui`, den einmaligen Dienst `init` sowie `web` und `worker`. In Produktion sollten Anwendungs- und Temporal-Datenbank getrennt werden.

## Quellstruktur

| Pfad | Aufgabe |
|---|---|
| `src/app/[lang]` | Kanonische deutsche/englische Seiten |
| `src/app/admin`, `src/app/submissions` usw. | Gemeinsame Seitenimplementierungen und ältere nicht lokalisierte Routenmodule |
| `src/app/api` | Route Handler |
| `src/components` | Form.io-Adapter, Einreichungsansichten, Navigation, UI-Bausteine |
| `src/domain` | Workflow-, Rollen-, Einreichungs- und Organisationstypen |
| `src/lib` | Anmeldung, Rechte, Validierung, Verschlüsselung, i18n, Audit, Datenzugriff |
| `src/temporal` | Worker, Workflows und Aktivitäten |
| `src/jobs` | LDAP-/Entwicklungsadapter und Organisationsabgleich |
| `prisma` | Schema, Migrationen, Seed |
| `tests` | Vitest-Integrations- und Playwright-End-to-End-Tests |

Die Middleware liegt derzeit in `src/middleware.ts`. Sie leitet nicht lokalisierte Seiten nach Deutsch um, setzt den Locale-Request-Header und ergänzt Sicherheitsheader. Next.js 16 baut diese Datei noch, warnt aber vor der veralteten Konvention und empfiehlt `proxy.ts`.

## Anmeldung und Autorisierung

NextAuth verwendet einen Credentials-Provider:

- Mit konfigurierten `LDAP_URLS` und `LDAP_BASE_DNS` werden Zugangsdaten gegen LDAP geprüft und der Datenbankbenutzer aktualisiert.
- Andernfalls werden lokale bcrypt-Passwörter verwendet.
- JWT-Sitzungen gelten maximal acht Stunden. Bei Sitzungsverarbeitung werden effektive Rollen aus PostgreSQL neu geladen und `sessionVersion` geprüft. Administrative Rollenänderungen erhöhen diese Version aktuell nicht; sie ändern die Autorisierung ohne gezielten Sitzungswiderruf. Deaktivierung und explizite Versionsänderungen widerrufen weiterhin.
- Anmelde-Drosselung liegt in `LoginRateLimitBucket`, Kontosperren auf `User`.

Seiten verwenden `requirePageUser`/`requirePageRole`, APIs `requireUser`/`requireRole`. Für Einreichungen gelten zusätzliche Datensatzregeln für Eigentümer, zugewiesene Prüfende, optionalen Teamzugriff, Administration und Compliance. Formulare können zusätzlich über erlaubte Rollen eingeschränkt werden.

Ändernde APIs verlangen Sitzung, `x-formflow-intent: mutation`, CSRF-Cookie und -Header sowie passende `Origin`- und `Referer`-Origins. `GET /api/csrf` ist selbst öffentlich und setzt das CSRF-Cookie.

## Formulare und Einreichungen

`Form` enthält deutschen Ausgangstitel und -schema, optionale Lokalisierungen, Sensitivität, erlaubte Rollen, Workflow und Elternformular. `FormVersion`-Snapshots entstehen bei der Anlage sowie bei Titel-/Schema-/Übersetzungsänderungen an veröffentlichten Formularen.

Akzeptiert wird nur eine gehärtete Form.io-Teilmenge. Ausführbare Schemafunktionen, entfernte Select-Quellen, unsichere HTML-Muster, unbekannte Custom Properties, doppelte/unsichere Keys, nicht erlaubte Komponenten und Schemas ohne Submit-Button werden abgewiesen.

Einreichungen speichern:

- Locale und Schema-Snapshot;
- Workflow-ID, -Version und -Definition als Snapshot;
- verschlüsselte Antworten für Felder mit `properties.sensitive: "true"`;
- Status sowie Eltern-/Kindbeziehungen;
- optionale Aufbewahrungs- und Löschmarker.

Die AES-256-GCM-Hülle enthält hexadezimale Felder `iv`, `tag`, `value` und `keyId`. Die Lesefilterung berücksichtigt getrennt `properties.readRoles` und `properties.ownerCanRead`.

## Workflow-Ausführung

Beim Absenden startet Temporal den Workflow-Typ `approvalWorkflow` in der Task Queue `formflow-approval`; die Einreichungs-ID ist zugleich die Temporal-Workflow-ID. Unterstützte Stufen:

- `approval`: Empfänger auflösen, parallele Aufgaben erzeugen, erste gültige Entscheidung abwarten, Rest abbrechen;
- `notification`: Empfänger benachrichtigen und fortfahren;
- `condition`: alle `expr-eval`-Ausdrücke prüfen; bei wahr fortfahren, bei falsch `onReject` verwenden;
- `trigger-form`: Entwurf einer Kind-Einreichung erzeugen und ursprüngliche Person benachrichtigen.

Freigabestufen unterstützen Erinnerungen, Überfälligkeit, Vertretung bei Überfälligkeit, Überarbeitung/Wiedereinreichung, Abschluss und `goTo`-Routing bei Ablehnung. Definition und Referenzen werden beim Speichern und bei der Formularzuordnung validiert.

Erfolgreiche und abgelehnte Endpfade speichern derzeit beide den Einreichungsstatus `closed`; das unterschiedliche Ergebnis bleibt in Taskstatus und Ergebnisnachricht erhalten. Vor Reporting auf Basis des Einreichungsstatus muss dies als Produkt-/Datenmodellentscheidung geklärt werden.

Wegen Aktivitätswiederholungen sind externe Seiteneffekte besonders wichtig. Einige Aktivitäten legen Datenbankzeilen und Benachrichtigungen ohne explizite Idempotenzschlüssel an; dies ist im Übergabe-Audit als Härtungspunkt erfasst.

## Organisationssync

Der Worker legt den wiederkehrenden Temporal-Zeitplan `org-sync-scheduled` an. Administration kann über `POST /api/org/sync` synchron und manuell abgleichen.

Der LDAP-Adapter bildet Abteilungen aus `ou`-Werten und leitet Leitungsrollen aus LDAP-`manager`-DNs ab. Der Abgleich aktualisiert Benutzer, Einheiten und Mitgliedschaften, entfernt veraltete Beziehungen und deaktiviert bei nicht leerem Quellergebnis fehlende Datenbankbenutzer.

Ohne LDAP verwendet der Code derzeit `devOrgAdapter`. Dieser ist kein No-op, sondern liefert zwei Beispielbenutzer und eine Abteilung. Da der Abgleich andere Benutzer deaktivieren kann, muss dieser Pfad vor dem Betrieb geändert werden.

## Audit und Datenschutzkontrollen

`AuditLog` protokolliert Anmeldeereignisse, API-Zugriffe, Sensitive-Access-Freigaben, ausgewählte Formular-/Workflow-/Benutzer-/Rollen-/Vertretungsänderungen und Freigabesignale. Sensible Einreichungen erfordern eine signierte Freigabe für zehn Minuten; PII-/Sensitive-Filter der globalen Liste verwenden die Freigabe `admin-submissions`.

Das Auditprotokoll ist eine normale Anwendungstabelle und kein manipulationsgeschützter externer Speicher. Nicht jeder Task-/Statusübergang aus Temporal-Aktivitäten wird protokolliert. Das aktuelle Protokoll darf deshalb nicht als vollständig oder unveränderlich bezeichnet werden.

Aufbewahrungsspalten existieren, werden aber nicht aus Formularrichtlinien berechnet. Das Operatorskript verarbeitet nur manuell gesetzte Marker.

## Internationalisierung

Die Anwendungsoberfläche ist typisiert in `src/lib/i18n/dictionaries.ts`. Deutsch ist Standard-Locale. Formulare speichern Deutsch als Basis sowie optionale Objekte mit `title`, vollständigem `schema`, `reviewStatus` und `generatedAt`. DeepL kann einen englischen Entwurf erzeugen, der fachlich geprüft werden muss.

Einige gemeinsame/ältere Seiten und von Temporal erzeugte Benachrichtigungen enthalten noch fest codierte englische Texte. Vollständige Sprachparität besteht daher noch nicht.

## Bekannte Architekturschulden

Prioritäten stehen im [Übergabe-Audit](../../handoff/HANDOFF_AUDIT.de.md): getrenntes Produktiv-Bootstrap, sicherer Organisationssync, Abhängigkeitsupdates, verlässliche Aufbewahrungs-/Auditprozesse, idempotente Aktivitäten, getesteter Schlüsselzyklus, Konsolidierung von Routen/i18n und Produktionsobservability.
