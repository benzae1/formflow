# FormFlow — erforderliche institutionelle Entscheidungen vor Produktivstart

Stand: 03.08.2026

Adressaten: Product Owner, Hochschul-IT, Informationssicherheit, Datenschutz, Recht/Barrierefreiheit, Records Management und formularverantwortliche Bereiche

Diese Entscheidungen können nicht sicher aus dem Quellcode abgeleitet werden. Technische Blocker stehen getrennt im [Übergabe-Audit](HANDOFF_AUDIT.de.md). Beide Listen müssen geschlossen sein, bevor reale Hochschuldaten verarbeitet werden.

## Entscheidungsregister

| ID | Entscheidung | Verantwortlich | Warum produktionsblockierend | Erforderlicher Nachweis |
|---|---|---|---|---|
| G-1 | Service Owner, technische Verantwortung, Bereitschaft/Support und Finanzierung/Wartungshorizont benennen | IT-Leitung/Projektsponsor | Nach Solo-Entwickler-Übergabe fehlt sonst ein verantwortliches Team | Benannte Rollen, Servicekatalog, Eskalationsweg |
| G-2 | Dienstumfang sowie erlaubte Prozesse/Datenkategorien festlegen | Product Owner + Fachbereiche + Datenschutz | Generische Formulare können außerhalb des bewerteten Zwecks genutzt werden | Freigegebene Nutzungs- und Verbotsliste |
| G-3 | Finales Impressum, Datenschutzhinweis, Barrierefreiheitserklärung und Supportdaten liefern | Recht/DSB/Barrierefreiheit/Support | Live-Seiten enthalten ausdrückliche Platzhalter | Freigegebene zweisprachige Texte mit Prüfdatum |
| G-4 | Rechtsgrundlagen, Verantwortlichkeit/Empfänger, Auftragsverarbeiter und Datenflüsse je Use Case genehmigen | DSB/Recht/Einkauf | LDAP, Hosting, E-Mail und optional DeepL verarbeiten Identitäts-/Inhaltsdaten | Verarbeitungsverzeichnis/DSFA-Entscheidung, Verträge falls nötig |
| G-5 | Aufbewahrungsauslöser/-dauer pro Formular/Prozess und Datensatzklasse definieren | Records Management + DSB + Formularowner | Spalten existieren, bleiben aber null; kein sicherer Standard | Aufbewahrungsmatrix und Löschfreigabe |
| G-6 | Auskunft, Berichtigung, Einschränkung, Löschung, Legal Hold und Nachweisführung definieren | DSB + Records Management + Service Owner | Aktuell direkte DB-Arbeit ohne Fall-UI | Getestetes Runbook, Postfach/Fallsystem, Freigaben, Zielzeiten |
| G-7 | Autoritative Identitäts-/Rollenquelle und Lebenszyklus festlegen | IAM + Sicherheit + Fachverantwortliche | LDAP-Login kann manuelle Rollen ersetzen; Sync deaktiviert; Tasks bleiben offen | Rollenkatalog, Mapping, Joiner/Mover/Leaver, Notfalladmin |
| G-8 | LDAP-Schema, Filter, Base-DNs und Organisationssemantik genehmigen | IAM/Verzeichnisowner | Routing nimmt `ou`, `manager`, Department/Head an | Staging-Testbericht und freigegebenes Mapping |
| G-9 | E-Mail-Weg, Absender/Antwort/Bounces und Nachrichtenrichtlinie wählen | Messaging + DSB/Einkauf | Aktuell nur Resend; E-Mail ist operativ wichtig | Provider/Relay, Absender, Vertrag, Bounce-/Supportowner |
| G-10 | DeepL-Nutzung und erlaubte externe Texte entscheiden | DSB/Einkauf/Content Owner | Admin-Übersetzung sendet Formulartext an DeepL Free API | Freigabe oder explizite Deaktivierung; Reviewowner |
| G-11 | Barrierefreiheitsziel, Prüfumfang, Feedback-/Durchsetzungsweg und Behebungs-SLA festlegen | Barrierefreiheitsstelle + Product Owner | Keine formale Prüfung; Form.io ist komplexe Drittanbieter-UI | Unabhängiger Test, Erklärung, priorisierter Maßnahmenplan |
| G-12 | Verfügbarkeit, RPO/RTO, Wartung, Auditaufbewahrung, Monitoring, Incident Response festlegen | IT-Betrieb + Sicherheit | Keine Produktions-SLOs/Runbooks/Backupautomation | Servicelevel, Restore-Nachweis, Alert-/On-call-Runbook |
| G-13 | Hostingregion, Netzzonen, Secret-/Schlüsselverwahrung und Adminzugriff genehmigen | Infrastruktur + Sicherheit + DSB | Topologie und Schlüssel-Recovery sind offen | Architektur-/Security-Review und Zugriffsprotokolle |
| G-14 | Governance für Formularveröffentlichung definieren | Product Owner + Formularowner + DSB/Barrierefreiheit | Admins können beliebige Schemas/Workflows veröffentlichen; technische Prüfung ist keine Fachfreigabe | Benannte Freigebende und Releasecheckliste |
| G-15 | Go-live-Abnahme und Rollbackautorität festlegen | Sponsor + Service Owner + Sicherheit/DSB | Technische/institutionelle Risiken brauchen explizites Gate | Signierte Launchcheckliste, Rollbackowner, Termin |

## Mindestens erforderliche Governance-Artefakte

Außerhalb des Code-Repositorys im kontrollierten Dokumentations-/Fallsystem ablegen:

- Serviceownership und Eskalationsmatrix;
- Nutzungs-/Verbotsrichtlinie;
- System-/Datenflussbild und Verarbeitungsinventar;
- Rollen-/LDAP-Mappingkatalog;
- Formularfreigaben und Aufbewahrungszuordnung;
- Datenschutz-/DSAR-/Legal-Hold-Runbooks;
- Incident-, Breach-, Backup-/Restore- und Disaster-Recovery-Runbooks;
- Providerfreigaben für Hosting, E-Mail und optionale Übersetzung;
- Barrierefreiheitsprüfung und Maßnahmenakte;
- Launchentscheidung und Risikoakzeptanz.

## Stellen für spätere Inhalte

- Recht/Datenschutz/Barrierefreiheit: `src/lib/legal-copy.ts`
- Supportkanäle: `src/app/[lang]/help/page.tsx` sowie geteilte nicht lokalisierte Seite
- E-Mail: Deployment-Secrets; bei Providerwechsel `notificationActivities.ts`
- LDAP: Deploymentkonfiguration; bei Schemaänderung `src/lib/ldap.ts` und `src/jobs/ldapOrgAdapter.ts`
- Retention: neue formularbezogene Policyfelder/-dienste; manuelle Produktionszeilenänderung ist keine Dauerlösung

Die institutionelle Prüfung muss die zum Einführungszeitpunkt geltenden Gesetze und internen Regeln prüfen. Dieses Repository ersetzt keine Rechtsberatung.
