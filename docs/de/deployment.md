# FormFlow-Betrieb und Deployment

Das Repository kann einen Entwicklungsstack bauen und starten. Es enthält noch kein produktionsfertiges Deployment. `docker-compose.production.yml.example` ist nur als Topologiebeschreibung zu behandeln.

## Aktuelle Images und Dienste

Das einstufige `Dockerfile` basiert auf `node:24-bookworm-slim`, installiert OpenSSL und alle Abhängigkeiten, kopiert das gesamte Repository und führt `npm run build` aus. Das fertige Image enthält deshalb Quellcode und Entwicklungsabhängigkeiten; es ist nicht das in älteren Dokumenten beschriebene minimale Multi-Stage-Image.

Basis-Compose startet sechs Dienste:

| Dienst | Aktuelles Verhalten |
|---|---|
| `postgres` | PostgreSQL 16; zwei lokale Datenbanken (`formflow`, `temporal`) in einem Server |
| `temporal` | `temporalio/auto-setup:1.25` mit lokaler Temporal-DB |
| `temporal-ui` | `temporalio/ui:2.37.2`, Port 8080 |
| `init` | Führt `npm run prisma:init` aus und endet |
| `web` | Next.js auf 3000 mit DB-/Temporal-Healthcheck |
| `worker` | Temporal-Worker mit prozessbasiertem Healthcheck |

## Warum das Produktionsbeispiel nicht direkt einsetzbar ist

Vor Produktion müssen alle P0-Punkte des Übergabe-Audits gelöst werden. Insbesondere:

- `prisma:init` führt immer den Demo-Seed aus. Mit `NODE_ENV=production` schlägt er ohne `ALLOW_DEMO_USERS=true` fehl; mit dem Flag entstehen Demo-Konten mit bekannten Passwörtern.
- Der Worker legt immer einen Org-Sync-Zeitplan an. Ohne echtes LDAP kann der Entwicklungsadapter Beispielidentitäten erzeugen und andere Benutzer deaktivieren.
- Laufzeitabhängigkeiten haben aktuell kritische/hohe Advisories.
- Rechtliche und Support-Inhalte sind Platzhalter.
- Aufbewahrungsmarker werden nicht automatisch gesetzt.
- Reverse Proxy, TLS-Automation, Secret Store, Ressourcenlimits, zentrale Telemetrie, Alerts, Backupjobs und Restoreverfahren fehlen.

## Zieltopologie

```text
Nutzende -> institutioneller TLS-Proxy/WAF -> Web-Replikate
                                             |-> App-PostgreSQL
                                             `-> Temporal-Frontend

Worker-Replikate -> App-PostgreSQL + Temporal
Temporal-Frontend -> eigene Temporal-PostgreSQL

