import "server-only";
import { defaultLocale, type Locale } from "./config";

export type Dictionary = {
  common: {
    appName: string;
    brandSubtitle: string;
    signedIn: string;
    back: string;
    close: string;
    saveDraft: string;
    publish: string;
    draft: string;
    published: string;
    archived: string;
    loading: string;
    notAvailable: string;
    yes: string;
    no: string;
    system: string;
  };
  language: {
    label: string;
    de: string;
    en: string;
  };
  auth: {
    yearSignin: string;
    title: string;
    accentTitle: string;
    lede: string;
    authLabel: string;
    access: string;
    username: string;
    password: string;
    usernamePlaceholder: string;
    passwordPlaceholder: string;
    submit: string;
    submitPending: string;
    error: string;
    help: string;
    imprint: string;
    privacy: string;
    accessibility: string;
  };
  workspace: {
    alerts: string;
    notifications: string;
    notificationsEmpty: string;
    signOut: string;
  };
  nav: {
    work: string;
    administration: string;
    myWork: string;
    inbox: string;
    overview: string;
    oversight: string;
    forms: string;
    workflows: string;
    globalQueue: string;
    users: string;
    orgSync: string;
    auditLog: string;
  };
  forms: {
    formNotAvailable: string;
    editSubmission: string;
    publishedForm: string;
    responseIntro: string;
    draftIntro: string;
    reviseIntro: string;
    saveError: string;
    draftSaved: string;
    submissionUpdated: string;
    submissionReceived: string;
    loadingForm: string;
    generateDraftTranslation: string;
    translationUnavailable: string;
    translationNeedsReview: string;
    german: string;
    english: string;
    translationGenerated: string;
  };
  submissions: {
    notAvailable: string;
    restrictedOrEmpty: string;
    mySubmissions: string;
    submitterWorkspace: string;
    submitterDescription: string;
    submissionList: string;
    currentWork: string;
    searchPlaceholder: string;
    allStatuses: string;
    filter: string;
    noMatchesEyebrow: string;
    noMatchesTitle: string;
    noMatchesDescription: string;
    publishedForms: string;
    startSomethingNew: string;
    nothingPublishedEyebrow: string;
    nothingPublishedTitle: string;
    nothingPublishedDescription: string;
    updated: string;
    latestNote: string;
    resumeDraft: string;
    startNew: string;
    detailEyebrow: string;
    detailDescription: string;
    formVersion: string;
    submittedBy: string;
    created: string;
    responseSnapshot: string;
    submittedAnswers: string;
    followUpWork: string;
    childSubmission: string;
    approvalTimeline: string;
    noApprovalTasks: string;
    due: string;
    workflowContext: string;
    noWorkflowSummary: string;
    breakGlassEyebrow: string;
    breakGlassTitle: string;
    breakGlassDescription: string;
    breakGlassLabel: string;
    breakGlassPlaceholder: string;
    breakGlassSubmit: string;
    breakGlassCancel: string;
  };
  inbox: {
    eyebrow: string;
    title: string;
    description: string;
    pending: string;
    overdue: string;
    completed: string;
    emptyEyebrow: string;
    emptyTitle: string;
    emptyDescription: string;
    completedReview: string;
    approvalTask: string;
    submission: string;
    created: string;
    due: string;
    openSubmission: string;
    coverageTitle: string;
    coverageDescription: string;
  };
  delegations: {
    title: string;
    description: string;
    chooseDelegateAndDates: string;
    saveError: string;
    removeError: string;
    noRecords: string;
    remove: string;
    chooseDelegate: string;
    starts: string;
    ends: string;
    save: string;
    to: string;
  };
  adminForms: {
    pageEyebrow: string;
    pageTitle: string;
    pageDescription: string;
    searchPlaceholder: string;
    createForm: string;
    openBuilder: string;
    version: string;
    workflow: string;
    unassigned: string;
    newForm: string;
    freshShell: string;
    formTitle: string;
    noWorkflowYet: string;
    noParentForm: string;
    allowedRoles: string;
    allowedRolesHelp: string;
    allUsers: string;
    noRolesAvailable: string;
    slugHelp: string;
    createAndOpenBuilder: string;
    creating: string;
    titleRequired: string;
    slugRequired: string;
    createError: string;
    defaultTitle: string;
    defaultSubmit: string;
    standard: string;
    pii: string;
    sensitive: string;
  };
  builder: {
    loadingBuilder: string;
    pageEyebrow: string;
    formSettings: string;
    metadataHelp: string;
    previewSchema: string;
    backToBuilder: string;
    sensitivity: string;
    noWorkflowAssigned: string;
    fieldAccessTips: string;
    fieldAccessTipsA: string;
    fieldAccessTipsB: string;
    fieldAccessSettings: string;
    encryptField: string;
    readRoles: string;
    submitterCanRead: string;
    builderCanvas: string;
    builderCanvasHelp: string;
    saveFailed: string;
    formPublished: string;
    draftSaved: string;
    reviewStatus: string;
  };
  adminDashboard: {
    submitted: string;
    inReview: string;
    overdue: string;
    needsRevision: string;
    approved: string;
    rejected: string;
    closed: string;
    archive: string;
    submissions: string;
    submissionsSub: string;
    auditLog: string;
    auditSub: string;
    sensitive: string;
    overdueAlerts: string;
    failedWorkflows: string;
    forms: string;
    formsSub: string;
    drafts: string;
    published: string;
    archived: string;
    workflowHealth: string;
    workflowHealthSub: string;
    active: string;
    errors: string;
    users: string;
    usersSub: string;
    total: string;
    deactivated: string;
    adminOps: string;
    complianceOps: string;
    oversight: string;
    operations: string;
    heroDescription: string;
    manageForms: string;
    reviewWorkflows: string;
    orgSync: string;
    orgCurrent: string;
    lastSync: string;
    open: string;
    openPipeline: string;
    usersCount: string;
  };
  adminUsers: {
    pageEyebrow: string;
    pageTitle: string;
    pageDescription: string;
    saveError: string;
    roleError: string;
    searchPlaceholder: string;
    allRoles: string;
    allStatuses: string;
    active: string;
    deactivated: string;
    noMatches: string;
    updated: string;
    roles: string;
    saveRoles: string;
    orgMemberships: string;
    noMemberships: string;
    member: string;
    manager: string;
    delegationDescription: string;
    rolePanelEyebrow: string;
    rolePanelTitle: string;
    rolePanelDescription: string;
    newRoleTitle: string;
    roleSlug: string;
    roleLabel: string;
    createRole: string;
    creatingRole: string;
    existingRoles: string;
    protectedRole: string;
    customRole: string;
    builtinRoleHint: string;
    customRoleHint: string;
    renameRole: string;
    deleteRole: string;
    deletingRole: string;
    savingRole: string;
    noRoles: string;
    slugHelp: string;
    roleSlugHint: string;
    roleLabelHint: string;
    roleAssignmentsRefresh: string;
  };
  adminWorkflows: {
    pageEyebrow: string;
    pageTitle: string;
    pageDescription: string;
    saveError: string;
    newWorkflowName: string;
    libraryEyebrow: string;
    libraryTitle: string;
    newWorkflow: string;
    version: string;
    attachedForms: string;
    editorEyebrow: string;
    editWorkflow: string;
    createWorkflow: string;
    saving: string;
    saveWorkflow: string;
    workflowName: string;
    attachedFormsTitle: string;
    noAttachedForms: string;
    validationErrorsTitle: string;
    addStage: string;
    noStages: string;
    role: string;
    orgHierarchy: string;
    user: string;
    group: string;
    roleName: string;
    userUuid: string;
    groupUuid: string;
    remove: string;
    addTarget: string;
    stageName: string;
    moveUp: string;
    moveDown: string;
    removeStage: string;
    stageId: string;
    type: string;
    assignTo: string;
    childForm: string;
    selectForm: string;
    conditions: string;
    addCondition: string;
    onApprove: string;
    nextStage: string;
    close: string;
    onReject: string;
    returnToSubmitter: string;
    goToStage: string;
    selectStage: string;
    deadlineHours: string;
    remindersHours: string;
    stageTypes: {
      approval: string;
      notification: string;
      triggerForm: string;
      condition: string;
    };
    orgOptions: {
      submitterManager: string;
      submitterSkipLevel: string;
      departmentHead: string;
    };
  };
};

