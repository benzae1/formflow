# Rollen und Berechtigungen

Benutzer können mehrere Rollen besitzen. Berechtigungen addieren sich, außer wenn eine Route Eigentum/Zuweisung verlangt. Die vier Systemrollennamen sind vor Umbenennung/Löschung geschützt. Admins können kleingeschriebene Custom-Rollen für Formularzugriff, Feldleseregeln und Workflowrouting anlegen.

## Systemrollen

| Rolle | Aktueller Zweck |
|---|---|
| `submitter` | Standardrolle aus LDAP/Seed; normale Eigentümeroberfläche |
| `approver` | Inbox und Bearbeitung eigener zugewiesener Aufgaben; optional Teamansicht |
| `admin` | Formulare, Workflows, Rollen/Benutzer, Org-Sync, Dashboard, globale Einreichungen, Audit |
| `compliance` | Leseorientiertes Dashboard, globale Einreichungen, Auditlog |

Die Submission-API akzeptiert technisch jede angemeldete Person mit Formularzugriff; die konkrete Rolle `submitter` ist nicht zwingend. Zielgruppen über erlaubte Rollen ausdrücken.

## Rechtematrix

| Fähigkeit | Submitter/sonstige Angemeldete | Approver | Admin | Compliance |
|---|---:|---:|---:|---:|
| Erlaubtes veröffentlichtes Formular öffnen | Ja | Ja | Ja (Bypass) | Ja, wenn erlaubt |
| Eigenen Fall anlegen/speichern/absenden | Wenn erlaubt | Wenn erlaubt | Ja | Wenn erlaubt |
| Eigene Fälle sehen | Ja | Ja | Ja | Ja (als Eigentümer) |
| Zugewiesene Fälle sehen | Nein | Ja | Bei Zuweisung oder global | Global |
| Team-Sichtbarkeit | Nein | Bei `teamScope=true` | Nicht nötig | Nein |
| Freigabeaufgabe bearbeiten | Nur direkt zugewiesen | Nur direkt zugewiesen | Nur direkt zugewiesen | Nur direkt zugewiesen |
| Globale Standard-Einreichungen | Nein | Nein (außer eigen/zugewiesen/Team) | Ja | Ja |
| Globale PII-/Sensitive-Liste | Nein | Kein globales Privileg | Mit Listengrant | Mit Listengrant |
| Sensitive Detailansicht | Bei sonstiger Sichtbarkeit + Einzelgrant | Gleich | Gleich | Gleich |
| Formulare/Workflows verwalten | Nein | Nein | Ja | Nein |
| Rollen/Benutzerrollen verwalten | Nein | Nein | Ja | Nein |
| Auditlog/CSV | Nein | Nein | Ja | Ja |
| Organisation/Sync | Nein | Nein | Ja | Nein |
| Eigene Vertretung anlegen | Nein | Ja | Ja | Nein |
| Vertretung für andere anlegen | Nein | Nein | Ja | Nein |

Entscheidungsrouten prüfen Taskeigentum, nicht Rollennamen. Eine direkt/über Rolle/Gruppe/Org zugewiesene Person kann handeln, auch wenn später `approver` fehlt. Ein Admin kann fremde offene Aufgaben nicht über diese Endpunkte überschreiben.

## Formular- und Feldzugriff

Leere `allowedRoles` erlauben allen Angemeldeten den Zugriff, sonst muss mindestens eine Rolle passen. Admin passiert immer. Auch die öffentlich wirkende Formularroute verlangt Anmeldung.

Pro Feld:

- leere `properties.readRoles` bedeuten Leserecht für alle; `ownerCanRead` ist dann ohne Wirkung;
- bei nicht leerer Liste dürfen passende Rollen lesen;
- Eigentümer dürfen die nicht leere Liste zusätzlich umgehen, sofern `properties.ownerCanRead` nicht `"false"` ist;
- bei fehlender Berechtigung wird der Wert aus der Response entfernt, auch nach Entschlüsselung.

Feldregeln sollten vorhandene Rollen verwenden. Sichere Rollenlöschung/-umbenennung sucht diese Schemareferenzen.

## Sichtbarkeit von Einreichungen

Prisma-Filter setzen Datensatzsichtbarkeit:

- normale Benutzer: eigene Einreichungen;
- Approver: eigene plus jemals/aktuell zugewiesene Tasks; optional `teamScope` für Eigentümer mit gleicher OrgUnit-ID;
- Admin/Compliance: bei explizitem Sensitive-Include alle, sonst nur `standard`.

Der Listengrant gilt aktuell speziell für Admin/Compliance bei PII/Sensitive. Approver erhalten kein globales Privileg, ihre Zuweisungs-/Teamlisten unterliegen aber nicht diesem Admin-Listengrant. `sensitive`-Details benötigen für jede Rolle einen Einzelgrant; `pii`-Details derzeit nicht.

## Break-Glass-Freigabe

Die UI sendet eine mindestens zehn Zeichen lange Begründung an `/api/sensitive-access`. Der Server auditiert und setzt ein signiertes HttpOnly-Cookie für zehn Minuten. Später werden Akteur, Scope, Signatur, Ablauf geprüft und der tatsächliche Zugriff protokolliert.

Dies ist Kontrolle/Verantwortlichkeit, keine Privilegieneskalation: Datensatzsichtbarkeit muss bereits bestehen.

## Teamzugriff

Admin kann `teamScope` bei Approvern setzen. Sichtbarkeit basiert auf gleicher `OrgMembership.orgUnitId`, nicht auf allen Nachfahren eines Organisationsbaums. Es gibt nur Sichtbarkeit, keine fremden Taskaktionen. Als breiten Datenzugriff regelmäßig prüfen.

## Rollen- und Kontoverwaltung

Die Adminseite listet Benutzer, ändert komplette Rollenmengen und Teamzugriff, verwaltet Custom-Rollen und zeigt Vertretungen. Sie legt keine lokalen Benutzer/Passwörter an, deaktiviert/reaktiviert nicht und weist offene Tasks nicht neu zu.

Rollenupdates erhöhen `sessionVersion` und widerrufen alle Sitzungen. Eigene Rollenänderung meldet den Admin bei der nächsten Prüfung ab; sicherheitstechnisch erwartet, aber UX-seitig klarer zu warnen/behandeln.

LDAP-Login kann Rollen aus Allowlisten/Attributmapping ersetzen. Manuelle Rollen von LDAP-Benutzern können beim nächsten Login überschrieben werden. Eine verbindliche Rollenquelle festlegen.

Deaktivierung erfolgt über Organisationsabgleich bei Fehlen in einem nicht leeren Ergebnis. Offene Tasks werden nicht automatisch neu zugewiesen; Admins erhalten nur eine Nachricht. Dies ist ein wichtiger Übergabepunkt.

## Grenzen der Vertretung

Approver und Vertretung müssen aktiv sowie `approver` oder `admin` sein. Zeiträume dürfen sich pro Approver nicht überschneiden. Der Workflow berücksichtigt Vertretung aktuell erst bei Überfälligkeit, nicht bei initialer Zuweisung. Die Liste stammt aus der Benutzerseite; eine GET-Delegations-API fehlt.
