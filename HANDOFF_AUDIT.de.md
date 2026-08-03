# FormFlow — finaler Übergabe-Audit

Auditdatum: 03.08.2026

Basis-Codecommit: `68a93b0`

Gesamturteil: **starker Prototyp/internes Beta-System; nicht produktionsreif für Hochschuldaten**

## Zusammenfassung

Das Repository hat einen schlüssigen Produktkern: zweisprachige angemeldete Seiten, Admin-Formularbuilder, gehärtete Form.io-Schemas und Servervalidierung, Entwürfe/Einreichungen, Temporal-basierte Freigabe/Überarbeitung/Ablehnung, Rollen-/Formular-/Feldzugriff, LDAP, Vertretungen, Benachrichtigungen, Verschlüsselung, Sensitive-Access-Grants und Auditkonsole. Lint, TypeScript und optimierter Next.js-Build bestehen.

Die Restarbeit ist nicht kosmetisch. Aktuelle Abhängigkeitsadvisories, unsichere Produktions-Bootstrap-/Org-Sync-Pfade, institutionelle Platzhalter, unvollständige Aufbewahrungs-/Auditprozesse und eine nicht nachgewiesene Produktionsplattform schließen einen Echt-Daten-Start ohne weitere Engineering-/Governancephase aus.

Dieser Bericht ist die maßgebliche offene Liste. Datierte Dateien unter `audits/` bleiben historische Momentaufnahmen.

## Durchgeführte Prüfung

| Prüfung | Ergebnis | Hinweis |
|---|---|---|
| Vorhandene uncommittete Arbeit gesichert | Bestanden | Nach zwei kleinen Lint-/ARIA-Korrekturen separat als `68a93b0` committed |
| ESLint (`--max-warnings=0`) | Bestanden | Lokales Binary, 03.08.2026 |
| TypeScript (`tsc --noEmit`) | Bestanden | 03.08.2026 |
| `npm run build` | Bestanden | Next.js 16.2.4, 50 Routen; Warnung zur veralteten `middleware`-Konvention |
| Produktionsabhängigkeiten | **Nicht bestanden** | `npm audit --omit=dev`: 29 Findings: 1 kritisch, 16 hoch, 11 mittel, 1 niedrig |
| Integrationssuite | Nicht erneut ausgeführt | 65 Fälle vorhanden; Docker/PostgreSQL in Übergabeumgebung nicht verfügbar |
| Browsersuite | Nicht erneut ausgeführt | 5 Laufzeitfälle vorhanden; Docker-Engine nicht verfügbar |
| CI | Geprüft | Lint, Typecheck, Build, Integration und ein `@smoke`-Browserfall |
| Accessibility/Penetrationstest | Nicht erfolgt | Benötigt Spezialprüfung und institutionellen Scope |

`test-results/.last-run.json` enthält `passed`, ist als generierter Zustand aber kein Nachweis dieses Audits. Das Nachfolgeteam muss `npm run verify:stack` sauber reproduzieren.

## P0 — vor Pilot-/Produktivdaten zwingend

### P0-1. Aktuelle Abhängigkeitsadvisories beheben

`npm audit --omit=dev` meldet 29 Produktionsfindings. Direkte Pakete:

- kritisch: `next-auth` 4.24.14;
- hoch: Next.js 16.2.4, Temporal-SDK 1.17.0, `expr-eval`;
- mittel: Form.io, Prisma, Resend, älteres `formiojs`.

Zum Auditzeitpunkt existieren Patchziele für NextAuth (4.24.15), Next.js (16.2.12), Temporal (1.21.1), Prisma (7.9.1), Resend (6.18.1) und Teile von Form.io; `expr-eval` und einzelne Form.io-/UUID-Pfade haben keinen automatischen Fix. Versionsdaten müssen aktuell neu abgefragt werden.

Maßnahme: gruppiert aktualisieren, ungenutztes `formiojs` nach Prüfung entfernen, `expr-eval` ersetzen/eingrenzen, Lockfile erneuern, komplette Suite/CSP/Builder prüfen und Restrisiken dokumentieren. SCA/Audit mit Ausnahmeprozess in CI.

Abnahme: kein nicht akzeptiertes kritisches/hohes Produktionsfinding; Security-Freigabe für Ausnahmen.

### P0-2. Produktionsbootstrap vom Demo-Seed trennen

