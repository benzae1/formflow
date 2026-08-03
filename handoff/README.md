# FormFlow handoff

This directory is the starting point for anyone taking ownership of FormFlow. It contains the current launch assessment, the decisions that must be made outside engineering, and the operational runbooks that still require institutional approval.

## Recommended reading order

1. [Final handoff audit](HANDOFF_AUDIT.md) — current product state, verification evidence, production blockers, and prioritized engineering work.
2. [Institutional decisions required](DECISIONS_REQUIRED.md) — ownership, legal, privacy, accessibility, records-management, and operating-model decisions.
3. [Privacy operations runbook](runbooks/PRIVACY_OPERATIONS.md) — interim retention and data-subject-request procedures.
4. [Technical documentation](../docs/README.md) — architecture, development, deployment, APIs, authoring, and permissions.

The German handoff starts at [README.de.md](README.de.md). The English and German editions describe the same repository state; neither is a historical snapshot.

## Directory map

```text
handoff/
├── README.md                       Start here (English)
├── README.de.md                    Einstieg (Deutsch)
├── HANDOFF_AUDIT.md                Current audit and prioritized work
├── HANDOFF_AUDIT.de.md             Aktueller Audit und priorisierte Arbeiten
├── DECISIONS_REQUIRED.md           Institutional decision register
├── DECISIONS_REQUIRED.de.md        Institutioneller Entscheidungsbedarf
└── runbooks/
    ├── PRIVACY_OPERATIONS.md        Interim privacy/retention operations
    └── PRIVACY_OPERATIONS.de.md     Vorläufiger Datenschutzbetrieb
```

The superseded dated codebase audits were removed during the final documentation organization. Git history remains the source for those earlier snapshots.
