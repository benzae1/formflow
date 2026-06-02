import { LegalPage } from "@/components/ui/LegalPage";
import { getLocaleContext } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/routing";

export default async function LocalizedHelpPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const { locale, dictionary } = await getLocaleContext(lang);
  const isGerman = locale === "de";

  return (
    <LegalPage
      eyebrow={isGerman ? "Support" : "Support"}
      title={isGerman ? "Hilfe" : "Help"}
      description={
        isGerman
          ? "Kontaktpunkt fur Anmeldeprobleme, fachliche Fragen und technische Storungen."
          : "Contact point for sign-in problems, workflow questions, and technical incidents."
      }
      sections={[
        {
          title: isGerman ? "Was hier hinein sollte" : "What belongs here",
          body: [
            isGerman
              ? "Vor dem Produktivstart sollten hier die zustandigen Support-Kanale, Servicezeiten und Eskalationswege dokumentiert werden."
              : "Before production launch, document the responsible support channels, service hours, and escalation paths here.",
            isGerman
              ? "Empfohlen sind eine Funktionsadresse, eine Telefonnummer falls vorhanden und eine kurze Beschreibung, welche Anliegen uber FormFlow-Support bearbeitet werden."
              : "A role mailbox, a phone number if available, and a short description of which requests belong to FormFlow support are recommended.",
          ],
        },
      ]}
      backHref={localizePath(locale, "/signin")}
      backLabel={dictionary.common.back}
    />
  );
}
