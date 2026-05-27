import { LegalPage } from "@/components/ui/LegalPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { defaultLocale } from "@/lib/i18n/config";
import { getLegalPageContent } from "@/lib/legal-copy";

export default async function PrivacyPage() {
  const dictionary = await getDictionary(defaultLocale);
  const page = getLegalPageContent("privacy", defaultLocale);

  return (
    <LegalPage
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
      sections={page.sections}
      backHref="/signin"
      backLabel={dictionary.common.back}
    />
  );
}