`scripts/prisma-init.mjs` ruft immer `prisma db seed` auf. `prisma/seed.ts` verweigert Produktion ohne `ALLOW_DEMO_USERS=true`; mit Flag entstehen `admin/admin`, `approver/approver`, `submitter/submitter` und ein Demo-Workflow.

Maßnahme: getrennte Commands für Migration, unveränderliche Systemrollen und expliziten Entwicklungsseed. Produktion muss Demo-Seeding ablehnen. Compose/CI anpassen und leere Produktions-DB testen.

Abnahme: frisches produktionsnahes Deployment startet ohne bekannte Zugangsdaten und ohne manuelle DB-Eingriffe.

### P0-3. Organisationssync standardmäßig sicher machen

Der Worker legt immer einen stündlichen Schedule an. Ohne LDAP wählen Schedule und manueller Sync `devOrgAdapter`. Er liefert zwei Beispielbenutzer/eine Einheit; Reconciliation kann andere Benutzer deaktivieren. Dadurch können Admins ausgesperrt und Tasks verwaist werden.

Maßnahme: Sync nur bei explizit validierter Adapter-/Produktionskonfiguration; Entwicklungsadapter nur Tests/Demomodus; Dry Run und Mengenlimits; Bestätigung bei Massendeaktivierung; detaillierte Summen; automatische Taskeskalation/-neuzuweisung; Tests für leere/partielle/mehrere LDAP-Fehler.

Abnahme: keine Mutation ohne geprüfte Quelle, Preview, Guardrails, Auditzusammenfassung und Recovery.

### P0-4. Institutionelle/rechtliche/Datenschutz-/Barrierefreiheitsentscheidungen schließen

Impressum, Datenschutz, Barrierefreiheit und Hilfe enthalten sichtbare Platzhalter. Zweck, Aufbewahrung, DSAR/Legal Hold, Providerfreigabe, Identitätsgovernance, Support und Konformität haben keine finale institutionelle Akte.

Maßnahme: [DECISIONS_REQUIRED.de.md](DECISIONS_REQUIRED.de.md) schließen, freigegebene zweisprachige Inhalte einbauen und Nachweise kontrolliert ablegen.

Abnahme: benannte Owner und datierte Freigaben für Dienst, Inhalte, Verarbeitung, Barrierefreiheit, Support und Launchrisiko.

### P0-5. Verbindlichen Datenlebenszyklus implementieren

Retention-Spalten existieren, aber keine Formularpolicy setzt `retainUntil`/`purgeAt`; Scheduler fehlt. `retention:purge` verarbeitet nur manuell gesetzte Marker. DSAR braucht direkte DB-Arbeit. Eltern/Kind, Temporal, Backups und Auditbeweis sind nicht getestet.

Maßnahme: versionierte Formular-Retentionpolicy/Owner, automatische Datumsberechnung, Legal Hold/Einschränkung, Dry-Run-/Freigabe-/Purgejobs, Integritäts-/Temporaltests, abgesichertes Export-/Berichtigungs-/Löschtool und Backupablauf.

Abnahme: automatische Policy-Daten und erfolgreich nachgewiesene Retention-/DSAR-Generalprobe.

### P0-6. Produktionsplattform bauen und nachweisen

Produktions-Compose fehlen TLS-Proxy, Secrets, Nicht-Root-/Minimalimage, Ressourcen-/Netzkontrollen, Metriken/Alerts, Backup-/Restoreautomation, Deploymentstrategie, Runbooks. Dockerfile ist einstufig und enthält Source/Dev-Abhängigkeiten. Temporal-DB ist für laufende Workflows unverzichtbar.

Maßnahme: Zielbild aus Betriebsleitfaden umsetzen, Images scannen/signieren, Proxyheader sichern, DBs trennen, Temporal UI schützen, SLO/RPO/RTO festlegen, Workflow/Sync/E-Mail/Auth/Retention überwachen und gemeinsamen App-/Temporal-Restore samt Schlüssel testen.

Abnahme: produktionsgleiches Staging besteht Deployment, Failover, Restore, Monitoring, Rollback und On-call-Abnahme.

## P1 — hohe Priorität vor breiter Einführung

### Sicherheit und Audit