const dictionaries: Record<Locale, Dictionary> = {
  de: {
    common: {
      appName: "Bauhaus Forms",
      brandSubtitle: "Universitätskommunikation",
      signedIn: "Angemeldet",
      back: "Zurück",
      close: "Schließen",
      saveDraft: "Entwurf speichern",
      publish: "Veröffentlichen",
      draft: "Entwurf",
      published: "Veröffentlicht",
      archived: "Archiviert",
      loading: "Lädt...",
      notAvailable: "Nicht verfügbar",
      yes: "Ja",
      no: "Nein",
      system: "System",
    },
    language: {
      label: "Sprache",
      de: "DE",
      en: "EN",
    },
    auth: {
      yearSignin: "Anmeldung",
      title: "An",
      accentTitle: "melden.",
      lede: "Bauhaus Forms | Workflow-Plattform der Bauhaus-Universität Weimar.",
      authLabel: "Authentifizierung | LDAP",
      access: "Zugang",
      username: "Benutzername",
      password: "Passwort",
      usernamePlaceholder: "max.mustermann",
      passwordPlaceholder: "........",
      submit: "Anmelden",
      submitPending: "Anmeldung läuft...",
      error: "Benutzername oder Passwort ist ungültig. Bitte erneut versuchen.",
      help: "Hilfe",
      imprint: "Impressum",
      privacy: "Datenschutz",
      accessibility: "Barrierefreiheit",
    },
    workspace: {
      alerts: "Hinweise",
      notifications: "Benachrichtigungen",
      notificationsEmpty: "Keine ungelesenen Benachrichtigungen.",
      signOut: "Abmelden",
    },
    nav: {
      work: "Arbeit",
      administration: "Administration",
      myWork: "Meine Vorgänge",
      inbox: "Postfach",
      overview: "Übersicht",
      oversight: "Aufsicht",
      forms: "Formulare",
      workflows: "Workflows",
      globalQueue: "Globale Warteschlange",
      users: "Benutzer",
      orgSync: "Organisationsabgleich",
      auditLog: "Audit-Log",
    },
    forms: {
      formNotAvailable: "Formular ist nicht verfügbar.",
      editSubmission: "Einreichung bearbeiten",
      publishedForm: "Veröffentlichtes Formular",
      responseIntro: "Füllen Sie das veröffentlichte Formular aus, um den Workflow zu starten.",
      draftIntro: "Dieser Entwurf kann weiterbearbeitet und später eingereicht werden.",
      reviseIntro: "Diese Einreichung kann jetzt überarbeitet werden. Nach dem erneuten Absenden läuft der Workflow weiter.",
      saveError: "Die Einreichung konnte nicht gespeichert werden. Bitte erneut versuchen.",
      draftSaved: "Entwurf gespeichert. Weiterleitung zur Fallakte...",
      submissionUpdated: "Einreichung aktualisiert. Weiterleitung zur Fallakte...",
      submissionReceived: "Einreichung empfangen. Weiterleitung zur Fallakte...",
      loadingForm: "Formular wird geladen...",
      generateDraftTranslation: "Übersetzungsentwurf erzeugen",
      translationUnavailable: "DeepL ist nicht konfiguriert. Manuelle Übersetzung bleibt verfügbar.",
      translationNeedsReview: "Automatisch erzeugte Übersetzungen müssen vor der Veröffentlichung geprüft werden.",
      german: "Deutsch",
      english: "Englisch",
      translationGenerated: "Übersetzungsentwurf gespeichert.",
    },
    submissions: {
      notAvailable: "Nicht verfügbar",
      restrictedOrEmpty: "Eingeschränkt oder nicht angegeben",
      mySubmissions: "Meine Einreichungen",
      submitterWorkspace: "Arbeitsbereich für Einreichende",
      submitterDescription: "Veröffentlichte Formulare starten, Bearbeitungsschritte nachvollziehen und Entwürfe oder Überarbeitungen ohne Kontextverlust fortsetzen.",
      submissionList: "Übersicht der Einreichungen",
      currentWork: "Aktuelle Arbeit",
      searchPlaceholder: "Nach Formulartitel suchen",
      allStatuses: "Alle Status",
      filter: "Filtern",
      noMatchesEyebrow: "Noch nichts hier",
      noMatchesTitle: "Keine Einreichungen für diese Ansicht",
      noMatchesDescription: "Versuchen Sie einen anderen Filter oder starten Sie rechts ein neues Formular.",
      publishedForms: "Veröffentlichte Formulare",
      startSomethingNew: "Neue Einreichung starten",
      nothingPublishedEyebrow: "Keine Formulare veröffentlicht",
      nothingPublishedTitle: "Aktuell ist kein Formular zur Einreichung verfügbar",
      nothingPublishedDescription: "Bitten Sie eine Administratorin oder einen Administrator, ein Formular mit Workflow zu veröffentlichen.",
      updated: "Aktualisiert",
      latestNote: "Letzte Notiz",
      resumeDraft: "Entwurf fortsetzen",
      startNew: "Neu beginnen",
      detailEyebrow: "Einreichungsdetail",
      detailDescription: "Zentrale Fallansicht für Einreichende, Freigebende, Administration und Compliance.",
      formVersion: "Formularversion",
      submittedBy: "Eingereicht von",
      created: "Erstellt",
      responseSnapshot: "Aktueller Antwortstand",
      submittedAnswers: "Eingereichte Antworten",
      followUpWork: "Weiterführende Vorgänge",
      childSubmission: "Untergeordnete Einreichung",
      approvalTimeline: "Freigabeverlauf",
      noApprovalTasks: "Es wurden noch keine Freigabeaufgaben erzeugt.",
      due: "Fällig",
      workflowContext: "Workflow-Kontext",
      noWorkflowSummary: "Keine Workflow-Zusammenfassung verfügbar.",
      breakGlassEyebrow: "Zugriffsbegründung erforderlich",
      breakGlassTitle: "Sensibler Inhalt",
      breakGlassDescription: "Diese Einreichung enthält sensible Daten. Bitte begründen Sie Ihren Zugriff – die Angabe wird für die Compliance-Prüfung protokolliert.",
      breakGlassLabel: "Begründung für den Zugriff",
      breakGlassPlaceholder: "Warum greifen Sie auf diese Einreichung zu? (mindestens 10 Zeichen)",
      breakGlassSubmit: "Zugriff bestätigen",
      breakGlassCancel: "Zurück",
    },
    inbox: {
      eyebrow: "Freigabe-Arbeitsbereich",
      title: "Freigabe-Postfach",
      description: "Die Warteschlange sichten, in Falldetails springen und Entscheidungen erst mit vollem Kontext treffen.",
      pending: "Ausstehend",
      overdue: "Überfällig",
      completed: "Abgeschlossen",
      emptyEyebrow: "Warteschlange leer",
      emptyTitle: "Keine Aufgaben in dieser Ansicht",
      emptyDescription: "Neue Freigaben erscheinen hier, sobald Workflow-Stufen auf Sie aufgelöst werden.",
      completedReview: "Abgeschlossene Prüfung",
      approvalTask: "Freigabeaufgabe",
      submission: "Einreichung",
      created: "Erstellt",
      due: "Fällig",
      openSubmission: "Einreichung öffnen",
      coverageTitle: "Vertretung",
      coverageDescription: "Legen Sie eine Vertretung fest, damit neue Freigabeaufgaben während Ihrer Abwesenheit zuverlässig weitergeleitet werden.",
    },
    delegations: {
      title: "Vertretung",
      description: "Legen Sie eine Vertretung fest, damit neue Freigabeaufgaben bei Abwesenheit sauber weitergeleitet werden.",
      chooseDelegateAndDates: "Wählen Sie eine Vertretung und beide Zeitpunkte aus.",
      saveError: "Die Vertretung konnte nicht gespeichert werden.",
      removeError: "Die Vertretung konnte nicht entfernt werden.",
      noRecords: "Keine aktiven Vertretungen vorhanden.",
      remove: "Entfernen",
      chooseDelegate: "Vertretung wählen",
      starts: "Beginn",
      ends: "Ende",
      save: "Vertretung speichern",
      to: "bis",
    },
    adminForms: {
      pageEyebrow: "Admin-Formulare",
      pageTitle: "Formularkatalog",
      pageDescription: "Neue Formulareingänge aufsetzen, Workflows zuordnen und Formulare direkt im Builder von Entwurf auf veröffentlicht stellen.",
      searchPlaceholder: "Nach Titel oder Slug suchen",
      createForm: "Formular erstellen",
      openBuilder: "Builder öffnen",
      version: "Version",
      workflow: "Workflow",
      unassigned: "Nicht zugewiesen",
      newForm: "Neues Formular",
      freshShell: "Mit einer leeren Vorlage beginnen",
      formTitle: "Formulartitel",
      noWorkflowYet: "Noch kein Workflow",
      noParentForm: "Kein Elternformular",
      allowedRoles: "Erlaubte Rollen",
      allowedRolesHelp: "Leer bedeutet: Alle authentifizierten Benutzerinnen und Benutzer können das veröffentlichte Formular sehen und absenden.",
      allUsers: "Alle Benutzer",
      noRolesAvailable: "Keine Rollen verfügbar.",
      slugHelp: "Slugs verwenden Kleinbuchstaben, Zahlen und Bindestriche. Der Workflow kann später hinzugefügt werden.",
      createAndOpenBuilder: "Erstellen und Builder öffnen",
      creating: "Wird erstellt...",
      titleRequired: "Bitte zuerst einen Formulartitel angeben.",
      slugRequired: "Bitte einen Slug mit Kleinbuchstaben, Zahlen und Bindestrichen angeben.",
      createError: "Das Formular konnte nicht erstellt werden. Bitte Slug oder Workflow-Auswahl prüfen.",
      defaultTitle: "Titel der Anfrage",
      defaultSubmit: "Absenden",
      standard: "Standard",
      pii: "PII",
      sensitive: "Sensibel",
    },
    builder: {
      loadingBuilder: "Builder wird geladen...",
      pageEyebrow: "Builder",
      formSettings: "Formulareinstellungen",
      metadataHelp: "Verwalten Sie Metadaten und Workflow-Zuordnung, bevor Sie in den Builder wechseln.",
      previewSchema: "Schema-JSON anzeigen",
      backToBuilder: "Zurück zum Builder",
      sensitivity: "Sensitivität",
      noWorkflowAssigned: "Kein Workflow zugewiesen",
      fieldAccessTips: "Tipps zum Feldzugriff",
      fieldAccessTipsA: "Über die Einstellungen unten steuern Sie Verschlüsselung und rollenbasierten Lesezugriff.",
      fieldAccessTipsB: "Änderungen an veröffentlichten Formularen erzeugen automatisch neue Versionen.",
      fieldAccessSettings: "Feldzugriffseinstellungen",
      encryptField: "Feld verschlüsselt speichern",
      readRoles: "Leserollen",
      submitterCanRead: "Einreichende dürfen ihren eigenen Wert lesen",
      builderCanvas: "Builder-Fläche",
      builderCanvasHelp: "Ziehen Sie Komponenten in den großzügigen Arbeitsbereich; die Metadaten befinden sich oberhalb.",
      saveFailed: "Die Builder-Änderungen konnten nicht gespeichert werden.",
      formPublished: "Formular veröffentlicht.",
      draftSaved: "Entwurf gespeichert.",
      reviewStatus: "Prüfstatus",
    },
    adminDashboard: {
      submitted: "Eingereicht",
      inReview: "In Prüfung",
      overdue: "Überfällig",
      needsRevision: "Revision nötig",
      approved: "Freigegeben",
      rejected: "Abgelehnt",
      closed: "Geschlossen",
      archive: "Archiv",
      submissions: "Einreichungen",
      submissionsSub: "Pipeline von neu eingereichter Arbeit bis zum endgültigen Ergebnis.",
      auditLog: "Audit-Log",
      auditSub: "Spuren sensibler Zugriffe und Compliance-relevanter Ereignisse.",
      sensitive: "Sensibel",
      overdueAlerts: "Überfällige Hinweise",
      failedWorkflows: "Fehlgeschlagene Workflows",
      forms: "Formulare",
      formsSub: "Veröffentlichungsstatus und Builder-Zugang.",
      drafts: "Entwürfe",
      published: "Veröffentlicht",
      archived: "Archiviert",
      workflowHealth: "Workflow-Status",
      workflowHealthSub: "Ausführungsdruck, SLA-Risiko und Temporal-Fehler.",
      active: "Aktiv",
      errors: "Fehler",
      users: "Benutzer",
      usersSub: "Verzeichnis- und Lebenszyklusereignisse.",
      total: "Gesamt",
      deactivated: "Deaktiviert",
      adminOps: "Administration · Betrieb",
      complianceOps: "Compliance · Betrieb",
      oversight: "Aufsicht",
      operations: "Betrieb",
      heroDescription: "Bauhaus Forms - Einreichungspipeline, Workflows und Verzeichnis auf einen Blick.",
      manageForms: "Formulare verwalten",
      reviewWorkflows: "Workflows prüfen",
      orgSync: "Organisationsabgleich",
      orgCurrent: "Verzeichnis aktuell - keine inaktiven Identitäten erkannt",
      lastSync: "Letzte Synchronisation",
      open: "Öffnen ->",
      openPipeline: "Pipeline öffnen ->",
      usersCount: "Benutzer",
    },
    adminUsers: {
      pageEyebrow: "Verzeichnis",
      pageTitle: "Benutzer und Routing-Kontext",
      pageDescription: "Prüfen Sie aktive Konten, passen Sie Rollenabdeckung an und legen Sie Vertretungszeiträume fest, damit das Routing verlässlich bleibt.",
      saveError: "Rollenänderungen konnten nicht gespeichert werden.",
      roleError: "Die Rollenverwaltung konnte nicht gespeichert werden.",
      searchPlaceholder: "Nach Name oder E-Mail suchen",
      allRoles: "Alle Rollen",
      allStatuses: "Alle Status",
      active: "Aktiv",
      deactivated: "Deaktiviert",
      noMatches: "Keine Benutzer entsprechen den aktuellen Filtern.",
      updated: "Aktualisiert",
      roles: "Rollen",
      saveRoles: "Rollen speichern",
      orgMemberships: "Organisationsmitgliedschaften",
      noMemberships: "Keine Mitgliedschaften synchronisiert.",
      member: "Mitglied",
      manager: "Leitung",
      delegationDescription: "Administrierende können zeitlich begrenzte Vertretungen für Freigaben festlegen.",
      rolePanelEyebrow: "Rollenregister",
      rolePanelTitle: "Benutzerrollen verwalten",
      rolePanelDescription: "Pflegen Sie benutzerdefinierte Rollen direkt hier und weisen Sie sie danach sofort im Verzeichnis zu.",
      newRoleTitle: "Neue Rolle anlegen",
      roleSlug: "Slug",
      roleLabel: "Anzeigename",
      createRole: "Rolle anlegen",
      creatingRole: "Wird angelegt...",
      existingRoles: "Verfügbare Rollen",
      protectedRole: "Geschützt",
      customRole: "Benutzerdefiniert",
      builtinRoleHint: "Systemrolle. Kann zugewiesen, aber nicht umbenannt oder gelöscht werden.",
      customRoleHint: "Freie Anwendungsrolle. Kann umbenannt oder entfernt werden, solange keine Referenzen blockieren.",
      renameRole: "Rolle speichern",
      deleteRole: "Rolle löschen",
      deletingRole: "Wird gelöscht...",
      savingRole: "Wird gespeichert...",
      noRoles: "Noch keine Rollen vorhanden.",
      slugHelp: "Verwenden Sie stabile Kleinbuchstaben-Slugs mit Bindestrichen, z. B. review-board.",
      roleSlugHint: "review-board",
      roleLabelHint: "Review Board",
      roleAssignmentsRefresh: "Neue oder geänderte Rollen erscheinen nach dem Speichern sofort in den Zuweisungs-Checkboxen unten.",
    },
    adminWorkflows: {
      pageEyebrow: "Admin-Workflows",
      pageTitle: "Routing-Definitionen",
      pageDescription: "Gestalten Sie Genehmigungsstufen visuell - per Karte, Drag-and-Drop und typenspezifischen Feldern.",
      saveError: "Der Workflow konnte nicht gespeichert werden.",
      newWorkflowName: "Neuer Workflow",
      libraryEyebrow: "Workflow-Bibliothek",
      libraryTitle: "Definitionen",
      newWorkflow: "Neuer Workflow",
      version: "Version",
      attachedForms: "verknüpfte Formulare",
      editorEyebrow: "Editor",
      editWorkflow: "Workflow bearbeiten",
      createWorkflow: "Workflow erstellen",
      saving: "Wird gespeichert...",
      saveWorkflow: "Workflow speichern",
      workflowName: "Workflow-Name",
      attachedFormsTitle: "Verknüpfte Formulare",
      noAttachedForms: "Derzeit verweist kein Formular auf diesen Workflow.",
      validationErrorsTitle: "Die Definition enthält Fehler:",
      addStage: "Stufe hinzufügen",
      noStages: "Noch keine Stufen. Fügen Sie eine hinzu.",
      role: "Rolle",
      orgHierarchy: "Org-Hierarchie",
      user: "Benutzer",
      group: "Gruppe",
      roleName: "Rollenname",
      userUuid: "Benutzer-UUID",
      groupUuid: "Gruppen-UUID",
      remove: "Entfernen",
      addTarget: "Ziel hinzufügen",
      stageName: "Stufenname",
      moveUp: "Nach oben",
      moveDown: "Nach unten",
      removeStage: "Stufe entfernen",
      stageId: "Stufen-ID",
      type: "Typ",
      assignTo: "Zuweisen an",
      childForm: "Unterformular",
      selectForm: "Formular wählen...",
      conditions: "Bedingungen",
      addCondition: "Bedingung",
      onApprove: "Bei Freigabe",
      nextStage: "Nächste Stufe",
      close: "Abschließen",
      onReject: "Bei Ablehnung",
      returnToSubmitter: "Zurück an Einreicher",
      goToStage: "Zu Stufe...",
      selectStage: "Stufe wählen...",
      deadlineHours: "Frist (Stunden)",
      remindersHours: "Erinnerungen (Std., kommagetrennt)",
      stageTypes: {
        approval: "Freigabe",
        notification: "Benachrichtigung",
        triggerForm: "Formular auslösen",
        condition: "Bedingung",
      },
      orgOptions: {
        submitterManager: "Vorgesetzte Person der einreichenden Person",
        submitterSkipLevel: "Nächsthöhere Führungskraft",
        departmentHead: "Abteilungsleitung",
      },
    },
  },
  en: {
    common: {
      appName: "Bauhaus Forms",
      brandSubtitle: "University Communications",
      signedIn: "Signed in",
      back: "Back",
      close: "Close",
      saveDraft: "Save draft",
      publish: "Publish",
      draft: "Draft",
      published: "Published",
      archived: "Archived",
      loading: "Loading...",
      notAvailable: "Not available",
      yes: "Yes",
      no: "No",
      system: "System",
    },
    language: {
      label: "Language",
      de: "DE",
      en: "EN",
    },
    auth: {
      yearSignin: "Sign in",
      title: "Sign",
      accentTitle: "in.",
      lede: "Bauhaus Forms | Workflow system of the Bauhaus-Universität Weimar.",
      authLabel: "Authentication | LDAP",
      access: "Access",
      username: "Username",
      password: "Password",
      usernamePlaceholder: "max.mustermann",
      passwordPlaceholder: "........",
      submit: "Sign in",
      submitPending: "Signing in...",
      error: "Invalid username or password. Please try again.",
      help: "Help",
      imprint: "Imprint",
      privacy: "Privacy",
      accessibility: "Accessibility",
    },
    workspace: {
      alerts: "Alerts",
      notifications: "Notifications",
      notificationsEmpty: "No unread notifications.",
      signOut: "Sign out",
    },
    nav: {
      work: "Work",
      administration: "Administration",
      myWork: "My work",
      inbox: "Inbox",
      overview: "Overview",
      oversight: "Oversight",
      forms: "Forms",
      workflows: "Workflows",
      globalQueue: "Global queue",
      users: "Users",
      orgSync: "Org sync",
      auditLog: "Audit log",
    },
    forms: {
      formNotAvailable: "Form not available.",
      editSubmission: "Edit submission",
      publishedForm: "Published form",
      responseIntro: "Complete the published form below to start the approval workflow.",
      draftIntro: "This draft can be edited and submitted later.",
      reviseIntro: "This submission is open for edits. Submitting here resumes the workflow.",
      saveError: "The submission could not be saved. Please try again.",
      draftSaved: "Draft saved. Redirecting to the case file...",
      submissionUpdated: "Submission updated. Redirecting back to the case file...",
      submissionReceived: "Submission received. Redirecting to the case file...",
      loadingForm: "Loading form...",
      generateDraftTranslation: "Generate draft translation",
      translationUnavailable: "DeepL is not configured. Manual translation remains available.",
      translationNeedsReview: "Generated translations must be reviewed before publication.",
      german: "German",
      english: "English",
      translationGenerated: "Draft translation saved.",
    },
    submissions: {
      notAvailable: "Not available",
      restrictedOrEmpty: "Restricted or not provided",
      mySubmissions: "My submissions",
      submitterWorkspace: "Submitter workspace",
      submitterDescription: "Start published forms, track every decision point, and jump back into drafts or revisions without losing context.",
      submissionList: "Submission list",
      currentWork: "Current work",
      searchPlaceholder: "Search by form title",
      allStatuses: "All statuses",
      filter: "Filter",
      noMatchesEyebrow: "Nothing here yet",
      noMatchesTitle: "No submissions match this view",
      noMatchesDescription: "Try a different filter or start a fresh request from one of the published forms on the right.",
      publishedForms: "Published forms",
      startSomethingNew: "Start something new",
      nothingPublishedEyebrow: "No forms published",
      nothingPublishedTitle: "Nothing is open for submission",
      nothingPublishedDescription: "Ask an administrator to publish a form and attach a workflow.",
      updated: "Updated",
      latestNote: "Latest note",
      resumeDraft: "Resume draft",
      startNew: "Start new",
      detailEyebrow: "Submission detail",
      detailDescription: "A shared case file for submitters, approvers, administrators, and compliance reviewers.",
      formVersion: "Form version",
      submittedBy: "Submitted by",
      created: "Created",
      responseSnapshot: "Response snapshot",
      submittedAnswers: "Submitted answers",
      followUpWork: "Follow-up work",
      childSubmission: "Child submission",
      approvalTimeline: "Approval timeline",
      noApprovalTasks: "No approval tasks have been created yet.",
      due: "Due",
      workflowContext: "Workflow context",
      noWorkflowSummary: "No workflow summary is available for this form.",
      breakGlassEyebrow: "Access justification required",
      breakGlassTitle: "Sensitive content",
      breakGlassDescription: "This submission contains sensitive data. State your reason for access — it will be logged for compliance review.",
      breakGlassLabel: "Reason for access",
      breakGlassPlaceholder: "Why are you accessing this submission? (minimum 10 characters)",
      breakGlassSubmit: "Confirm access",
      breakGlassCancel: "Go back",
    },
    inbox: {
      eyebrow: "Approver workspace",
      title: "Approval inbox",
      description: "Triage the queue, jump into case detail, and only commit a decision when you have the context you need.",
      pending: "Pending",
      overdue: "Overdue",
      completed: "Completed",
      emptyEyebrow: "Queue clear",
      emptyTitle: "No tasks in this view",
      emptyDescription: "New approval work will appear here as soon as workflow stages resolve to you.",
      completedReview: "Completed review",
      approvalTask: "Approval task",
      submission: "Submission",
      created: "Created",
      due: "Due",
      openSubmission: "Open submission",
      coverageTitle: "Coverage",
      coverageDescription: "Set a delegate when you are away so new approval tasks route cleanly during that window.",
    },
    delegations: {
      title: "Coverage",
      description: "Set a delegate when you are away so new approval tasks route cleanly during that window.",
      chooseDelegateAndDates: "Choose a delegate and both dates.",
      saveError: "Could not save delegation.",
      removeError: "Could not remove delegation.",
      noRecords: "No active delegation records.",
      remove: "Remove",
      chooseDelegate: "Choose delegate",
      starts: "Starts",
      ends: "Ends",
      save: "Save delegation",
      to: "to",
    },
    adminForms: {
      pageEyebrow: "Admin forms",
      pageTitle: "Form catalog",
      pageDescription: "Create new intake experiences, attach workflows, and move forms from draft to published with the builder one click away.",
      searchPlaceholder: "Search title or slug",
      createForm: "Create form",
      openBuilder: "Open builder",
      version: "Version",
      workflow: "Workflow",
      unassigned: "Unassigned",
      newForm: "New form",
      freshShell: "Start with a fresh shell",
      formTitle: "Form title",
      noWorkflowYet: "No workflow yet",
      noParentForm: "No parent form",
      allowedRoles: "Allowed roles",
      allowedRolesHelp: "Leave this empty to keep the published form visible and submittable for all authenticated users.",
      allUsers: "All users",
      noRolesAvailable: "No roles available.",
      slugHelp: "Slugs use lowercase letters, numbers, and hyphens. Leave the workflow blank to attach one later.",
      createAndOpenBuilder: "Create and open builder",
      creating: "Creating...",
      titleRequired: "Add a form title before creating the form.",
      slugRequired: "Add a slug using lowercase letters, numbers, and hyphens.",
      createError: "The form could not be created. Try a different slug or workflow selection.",
      defaultTitle: "Request title",
      defaultSubmit: "Submit",
      standard: "Standard",
      pii: "PII",
      sensitive: "Sensitive",
    },
    builder: {
      loadingBuilder: "Loading builder...",
      pageEyebrow: "Builder",
      formSettings: "Form settings",
      metadataHelp: "Manage metadata and route assignment before you drop into the builder workspace.",
      previewSchema: "Preview schema JSON",
      backToBuilder: "Back to builder",
      sensitivity: "Sensitivity",
      noWorkflowAssigned: "No workflow assigned",
      fieldAccessTips: "Field access tips",
      fieldAccessTipsA: "Use the field settings below to control encryption and role-based read access.",
      fieldAccessTipsB: "Schema changes on published forms create new versions automatically.",
      fieldAccessSettings: "Field access settings",
      encryptField: "Encrypt this field at rest",
      readRoles: "Read roles",
      submitterCanRead: "Submitter can read their own value",
      builderCanvas: "Builder canvas",
      builderCanvasHelp: "Drag components into a full-width workspace; metadata controls now live above the builder.",
      saveFailed: "The builder changes could not be saved.",
      formPublished: "Form published.",
      draftSaved: "Draft saved.",
      reviewStatus: "Review status",
    },
    adminDashboard: {
      submitted: "Submitted",
      inReview: "In Review",
      overdue: "Overdue",
      needsRevision: "Needs Revision",
      approved: "Approved",
      rejected: "Rejected",
      closed: "Closed",
      archive: "Archive",
      submissions: "Submissions",
      submissionsSub: "Pipeline from newly submitted work through final outcomes.",
      auditLog: "Audit Log",
      auditSub: "Sensitive access trails and compliance-significant events.",
      sensitive: "Sensitive",
      overdueAlerts: "Overdue alerts",
      failedWorkflows: "Failed workflows",
      forms: "Forms",
      formsSub: "Publication status and builder access.",
      drafts: "Drafts",
      published: "Published",
      archived: "Archived",
      workflowHealth: "Workflow Health",
      workflowHealthSub: "Execution pressure, SLA risk, and Temporal failures.",
      active: "Active",
      errors: "Errors",
      users: "Users",
      usersSub: "Directory and lifecycle events.",
      total: "Total",
      deactivated: "Deactivated",
      adminOps: "Admin · Operations",
      complianceOps: "Compliance · Operations",
      oversight: "Oversight",
      operations: "Operations",
      heroDescription: "Bauhaus Forms - submission pipeline, workflows, and directory at a glance.",
      manageForms: "Manage forms",
      reviewWorkflows: "Review workflows",
      orgSync: "Org Sync",
      orgCurrent: "Directory current - no inactive identities detected",
      lastSync: "Last sync",
      open: "Open ->",
      openPipeline: "Open pipeline ->",
      usersCount: "Users",
    },
    adminUsers: {
      pageEyebrow: "Directory",
      pageTitle: "Users and routing context",
      pageDescription: "Review who is active, adjust role coverage, and set delegation windows so routing stays reliable.",
      saveError: "Could not save role changes.",
      roleError: "Could not update the role registry.",
      searchPlaceholder: "Search by name or email",
      allRoles: "All roles",
      allStatuses: "All statuses",
      active: "Active",
      deactivated: "Deactivated",
      noMatches: "No users match the current filters.",
      updated: "Updated",
      roles: "Roles",
      saveRoles: "Save roles",
      orgMemberships: "Org memberships",
      noMemberships: "No memberships synced.",
      member: "member",
      manager: "manager",
      delegationDescription: "Admins can set backup approvers for date-bound coverage.",
      rolePanelEyebrow: "Role registry",
      rolePanelTitle: "Manage user roles",
      rolePanelDescription: "Create and maintain custom roles here, then assign them immediately in the directory below.",
      newRoleTitle: "Create a new role",
      roleSlug: "Slug",
      roleLabel: "Display label",
      createRole: "Create role",
      creatingRole: "Creating...",
      existingRoles: "Available roles",
      protectedRole: "Protected",
      customRole: "Custom",
      builtinRoleHint: "Built-in system role. It can be assigned, but not renamed or deleted.",
      customRoleHint: "Custom application role. It can be renamed or removed while no protected references block it.",
      renameRole: "Save role",
      deleteRole: "Delete role",
      deletingRole: "Deleting...",
      savingRole: "Saving...",
      noRoles: "No roles found.",
      slugHelp: "Use stable lowercase slugs with hyphens, for example review-board.",
      roleSlugHint: "review-board",
      roleLabelHint: "Review Board",
      roleAssignmentsRefresh: "Saved role changes appear in the assignment checkboxes below right away.",
    },
    adminWorkflows: {
      pageEyebrow: "Admin workflows",
      pageTitle: "Routing definitions",
      pageDescription: "Build approval stages visually - with cards, drag-and-drop, and type-specific field editors.",
      saveError: "Workflow could not be saved.",
      newWorkflowName: "New workflow",
      libraryEyebrow: "Workflow library",
      libraryTitle: "Definitions",
      newWorkflow: "New workflow",
      version: "Version",
      attachedForms: "attached forms",
      editorEyebrow: "Editor",
      editWorkflow: "Edit workflow",
      createWorkflow: "Create workflow",
      saving: "Saving...",
      saveWorkflow: "Save workflow",
      workflowName: "Workflow name",
      attachedFormsTitle: "Attached forms",
      noAttachedForms: "No forms currently reference this workflow.",
      validationErrorsTitle: "Definition has errors:",
      addStage: "Add stage",
      noStages: "No stages yet. Add one below.",
      role: "Role",
      orgHierarchy: "Org hierarchy",
      user: "User",
      group: "Group",
      roleName: "Role name",
      userUuid: "User UUID",
      groupUuid: "Group UUID",
      remove: "Remove",
      addTarget: "Add target",
      stageName: "Stage name",
      moveUp: "Move up",
      moveDown: "Move down",
      removeStage: "Remove stage",
      stageId: "Stage ID",
      type: "Type",
      assignTo: "Assign to",
      childForm: "Child form",
      selectForm: "Select a form...",
      conditions: "Conditions",
      addCondition: "Add condition",
      onApprove: "On approve",
      nextStage: "Next stage",
      close: "Close",
      onReject: "On reject",
      returnToSubmitter: "Return to submitter",
      goToStage: "Go to stage...",
      selectStage: "Select stage...",
      deadlineHours: "Deadline (hours)",
      remindersHours: "Reminders (h, comma-separated)",
      stageTypes: {
        approval: "Approval",
        notification: "Notification",
        triggerForm: "Trigger form",
        condition: "Condition",
      },
      orgOptions: {
        submitterManager: "Submitter's manager",
        submitterSkipLevel: "Skip-level manager",
        departmentHead: "Department head",
      },
    },
  },
};

export async function getDictionary(locale: Locale = defaultLocale) {
  return dictionaries[locale];
}
