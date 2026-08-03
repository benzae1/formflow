# Leitfaden zur Workflow-Erstellung

Administration bearbeitet Workflows unter `/<locale>/admin/workflows`. Eine Definition ist ein geordnetes JSON-Array in PostgreSQL und wird bei jeder Einreichung als Snapshot gespeichert. Temporal führt diesen Snapshot dauerhaft aus.

## Stufenform

```ts
type WorkflowStage = {
  id: string;
  name: string;
  type: "approval" | "notification" | "trigger-form" | "condition";
  assignTo?: RoutingTarget | RoutingTarget[];
  childFormId?: string;
  conditions?: Array<{ expression: string }>;
  sla?: { hours: number; reminderAt: number[] };
  onApprove?: "next-stage" | "close";
  onReject?: "close" | "return-to-submitter" | { goTo: string };
};
```

IDs sollten nicht leer, stabil, eindeutig und slugartig sein, auch wenn Zod dies derzeit nicht vollständig erzwingt. `name` sollte für Operators verständlich sein. Leere Arrays bestehen die Create-Validierung, können aber keinem veröffentlichten Formular als ausführbarer Workflow dienen.

## Approval-Stufe

```json
{
  "id": "department-review",
  "name": "Department review",
  "type": "approval",
  "assignTo": { "type": "role", "value": "approver" },
  "sla": { "hours": 72, "reminderAt": [24, 48] },
  "onApprove": "next-stage",
  "onReject": "return-to-submitter"
}
```

Der Worker erzeugt pro aufgelöster Person eine offene Aufgabe. Bei mehreren Aufgaben gewinnt die erste gültige Freigabe/Ablehnung/Überarbeitungsanforderung; alle übrigen werden abgebrochen. Das ist eine **One-of-many-Freigabe**, keine Einstimmigkeit.

`onApprove: "close"` endet erfolgreich mit Einreichungsstatus `closed`. Ohne Wert wird fortgefahren; auch die letzte Stufe endet als `closed`. `onReject` führt standardmäßig zu Ablehnung/Ende und speichert ebenfalls `closed`.

Überarbeitung schließt aktuelle Aufgaben, setzt `needs_revision`, wartet auf explizite Wiedereinreichung und wiederholt dieselbe Stufe mit neuen Aufgaben.

## Notification-Stufe

```json
{
  "id": "notify-office",
  "name": "Notify office",
  "type": "notification",
  "assignTo": { "type": "role", "value": "admin" }
}
```

Aufgelöste Personen erhalten In-App- und bei Konfiguration E-Mail-Nachrichten. Die Stufe wartet nicht. Werden zur Laufzeit keine Personen gefunden, läuft sie still weiter; Speichervalidierung garantiert nicht jede zukünftige Fallkonstellation.

## Condition-Stufe