- **Schlüsselrotation korrigieren/testen.** Das Skript verarbeitet nur Top-Level, aktuelle Verschlüsselung ist verschachtelt. Rekursion, Batches, Wiederaufnahme, Prüfung, Dry Run, Concurrency, Backup, Tests ergänzen.
- **Auditabdeckung vervollständigen.** APIs protokollieren Signale, Temporal-Aktivitäten für Task-/Statusübergänge nicht durchgängig. `AuditLog` ist normale veränderbare Tabelle. Ereigniskatalog, idempotente Activityevents, gegebenenfalls manipulationsgeschützte externe Ablage und Sequenztests ergänzen.
- **Proxy-IP-Vertrauen härten.** Erster `X-Forwarded-For` wird vertraut. Trusted-Proxy-Strategie und Edge-Bereinigung einführen.
- **CSP-Ausnahmen prüfen.** Formular/Admin erlauben `unsafe-inline`/`unsafe-eval`, Admin zusätzlich CDN/Blob-Worker. Eng halten, Assets wenn möglich selbst hosten/pinnen, Security-/Browsertests.
- **Startup-Konfiguration validieren.** Produktionsvalidator für URLs, Secrets, aktiven Schlüssel, LDAP, E-Mail und verbotene Demoflags; Readiness nur mit sicheren Details.

### Workflow-Zuverlässigkeit

- **Erneute Einreichung nach Überarbeitung korrigieren und testen.** Eine zur Überarbeitung zurückgegebene Einreichung kann nach Bearbeitung und erneutem Absenden in `revision_needed` verbleiben; außerdem erscheint der Freigabetask möglicherweise nicht wieder. End-to-End reproduzieren, Status-/Signal-/Taskübergang korrigieren und mit Integrations- und Browsertests absichern.
- Idempotenzschlüssel/Constraints/Transaktionen für wiederholbare Activities mit Tasks, Nachrichten, Kindfällen.
- Reparatur-/Replay-/Versionierungsprozess und Upgrade-Tests für laufende Temporal-Historien.
- Adminwerkzeuge für fehlgeschlagene/hängende Workflows, Taskneuzuweisung, Abbruch, Retry, DB-/Temporal-Abgleich.
- Entscheiden, ob Mehrfachziele „erste Entscheidung gewinnt“ bleiben oder Einstimmigkeit/Quorum brauchen.
- Vertretung zum fachlich gewünschten Zeitpunkt anwenden; derzeit erst bei Überfälligkeit.
- SLA-Erinnerungsreihenfolge validieren und Überfälligkeit/Eskalation klären.
- Folgeformulare auf Veröffentlichung/Zugriff prüfen und optional auf Kindprozess warten/ihn starten.
- Verwendung von `SubmissionStatus.closed` festlegen; Workflow setzt ihn nie.

### Identität und LDAP

- LDAP-Failover des Org-Sync robust machen.
- Reale Annahmen (`ou`, `manager`, Slug, flaches Departmentmodell) gegen Hochschulverzeichnis testen.
- Unmapped LDAP-Attributwerte nicht unbeabsichtigt als Rollen anlegen.
- Vorrang von Adminrollen vs. LDAP-Ersetzung definieren.
- Aktivierung/Deaktivierung, Notfalladmin-Passwortrotation, Lockoutreset und Taskneuzuweisung mit Audit ergänzen.

### Tests und Qualitätsgates

- Alle fünf Browserfälle in CI; zusätzlich unterstützte Browser.
- Browserfälle für Sensitive Access, Feldredaktion, Vertretung/Timeout, Sync-Guardrails, Custom-Rollen, Folgeformulare, E-Mail-aus, Workflow-Recovery.
- Automatisierte Accessibility plus manuelle Tastatur-/Screenreader-/BITV-/WCAG-Prüfung von Builder und Renderer.
- Retention-, Rotation-, Backup-/Restore- und Produktionsbootstraptests.
- Coverage sowie Performance-/Last-/Soaktests für erwartete Population, große Formulare, parallele Freigaben und lange Historien.
- CI mit SCA, Container-/Secret-/Migrationsscan, SBOM/Lizenzprüfung.

### Produkt und Betrieb

