# FormFlow

FormFlow ist eine deutsch/englische Workflow-Anwendung für Hochschulformulare und menschliche Freigabeprozesse. Sie bietet rollenbeschränkte Form.io-Formulare, Entwürfe und Einreichungen, Temporal-basierte Freigabeworkflows, LDAP- oder lokale Anmeldung, Feldverschlüsselung, Vertretungen, Benachrichtigungen und eine administrative Audit-Ansicht.

Dieses Repository ist ein weit entwickelter Prototyp beziehungsweise internes Beta-System, aber noch kein unmittelbar produktionsreifer Dienst. Neue Verantwortliche sollten vor einer Einführung mit dem [Übergabepaket](handoff/README.de.md) beginnen. Es ordnet bestätigte Produktivblocker, institutionelle Entscheidungen, Betriebsanleitungen und die technische Dokumentation. Der englische Einstieg steht unter [handoff/README.md](handoff/README.md).

## Dokumentationsübersicht

| Deutsch | English | Inhalt |
|---|---|---|
| [Architektur](docs/de/architecture.md) | [Architecture](docs/architecture.md) | Laufzeitkomponenten, Datenmodell, Sicherheitsgrenzen |
| [Entwicklung](docs/de/developer-guide.md) | [Developer guide](docs/developer-guide.md) | Einrichtung, Konfiguration, Tests, typische Aufgaben |
| [Betrieb](docs/de/deployment.md) | [Deployment](docs/deployment.md) | Aktuelle Container und Produktivcheckliste |
| [API-Referenz](docs/de/api-reference.md) | [API reference](docs/api-reference.md) | Implementierte HTTP-Endpunkte und Zugriffsregeln |
| [Formularerstellung](docs/de/form-authoring.md) | [Form authoring](docs/form-authoring.md) | Unterstützte Form.io-Teilmenge, Übersetzungen, Feldzugriff |
| [Workflow-Erstellung](docs/de/workflow-authoring.md) | [Workflow authoring](docs/workflow-authoring.md) | Stufen, Routing, Bedingungen, SLAs |
| [Rollen und Rechte](docs/de/roles-and-permissions.md) | [Roles and permissions](docs/roles-and-permissions.md) | Systemrollen, benutzerdefinierte Rollen, Rechtematrix |
| [Beispielformulare](forms/README.de.md) | [Example forms](forms/README.md) | Status und sichere Wiederverwendung der Formularschemas |
| [Übergabeübersicht](handoff/README.de.md) | [Handoff overview](handoff/README.md) | Lesereihenfolge und Ablageort aller aktuellen Übergabedateien |
| [Finaler Übergabe-Audit](handoff/HANDOFF_AUDIT.de.md) | [Final handoff audit](handoff/HANDOFF_AUDIT.md) | Aktueller Stand, Produktivblocker, Verbesserungen und priorisierte Arbeiten |
| [Institutionelle Entscheidungen](handoff/DECISIONS_REQUIRED.de.md) | [Institutional decisions](handoff/DECISIONS_REQUIRED.md) | Entscheidungen außerhalb der Softwareentwicklung |
| [Datenschutzbetrieb](handoff/runbooks/PRIVACY_OPERATIONS.de.md) | [Privacy operations](handoff/runbooks/PRIVACY_OPERATIONS.md) | Aktueller manueller Aufbewahrungs-/DSAR-Ablauf |
| [Technischer Dokumentationsindex](docs/de/README.md) | [Technical documentation index](docs/README.md) | Navigation für Architektur, Einrichtung, Betrieb und Erstellung |

Überholte Codebase-Audits wurden aus dem Arbeitsstand entfernt. Frühere Momentaufnahmen bleiben im Git-Verlauf verfügbar; aktuell sind ausschließlich die Inhalte unter [`handoff/`](handoff/).

## Aktueller Stack

- Next.js 16.2.4, React 19, TypeScript 5
- PostgreSQL 16 und Prisma 7
- Temporal Server 1.25 mit Temporal TypeScript SDK 1.17
- NextAuth 4 mit Credentials-Provider sowie LDAP- oder lokalen bcrypt-Passwörtern
- Form.io-5-Builder und Form.io-React-Renderer
- Optional: E-Mail über Resend und Übersetzungsentwürfe über DeepL
- Vitest-Integrationstests und Playwright-Browsertests

## Schnellstart

Voraussetzungen sind Docker mit Compose v2. Für lokale Entwicklung und Prüfungen sollte Node.js 24 verwendet werden, passend zu Dockerfile und CI.

```bash
cp .env.example .env
docker compose up --build
```

Der Entwicklungsstack stellt bereit:

| Dienst | Adresse | Zweck |
|---|---|---|
| Web | <http://localhost:3000> | Next.js-Anwendung |
| Temporal UI | <http://localhost:8080> | Workflow-Inspektion |
| PostgreSQL | `localhost:5432` | Gemeinsame App-/Temporal-Datenbank, nur für Entwicklung |

Der einmalige Container `init` führt Migrationen aus, repariert bei aktivierter Option lokale Schemaabweichungen und legt Entwicklungsdaten an. Der dauerhafte Container `worker` führt Freigabe- und Organisationssync-Workflows aus.

### Entwicklungskonten

Bei deaktiviertem LDAP legt der Seed folgende lokale Anmeldungen an:

| Anmeldung | Passwort | Rollen |
|---|---|---|
| `admin` | `admin` | `admin`, `submitter` |
| `approver` | `approver` | `approver`, `submitter` |
| `submitter` | `submitter` | `submitter` |

Diese bekannten Zugangsdaten dürfen nie in Produktion aktiviert werden. Der aktuelle Produktiv-Bootstrap benötigt vor einer Einführung weitere Entwicklung; siehe Übergabe-Audit.

## Prüfung

```bash
npm run lint
npx tsc --noEmit
npm run build

# Benötigt PostgreSQL und eine migrierte Testdatenbank
npm run test:integration

# Benötigt den vollständigen laufenden Stack
npm run test:e2e
npm run verify:stack
```

`verify:smoke` führt Lint, Build, Integrationstests und den mit `@smoke` markierten Playwright-Test aus. Die CI führt derzeit 65 Integrationsfälle und nur diesen Smoke-Browserablauf aus; die übrigen Browserfälle gehören zur lokalen vollständigen Suite.

## Wichtige Betriebsgrenzen

- `docker-compose.yml` ist eine Entwicklungskonfiguration mit gemeinsamer Datenbank und Entwicklungszugangsdaten.
- `docker-compose.production.yml.example` ist nur ein unvollständiger Ausgangspunkt und kein produktionsfertiges Manifest.
- Organisationssync erst nach Prüfung des LDAP- und Fallback-Verhaltens ausführen.
- Verschlüsselungsschlüssel dürfen nicht verloren gehen; ohne passenden Schlüssel sind verschlüsselte Felder nicht wiederherstellbar.
- Die rechtlichen, datenschutzbezogenen, barrierefreiheitsbezogenen und Support-Texte in der Anwendung sind Platzhalter.

## Linux mit Cisco Secure Client

Wenn Cisco Secure Client den Docker-Bridge-Verkehr zu ausschließlich über VPN erreichbaren LDAP-Hosts blockiert, kann der Linux-spezifische Host-Netzwerk-Override verwendet werden:

```bash
docker compose -f docker-compose.yml -f docker-compose.linux-vpn.yml up --build
```

Der Override ist nicht für Windows oder macOS gedacht. Vor einer Nutzung außerhalb der Entwicklung muss die größere Netzwerkexposition geprüft werden.