Bedingungen verwenden [`expr-eval`](https://github.com/silentmatt/expr-eval), nicht JavaScript. Erlaubte Variablen beginnen mit `data.`, `form.`, `submitter.`; maximal 500 Zeichen.

```json
{
  "id": "large-request",
  "name": "Large request?",
  "type": "condition",
  "conditions": [{ "expression": "data.amount >= 1000" }],
  "onReject": { "goTo": "normal-review" }
}
```

Alle Ausdrücke sind per UND verknüpft. Sind alle wahr, folgt die nächste Arraystufe. Bei falsch oder Auswertungsfehler folgt `onReject`:

- `return-to-submitter`: Korrektur abwarten und erneut prüfen;
- `{ "goTo": "stage-id" }`: zur Zielstufe springen;
- `close`: `closed` setzen, eine Ablehnungsmeldung senden und enden;
- fehlt der Wert: mit nächster Stufe fortfahren.

Keine JavaScript-Syntax/Funktionen wie `===` oder `Number(...)` verwenden. Repräsentative und fehlende Werte testen.

## Trigger-form-Stufe

```json
{
  "id": "collect-follow-up",
  "name": "Collect follow-up form",
  "type": "trigger-form",
  "childFormId": "form-uuid"
}
```

Erzeugt einen leeren **Kindentwurf** für die ursprüngliche Person, verknüpft ihn, benachrichtigt sie und setzt den Elternworkflow sofort fort. Es wartet nicht und startet den Kindworkflow nicht. Validierung verlangt Existenz, aber aktuell weder Veröffentlichung noch Benutzerzugriff.

## Routingziele

| Typ | Wert | Auflösung |
|---|---|---|
| `role` | Rollenname | Alle aktiven Benutzer mit Rolle |
| `user` | Benutzer-UUID | Exakte Person; beim Speichern aktiv |
| `group` | **OrgUnit-Datenbank-UUID** | Alle Mitgliedschaften der Einheit |
| `org` | `submitter.manager` | Andere Manager-Mitgliedschaft derselben Einheit |
| `org` | `submitter.skip-level` | Manager der Elterneinheit |
| `org` | `department.head` | Head/Manager der Abteilung oder Elterneinheit |

Mehrere Ziele werden vereinigt und Benutzer-IDs dedupliziert. `group` ist nicht LDAP-DN/external ID, entgegen älterer Doku.

Org-Validierung beim Speichern beweist nur, dass die aktuelle Struktur irgendwo auflösbar ist. Sie garantiert nicht die Hierarchie jedes künftigen Submitters. Null Empfänger in einer Approval-Stufe lassen den Temporal-Workflow fehlschlagen und den Fall operativ hängen.

## SLA, Erinnerungen und Vertretung

`sla.hours` setzt `dueAt` und plant Überfälligkeit so viele Stunden nach Taskanlage. Jeder `reminderAt`-Wert bedeutet ebenfalls Stunden **nach Stufenstart**, nicht Stunden vor Frist. Positive Werte unterhalb `sla.hours` verwenden; Reihenfolge/Bereich werden nicht erzwungen.

Bei Entscheidung wird der Timer-Scope abgebrochen. Bei Überfälligkeit kann aktive Vertretung die Aufgabe übernehmen, sonst werden Person und Admins benachrichtigt. Bei initialer Taskanlage wird die Vertretung derzeit nicht angewendet.

## Ablehnungsrouting

| Wert | Ergebnis |
|---|---|
| `close` oder leer | Task abgelehnt, Einreichung `closed`, Ablehnungsmeldung, Ende |
| `return-to-submitter` | Überarbeitungsschleife derselben Stufe |
| `{ "goTo": "id" }` | An Zielstufe fortsetzen |

`goTo`-Referenzen werden geprüft. Rückwärtsschleifen ohne fachliche Abbruchbedingung vermeiden.

Der Workflow speichert `closed` sowohl bei erfolgreichem als auch bei abgelehntem Ende. Taskstatus und Ergebnisnachricht unterscheiden das Resultat weiterhin, der Einreichungsstatus selbst jedoch nicht. Diese Reporting-/Datenmodellentscheidung muss vor Produktion bestätigt werden; spätere Änderung kann Migrationen und API-/UI-Anpassungen erfordern.

## Validierung und Versionierung

Create/Update prüft Stufenform und aktuelle DB-Referenzen. Update ersetzt die gesamte Definition und erhöht `Workflow.version`. Bestehende Einreichungen behalten ihren Snapshot.

Beim Speichern/Veröffentlichen eines Formulars wird der Workflow erneut auf nicht leer/ausführbar geprüft. Es gibt keinen eigenen Workflow-Publishstatus und keinen Delete-Endpunkt.

## Checkliste

- [ ] Eindeutige stabile Stufen-IDs und verständliche Namen
- [ ] One-of-many-Semantik für Mehrfachziele akzeptiert
- [ ] Direkte Benutzer aktiv; Rollen/Gruppen befüllt
- [ ] Zielauflösung für jede vorgesehene Submittergruppe getestet
- [ ] `expr-eval`-Syntax und fehlende Daten getestet
- [ ] Keine unbeabsichtigte Endlosschleife durch `goTo`
- [ ] Erinnerungen ab Stufenstart und vor Überfälligkeit
- [ ] Aktuelles Vertretungsverhalten erst bei Überfälligkeit akzeptiert
- [ ] Folgeformular veröffentlicht, zugänglich, überwacht
- [ ] Überarbeitung, Ablehnung, Timeout, Worker-Neustart und Aktivitätswiederholung in Staging getestet
