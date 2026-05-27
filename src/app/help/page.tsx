import { LegalPage } from "@/components/ui/LegalPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { defaultLocale } from "@/lib/i18n/config";

export default async function HelpPage() {
  const dictionary = await getDictionary(defaultLocale);

  return (
    <LegalPage
      eyebrow="Support"
      title="Hilfe"
      description="Kontaktpunkt fur Anmeldeprobleme, fachliche Fragen und technische Storungen."
      sections={[
        {
          title: "Was hier hinein sollte",
          body: [
            "Vor dem Produktivstart sollten hier die zustandigen Support-Kanale, Servicezeiten und Eskalationswege dokumentiert werden.",
            "Empfohlen sind eine Funktionsadresse, eine Telefonnummer falls vorhanden und eine kurze Beschreibung, welche Anliegen uber FormFlow-Support bearbeitet werden.",
          ],
        },
      ]}
      backHref="/signin"
      backLabel={dictionary.common.back}
    />
  );
}
