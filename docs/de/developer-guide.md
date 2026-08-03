# FormFlow-Entwicklungsleitfaden

## Unterstützte Entwicklungsbasis

Verwenden Sie Node.js 24, npm 10+, Docker 24+ und Docker Compose v2. CI und Dockerfile nutzen Node 24. Node 22 baut das Projekt derzeit ebenfalls, ist aber nicht die festgelegte CI-/Laufzeitbasis.

## Einrichtung

```bash
git clone <repository-url>
cd formflow
cp .env.example .env
npm install
docker compose up --build
```

Die Anwendung läuft unter <http://localhost:3000>, die Temporal UI unter <http://localhost:8080>. `init` muss erfolgreich beendet sein, bevor `web` und `worker` starten.

Für gemountete Next.js-Quellen:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Für den Linux-/Cisco-Secure-Client-LDAP-Workaround wird `docker-compose.linux-vpn.yml` verwendet. Er setzt `web`, `init` und `worker` ins Host-Netzwerk und ist nicht für Windows/macOS bestimmt.

## Umgebungsvariablen

`.env.example` lässt LDAP, E-Mail und DeepL bewusst deaktiviert. Compose ersetzt Hostadressen durch Dienstnamen.

### Kernkonfiguration und Secrets

| Variable | Entwicklungswert | Bedeutung |
|---|---|---|
| `DATABASE_URL` | lokale `formflow`-DB | Prisma-Datenbank-URL |
| `NEXTAUTH_URL` | `http://localhost:3000` | Kanonische Auth-/App-URL |
| `APP_URL` | gleiche lokale URL | Fallback für Mutation-Origin und E-Mail-Links |
| `NEXTAUTH_SECRET` | bekannter Nullwert | Signatur für JWT/Sensitive Access; außerhalb lokaler Entwicklung ersetzen |
| `TEMPORAL_ADDRESS` | `localhost:7233` | Temporal-Frontend |
| `TEMPORAL_NAMESPACE` | `default` | Temporal-Namespace |
| `LOG_LEVEL` | im Code `info` | Pino-Loglevel |

### Feldverschlüsselung

| Variable | Bedeutung |
|---|---|
| `FIELD_ENCRYPTION_KEY` | Ein AES-Schlüssel mit 64 Hexzeichen und ID `default` |
| `FIELD_ENCRYPTION_KEYS` | Kommagetrennte Einträge `id=64-hex-key` für Mehrschlüssel-Lesen |
| `FIELD_ENCRYPTION_KEY_ID` | Aktive ID für neue Werte; sonst erster Eintrag oder `default` |

Alte Schlüssel müssen konfiguriert bleiben, solange Datenbankwerte darauf verweisen. `scripts/rotate-encryption-key.ts` ist für aktuelle verschachtelte Daten nicht sicher und muss vor Nutzung korrigiert/getestet werden.

### Anmeldungshärtung

| Variable | Standard |
|---|---|
| `AUTH_MAX_FAILED_ATTEMPTS` | `5` |
| `AUTH_FAILED_LOGIN_WINDOW_MINUTES` | `15` |
| `AUTH_LOCKOUT_DURATION_MINUTES` | `15` |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | `60` |
| `AUTH_RATE_LIMIT_MAX_ATTEMPTS` | `10` |

Kurzzeit-Zähler pro Login/IP liegen in PostgreSQL. Die Client-IP verwendet den ersten `X-Forwarded-For`-Wert; der Reverse Proxy muss Forwarding-Header ersetzen beziehungsweise bereinigen.

### LDAP und Organisationssync

| Variable | Format/Zweck |
|---|---|
| `LDAP_URLS` | Kommagetrennte LDAP-URLs |
| `LDAP_BASE_DNS` | Pipe-getrennte Base-DNs; Kommas bleiben Bestandteil des DN |
| `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD` | Optionales Suchkonto |
| `LDAP_TIMEOUT_MS` | Timeout; Code-Fallback 5000 ms, Beispiel 8000 ms |
| `LDAP_FALLBACK_EMAIL_DOMAIN` | Domain bei fehlendem `mail` |
| `LDAP_ADMIN_UIDS`, `LDAP_APPROVER_UIDS`, `LDAP_COMPLIANCE_UIDS` | UID-Allowlisten für privilegierte Rollen |
| `LDAP_ROLE_ATTRIBUTE` | Optionales mehrwertiges Rollenattribut |
| `LDAP_ROLE_ATTRIBUTE_MAP` | Kommagetrennte Zuordnung `quellwert=rolle` |
| `LDAP_SYNC_FILTER` | Sync-Filter, Standard `(uid=*)` |
| `ORG_SYNC_INTERVAL_MINUTES` | Worker-Intervall, Standard `60` |

Die älteren Aliase `LDAP_URL` und `LDAP_BASE_DN` werden akzeptiert. Vor Workerstart oder manuellem Sync ohne echtes LDAP muss der Sync-Blocker aus dem Übergabe-Audit behoben werden.

### Optionale Integrationen

