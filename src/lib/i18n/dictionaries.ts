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
  };
  inbox: {
    coverageTitle: string;
    coverageDescription: string;
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
    },
    inbox: {
      coverageTitle: "Vertretung",
      coverageDescription: "Legen Sie eine Vertretung fest, damit neue Freigabeaufgaben während Ihrer Abwesenheit zuverlässig weitergeleitet werden.",
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
    },
    inbox: {
      coverageTitle: "Coverage",
      coverageDescription: "Set a delegate when you are away so new approval tasks route cleanly during that window.",
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
  },
};

export async function getDictionary(locale: Locale = defaultLocale) {
  return dictionaries[locale];
}
