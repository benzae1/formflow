import type { Locale } from "./i18n/config";

type LegalPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  sections: Array<{
    title: string;
    body: string[];
  }>;
};

export function getLegalPageContent(page: "imprint" | "privacy" | "accessibility", locale: Locale): LegalPageContent {
  if (locale === "de") {
    switch (page) {
      case "imprint":
        return {
          eyebrow: "Rechtliches",
          title: "Impressum",
          description: "Anbieterangaben und Kontaktinformationen fur den Betrieb von Bauhaus Forms.",
          sections: [
            {
              title: "Verantwortliche Stelle",
              body: [
                "Bauhaus Forms wird fur Verwaltungs- und Freigabeprozesse der Bauhaus-Universitat Weimar betrieben.",
                "Vor dem Produktivstart sollten hier die vollstandigen offiziellen Anbieterangaben, Postanschrift und zentralen Kontaktwege der Universitat eingefugt werden.",
              ],
            },
            {
              title: "Kontakt",
              body: [
                "Tragen Sie hier die zustandige Funktionsadresse fur Produktfragen, Datenschutzanliegen und technische Storungen ein.",
                "Empfohlen ist eine klar benannte Rolle wie FormFlow-Administration statt einer personlichen Mailadresse.",
              ],
            },
          ],
        };
      case "privacy":
        return {
          eyebrow: "Datenschutz",
          title: "Datenschutzhinweise",
          description: "Ubersicht uber die Verarbeitung personenbezogener Daten in Bauhaus Forms.",
          sections: [
            {
              title: "Zweck und Kategorien",
              body: [
                "Bauhaus Forms verarbeitet Anmelde-, Formular-, Freigabe- und Auditdaten, damit universitare Verwaltungsprozesse nachvollziehbar und sicher abgewickelt werden konnen.",
                "Je nach Formular konnen Stammdaten, Kontaktdaten, organisationsbezogene Angaben und sensible Fachinformationen verarbeitet werden.",
              ],
            },
            {
              title: "Rechtsgrundlagen und Empfanger",
              body: [
                "Vor dem Produktivstart sollte diese Seite die konkreten Rechtsgrundlagen, internen Empfangerkreise, eingesetzten Auftragsverarbeiter und gegebenenfalls Hinweise zu E-Mail-Zustellung enthalten.",
                "Die Hinweise sollten zudem erklaren, wann Zugriff nur mit besonderer Begrundung erfolgt und wie Auditprotokolle genutzt werden.",
              ],
            },
            {
              title: "Speicherdauer und Betroffenenrechte",
              body: [
                "Erganzen Sie hier die verbindlichen Aufbewahrungsfristen fur Einreichungen, Freigaben, Benachrichtigungen und Auditdaten.",
                "Benennen Sie ausserdem die Kontaktstelle fur Auskunft, Berichtigung, Loschung, Einschrankung und Widerspruch.",
              ],
            },
          ],
        };
      default:
        return {
          eyebrow: "Barrierefreiheit",
          title: "Erklarung zur Barrierefreiheit",
          description: "Stand der digitalen Barrierefreiheit von Bauhaus Forms.",
          sections: [
            {
              title: "Aktueller Stand",
              body: [
                "Diese Anwendung wird mit dem Ziel betrieben, zentrale Formulare und Freigabeschritte fur moglichst viele Nutzerinnen und Nutzer zuganglich zu machen.",
                "Vor dem Produktivstart sollte hier der reale Prufstatus dokumentiert werden, einschliesslich bekannter Einschrankungen und bereits geplanter Verbesserungen.",
              ],
            },
            {
              title: "Feedback und Kontakt",
              body: [
                "Erganzen Sie eine Kontaktmoglichkeit, uber die Barrieren gemeldet werden konnen.",
                "Falls institutionell erforderlich, sollte auch das formale Durchsetzungsverfahren verlinkt werden.",
              ],
            },
          ],
        };
    }
  }

  switch (page) {
    case "imprint":
      return {
        eyebrow: "Legal",
        title: "Imprint",
        description: "Provider and contact information for the operation of Bauhaus Forms.",
        sections: [
          {
            title: "Responsible organization",
            body: [
              "Bauhaus Forms is operated for administrative and approval workflows at Bauhaus-Universitat Weimar.",
              "Before production launch, replace this placeholder copy with the institution's official provider details, mailing address, and central contact channels.",
            ],
          },
          {
            title: "Contact",
            body: [
              "Add the role mailbox responsible for product questions, privacy requests, and technical incidents.",
              "A functional address such as FormFlow administration is preferable to a personal mailbox.",
            ],
          },
        ],
      };
    case "privacy":
      return {
        eyebrow: "Privacy",
        title: "Privacy notice",
        description: "Overview of personal-data processing in Bauhaus Forms.",
        sections: [
          {
            title: "Purpose and categories",
            body: [
              "Bauhaus Forms processes sign-in, form, approval, and audit data so that university workflows can be handled securely and traceably.",
              "Depending on the form, this may include identity details, contact details, organizational data, and sensitive case information.",
            ],
          },
          {
            title: "Legal basis and recipients",
            body: [
              "Before production launch, this page should list the actual legal bases, internal recipient groups, processors, and any email-delivery providers involved.",
              "It should also explain when elevated access requires explicit justification and how audit logs are used.",
            ],
          },
          {
            title: "Retention and rights",
            body: [
              "Add the binding retention periods for submissions, approvals, notifications, and audit records.",
              "Also include the contact path for access, rectification, erasure, restriction, and objection requests.",
            ],
          },
        ],
      };
    default:
      return {
        eyebrow: "Accessibility",
        title: "Accessibility statement",
        description: "Current accessibility status of Bauhaus Forms.",
        sections: [
          {
            title: "Current status",
            body: [
              "This application is intended to make core form and approval journeys accessible to as many users as possible.",
              "Before production launch, replace this placeholder with the real assessment status, known limitations, and the next planned improvements.",
            ],
          },
          {
            title: "Feedback",
            body: [
              "Add a contact channel for reporting accessibility barriers.",
              "If required by your institution, link the formal enforcement path as well.",
            ],
          },
        ],
      };
  }
}