| Variable | Bedeutung |
|---|---|
| `RESEND_API_KEY` | Erstellt bei Wert den Resend-Client |
| `DISABLE_EMAIL_DELIVERY` | Versand nur, wenn nicht `true` |
| `EMAIL_FROM_ADDRESS` | Bei aktivem Versand erforderlich |
| `DEEPL_API_KEY` | Aktiviert deutsche-englische Übersetzungsentwürfe über DeepL Free |
| `ALLOW_DEMO_USERS` | Erlaubt Demo-Seed bei `NODE_ENV=production`; für echte Produktion ungeeignet |
| `PRISMA_AUTO_REPAIR_SCHEMA` | Erlaubt `prisma db push --accept-data-loss` bei Drift; nur Entwicklung |

## Datenbank und Seed

Prisma 7 liest `DATABASE_URL` über `prisma.config.js`.

```bash
npm run prisma:generate
npm run prisma:migrate
npx prisma migrate deploy
npm run prisma:studio
```

`npm run prisma:init` führt `migrate deploy`, optional eine lokale Reparatur und immer `prisma db seed` aus. Der Seed erzeugt vier Systemrollen, drei Demo-Konten mit bekannten Passwörtern und einen Basisworkflow. In Produktion bricht er ohne `ALLOW_DEMO_USERS=true` ab; mit dem Flag werden die Demo-Konten angelegt. Rollen-/Bootstrapdaten müssen vor Produktion von Demodaten getrennt werden.

Die Dateien unter `forms/` sind Beispiele und werden nicht automatisch importiert.

## Qualitätsprüfungen

```bash
npm run lint
npx tsc --noEmit
npm run build
npm audit --omit=dev
```

Zum Übergabestand 2026-08-03 bestehen Lint, Typecheck und Build. Der Audit der Produktionsabhängigkeiten besteht nicht; Details im Übergabe-Audit.

### Integrationstests

Die 65 Vitest-Fälle benötigen eine erreichbare migrierte PostgreSQL-Datenbank. Die meisten Routentests mocken Sitzung und Temporal; der Health-Test prüft Temporalverhalten über Mocks.

```bash
npx prisma migrate deploy
npm run test:integration
```

Abgedeckt sind unter anderem Anmeldung, CSRF, Formulare, Formularzugriff, Form.io-Härtung, Übersetzung, Verschlüsselungskonfiguration, Einreichungen, Break Glass, Freigaberouten, Workflows, Rollen, Benutzer/Vertretungen, Benachrichtigungen, LDAP-Konfiguration und Health.

### Browsertests

Playwright benötigt den vollständigen Stack:

```bash
npm run test:e2e:install
npm run test:e2e
```

Fünf Laufzeitfälle prüfen Veröffentlichen/Absenden/Freigeben, Überarbeitung/Wiedereinreichung, Ablehnung/Routenschutz und Builder-Darstellung in beiden Sprachen. CI führt derzeit nur den `@smoke`-Fall aus.

```bash
npm run verify:stack
npm run verify:smoke
```

## Typische Änderungen

### Prisma-Schema

`prisma/schema.prisma` ändern, mit `npx prisma migrate dev --name <name>` migrieren, Client neu erzeugen und Integrationstest ergänzen. `db push --accept-data-loss` nie gegen Produktion verwenden.

### API-Route

Handler über `apiErrorResponse` absichern, Autorisierungshelper verwenden und vor Mutationen `assertMutationRequest(req)` aufrufen. Body und Query mit Zod validieren; einige ältere Filter casten Querywerte noch direkt.

### Form.io-Unterstützung

Neue Komponenten erfordern Änderungen an Allowlist/Validierung, Datennormalisierung, Renderer/Builder, gegebenenfalls Übersetzungsextraktion und Tests. Ausführbare Form.io-Eigenschaften nicht pauschal aktivieren.

### Workflow-Stufe

Domaintyp, Zod- und Referenzvalidierung, Designer, Temporal-Verhalten sowie Integrations-/Browsertests gemeinsam ändern. Temporal-Änderungen müssen deterministisch bleiben und für laufende Historien versioniert werden.

### Übersetzungen

UI-Texte liegen in `src/lib/i18n/dictionaries.ts`; beide Locales müssen den `Dictionary`-Typ erfüllen. Temporal-Benachrichtigungen und einzelne ältere/geteilte UI-Texte sind noch fest englisch und benötigen eine klare Lokalisierungsstrategie.

## Repository-Hygiene

- `.env`, Playwright-Artefakte, `.next` und generierte Prisma-Ausgaben nicht committen.
- `test-results/.last-run.json` ist derzeit versioniert; alle generierten Testergebnisse sollten künftig entkoppelt werden.
- `@formio/react` wird im Renderer, `@formio/js` im Builder verwendet. Die separate ältere Abhängigkeit `formiojs` scheint ungenutzt und sollte bei der Abhängigkeitsbereinigung geprüft/entfernt werden.
- Aktuelle Erkenntnisse zu Zuständigkeiten, Risiken und Produktivreife gehören in das [`handoff/`](../../handoff/README.de.md)-Paket. Überholte Auditstände bleiben über den Git-Verlauf verfügbar.