Nur intern: Temporal UI, DB-Ports, Metrik-Endpunkte
Kontrollierte externe Dienste: LDAP, E-Mail-Anbieter, optional DeepL
```

Images per Digest pinnen, Netze einschränken, als Nicht-Root laufen lassen, Root-Dateisystem möglichst read-only betreiben und CPU-/RAM-Limits setzen. Ein Multi-Stage-Produktionsimage und eine SBOM erstellen.

## Erforderliche Konfiguration

Mindestens über Secret-/Konfigurationsmanagement bereitstellen:

- HTTPS-Werte für `NEXTAUTH_URL` und `APP_URL`;
- starke eindeutige Werte für `NEXTAUTH_SECRET` und Verschlüsselungsschlüssel;
- getrennte Datenbankzugänge;
- Temporal-Adresse/Namensraum;
- geprüfte LDAP-URLs, Base-DNs, Servicekonto, Rollenmapping und Sync-Filter;
- E-Mail-Aktivierung, Provider-Secret und institutionellen Absender;
- optional DeepL erst nach Freigabe des Datenflusses;
- explizite Auth-Drosselung und Loglevel.

Alte hochschulspezifische UID-/IP-Beispiele nicht übernehmen. `.env.example` zeigt Syntax ohne LDAP-Aktivierung, enthält aber bekannte Entwicklungssecrets, die für echte Umgebungen ersetzt werden müssen.

## Datenbankinitialisierung

Gewünschte Produktionsreihenfolge:

1. geprüfte Migrationen mit `prisma migrate deploy` anwenden;
2. nur unveränderliche Systemrollen beziehungsweise freigegebene Referenzdaten anlegen;
3. keine Demo-Benutzer oder Demo-Workflows erzeugen;
4. Webprozess starten;
5. Worker erst nach sicherer LDAP-/Org-Sync-Konfiguration starten.

`npm run prisma:init` trennt dies derzeit nicht. `PRISMA_AUTO_REPAIR_SCHEMA=true` darf in Produktion nicht gesetzt werden, da damit `prisma db push --accept-data-loss` ausgeführt wird.

## Anforderungen an den Reverse Proxy

- TLS terminieren und HTTP auf HTTPS umleiten.
- Eingehende `X-Forwarded-For`, `X-Real-IP`, `Host` und `X-Forwarded-Proto` entsprechend dem Proxy ersetzen statt ungeprüft übernehmen/anhängen.
- Request-/Body-/Zeitlimits passend für Form.io setzen.
- PostgreSQL, Temporal-gRPC und Temporal UI nicht öffentlich exponieren.
- Nach Migration von `middleware.ts` zu `proxy.ts` CSP und Sicherheitsheader prüfen.

Die Anwendung setzt CSP, Frame-Denial, Content-Type-, Referrer-, Permissions- und produktiven HSTS-Header. Formular-/Adminseiten erlauben absichtlich `unsafe-eval`; Adminseiten zusätzlich Form.io-ACE-CDN und Blob-Worker. Diese Ausnahme benötigt Security Review und Regressionstests.

## Health, Readiness und Observability

`GET /api/health` ist öffentlich und liefert 200 nur, wenn PostgreSQL und Temporal antworten, sonst 503 ohne Rohfehler. Als Readiness verwenden, nicht als einziges Liveness-Signal. Ein Temporal-Ausfall macht derzeit auch Web-Readiness negativ.

Pino schreibt nach stdout (`LOG_LEVEL`, Standard `info`). Zu ergänzen sind Sammlung, Aufbewahrung, Redaktionsprüfung, Dashboards und Alerts für:

- Web-/Worker-Neustarts und Healthfehler;
- fehlgeschlagene/festhängende Workflows und Schedulefehler;
- Freigabestau, überfällige Aufgaben, Aufgaben deaktivierter Benutzer;
- LDAP-Sync-Mengen/-Fehler und unerwartete Massendeaktivierung;
- Anmeldefehler/-sperren und Rate-Limit-Spitzen;
- E-Mail-Fehler;
- Retention-Rückstand und Auditexporte.

## Backup und Wiederherstellung

Beide Datenbanken verschlüsselt, zugriffsgeschützt und außerhalb des Hosts sichern. Die App-DB enthält Formulare, Snapshots, verschlüsselte Einreichungen, Aufgaben, Identitäten, Rechte, Benachrichtigungen und Auditdaten. Auch die Temporal-DB ist zum Fortsetzen laufender Workflows nötig; sie kann nicht ohne Verlust des Prozesszustands einfach neu erzeugt werden.

Dokumentieren und üben:

- RPO/RTO und Sicherungsplan;
- Point-in-Time-Recovery;
- Konsistenz zwischen App- und Temporal-DB;
- Restore in isolierter Umgebung;
- Schlüsselhinterlegung und -wiederherstellung;
- Abgleich und Sitzungsbehandlung nach Restore.

Schlüssel nicht ausschließlich neben den Datenbankbackups speichern.

## Aufbewahrung und Datenschutzbetrieb

`npm run retention:report` meldet Datensätze mit fälligen Markern. `npm run retention:purge` löscht markierte Benachrichtigungen, Aufgaben und Einreichungen, nie Auditlogs. Beide Befehle setzen keine Fristen. Vor Nutzung sind richtlinienbasierte Marker, Freigabe, Dry Run, Integritätstests, Backupbezug und Scheduler nötig.

## Releaseablauf nach Behebung der Blocker

1. Advisories und Lockfile-Diff prüfen; vollständige Suite ausführen.
2. Unveränderliches Image bauen und scannen.
3. Backup- und Restorebereitschaft bestätigen.
4. Migrationen als eigenen Job ausführen.
5. Web/Worker in Staging deployen; `verify:stack`, Accessibility-Scans und repräsentative LDAP-/E-Mail-Tests ausführen.
6. Header, Proxy-IP, Health/Readiness, Dashboards, Alerts und Runbooks prüfen.
7. Institutionelle Freigaben einholen und rollbackfähiges Release planen.

## Rollback-Hinweis

Ein Image-Rollback ist nur sicher, wenn die alte Version das migrierte Schema und die Temporal-Historien versteht. Vorwärtskompatible Migrationen und Temporal-Workflow-Versionierung bevorzugen. Migrationen mit möglichem Verlust von Einreichungs-/Auditdaten nie automatisch zurückdrehen.