- E-Mail-Zustellstatus, Retry/Dead Letter, Bounce-/Status-UI. Aktuell werden Fehler geloggt und geschluckt.
- Versionen vergleichen/wiederherstellen, duplizieren, Export/Import, sichere Archiv-/Löschgovernance.
- Formularowner, Bereich, Retentionpolicy, Publikationsfreigabe, letzte Prüfung, Kontaktmetadaten.
- Suche/Paginierung für Benutzer, Formulare, Einreichungen, Nachrichten, Audit. Audit-CSV exportiert nur aktuelle 50 Zeilen.
- Warnung/UX für Selbstrollenänderung und sicheren Identitätslebenszyklus.
- Temporal-Nachrichten und restliche fest codierte Texte lokalisieren; deutsche Platzhalterdiakritik korrigieren.
- Supportdiagnostik ohne Offenlegung sensibler Daten.

## P2 — Wartbarkeit und Zukunft

- `middleware.ts` auf Next-16-`proxy.ts` migrieren und Locale/Security prüfen.
- Doppelte lokalisierte/nicht lokalisierte Routen konsolidieren; Inlinecopy in i18n.
- Große Clientkomponenten in testbare Domain-/UI-Module teilen.
- `test-results/.last-run.json` aus Git entfernen und Playwrightartefakte vollständig ignorieren.
- Ungenutzte Pakete/Assets entfernen, Form.io-Versionen angleichen.
- Architecture Decision Records für Form.io, Temporal, LDAP, Verschlüsselung, Audit, i18n.
- OpenAPI/Contracttests gegen manuelle Dokuabweichung.
- DB-Constraints/Indizes für Last und Archivierung prüfen.
- Feature Flags/stufenweise Einführung; Analytics nur nach Datenschutzfreigabe.

## Empfohlene Reihenfolge

### Phase 0 — Eindämmung

Produktivstart stoppen; Abhängigkeiten patchen; Demo/Bootstrap trennen; unsicheren Sync deaktivieren; geteilte Entwicklungssecrets rotieren; Ownership herstellen.

### Phase 1 — Produktionsfundament

Infrastruktur, Konfigvalidator, Backup/Restore/Schlüssel, sicheren LDAP-Sync, Lifecycleautomation, vollständige Auditereignisse, Workflowreparatur/Adminwerkzeuge und CI-/Securitygates umsetzen.

### Phase 2 — kontrollierter Pilot

Risikoarmes Formular und kleine benannte Gruppe in produktionsnahem Staging/Pilot. Accessibility, Datenschutz, Security, Last, Failover, DSAR, Retention und Restore vollständig üben. Supportlast und Fehlerrate messen.

### Phase 3 — allgemeine Verfügbarkeit

Erst nach Pilotabnahme/institutioneller Freigabe: Formulare governancebasiert onboarden, Zugriff/Retention regelmäßig prüfen, SLOs überwachen, kontinuierlich patchen und Recovery/Incidents üben.

## Definition eines tragfähigen Hochschulwerkzeugs

FormFlow ist tragfähig, wenn es nicht nur Funktionen hat, sondern verantwortlich betrieben, geregelt, unterstützt, wiederhergestellt, barrierefrei, sicher und prüfbar ist:

- keine nicht akzeptierten kritischen/hohen Risiken;
- sicherer Identitätslebenszyklus und Least Privilege;
- pro Formular Owner, Zweck, Zielgruppe, Barrierefreiheit und Retention freigegeben;
- korrekte und getestete Workflows samt Fehler-/Recoverypfaden;
- policybasierte Retention/DSAR/Legal Hold;
- nachvollziehbare und falls erforderlich manipulationsgeschützte Auditnachweise;
- überwachte Plattform mit bewiesenem Restore und Schlüssel-Recovery;
- vollständige Zweisprachigkeit aller Nutzerabläufe;
- dokumentierter Support/On-call/Incidentprozess und nachhaltige Maintainerkapazität.

## Erster Tag des Nachfolgeteams

1. Audit, Architektur-/Betriebsleitfaden und Entscheidungsregister lesen.
2. Geschützten Branch anlegen und `npm ci`, Lint, Typecheck, Build, `npm audit --omit=dev`, `npm run verify:stack` sauber reproduzieren.
3. Alle Umgebungen, Secrets, Datenbanken, Temporal-Namespaces, LDAP-Konten, DNS, E-Mail-/DeepL-Konten und Backups außerhalb des Repositorys inventarisieren.
4. Deployments/Schedules mit Entwicklungsfallback deaktivieren.
5. P0-Owner benennen und keine Produktionsformulare vor belegter Abnahme zulassen.
