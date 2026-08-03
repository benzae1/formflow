# FormFlow-Datenschutzbetrieb — vorläufiges manuelles Runbook

Status: nur Übergangslösung, aktualisiert am 03.08.2026. Dies ist eine Engineering-Übergabehilfe, keine freigegebene institutionelle Richtlinie. Vor Produktion muss sie von Datenschutz und Records Management ersetzt oder genehmigt werden.

## Aktuelle Datenklassen

- `User`, `Role`, `OrgUnit`, `OrgMembership`, `Delegation`: Identität, Rechte, Organisationsrouting.
- `Form`, `FormVersion`, `Workflow`: Formular-/Prozessdefinitionen und Snapshots.
- `Submission`: Antworten, einreichende Person, Locale, Snapshots, Status, Eltern/Kind.
- `ApprovalTask`: Zuweisung, Stufe, Entscheidung, Notiz, Fristen/Zeitpunkte.
- `Notification`: In-App-Inhalt und E-Mail-Trigger.
- `AuditLog`: Anmeldung, Zugriffsbegründung und ausgewählte Mutations-/Signalereignisse.
- `LoginRateLimitBucket`: temporärer Auth-Drosselzustand.
- Temporal-Persistenz: Historien, Signale, Activityergebnisse, Schedules.
- Infrastruktur: Logs, Backups, Testdaten/-artefakte, E-Mail-Provider-Metadaten.

## Was die Software aktuell kann

- Optionale `retainUntil`, `purgeAt`, `deletedAt` auf Einreichungen/Tasks/Nachrichten/Auditlogs.
- `npm run retention:report` zählt fällige Marker.
- `npm run retention:purge` löscht fällige Nachrichten, Tasks und Einreichungen dauerhaft; Auditlogs nur Report.
- Sensitive Reads nutzen begründete Kurzzeitgrants und Auditzeilen.
- Audit-CSV exportiert nur eine aktuelle 50er-Cursorseite und setzt `exportedForDsarAt` nicht.

Nicht implementiert: Formular-Retentionpolicy, automatische Marker, Scheduler, Legal Hold, DSAR-UI, Backuplöschung, Temporal-History-Cleanup, Purge-Freigabeworkflow, verifizierter Löschbeweis.

## Kritisches Purgeverhalten

Das Skript löscht eine Einreichung bei `purgeAt <= now` **oder sobald `deletedAt` nicht null ist**. `deletedAt` führt daher beim nächsten Purge zur Löschung, selbst wenn `purgeAt` später liegt. Ältere Anweisungen, `deletedAt` vor einer Wartefrist zu setzen, nicht befolgen.

Reihenfolge: Nachrichten, ApprovalTasks, Einreichungen. Verwandte Nachrichten werden nicht automatisch gefunden, Eltern-/Kindbäume nicht vollständig behandelt, Temporal-Historien nicht beendet/gelöscht, Backups nicht berührt. Constraints und reale Daten vor Erstnutzung/jeder Änderung testen.

## Vorläufiger Anfragenprozess

Bis abgesicherte Werkzeuge existieren:

1. Institutionellen Datenschutz-/Records-Fall eröffnen; Identität/Berechtigung außerhalb FormFlow prüfen.
2. Scope, Formular-/Prozessowner, Policy/Legal Hold, Aktion und Freigebende dokumentieren.
3. In eingeschränkter Operatorumgebung arbeiten; keine Ad-hoc-Kopien in Tickets/E-Mail.
4. Gemäß freigegebenem Scope Identitäten, Einreichungen (inklusive Referenzen), Tasks/Notizen, Nachrichten, Audit, Temporal, Logs, E-Mail-Provider, Backups durchsuchen.
5. Nachweise verschlüsselt/zugriffsgeschützt mit geprüften Skripten/Queries exportieren; Schema-/Queryversion festhalten. Built-in-Audit-CSV reicht nicht.
6. Für Berichtigung/Einschränkung/Löschung einen geprüften Plan für verknüpfte/abgeleitete Datensätze erstellen. Erforderliche Beweise erhalten, unnötige Inhalte minimieren.
7. Vor Purge `retention:report`, DB-Dry-Run, Referenzprüfung und Backup-/Restoreprüfung. `deletedAt` erst setzen, wenn sofortige Löschung beim nächsten Purge freigegeben ist.
8. Änderungen möglichst mit Vier-Augen-Prinzip. Counts/IDs (keine Feldinhalte), Operator, Freigabe, Zeit, Skriptversion, Ergebnis sichern.
9. Suchen wiederholen und PostgreSQL, Temporal, Logs, Providerdaten und Backupablauf abgleichen.
10. Institutionellen Fall mit Ergebnis und gegebenenfalls Aufbewahrungs-/Legal-Hold-Begründung schließen.

Direktes Produktions-SQL ist hochriskant. Discovery read-only, Writes nur per peer-reviewtem eng begrenztem Skript. Nie Bulk-Änderung anhand ungeprüfter Identifikatoren.

## Sensitive-Access-Prüfung

`sensitive.access.granted`, `sensitive.accessed`, `sensitive.list_accessed` gemeinsam prüfen. Grant allein beweist keinen Datenabruf; Detail-/Listenzugriffe schon. Das App-Audit ist nicht manipulationsgeschützt und enthält nicht alle Temporal-Übergänge; bei Untersuchungen Infrastruktur-/Temporal-Logs korrelieren.

## Erforderliche Ablösung

Siehe Übergabe-Audit P0-5: mindestens versionierte Formularregeln, automatische Daten, Legal Hold/Einschränkung, Subjektsuche/-export, freigegebene Korrektur/Löschung, Dry Run/Scheduler, Temporal-/Backup-Cleanup, gegebenenfalls unveränderliche Nachweise und End-to-End-Tests.
