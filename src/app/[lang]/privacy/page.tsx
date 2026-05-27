import { LegalPage } from "@/components/ui/LegalPage";
import { getLocaleContext } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/routing";
import { getLegalPageContent } from "@/lib/legal-copy";

export default async function LocalizedPrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const { locale, dictionary } = await getLocaleContext(lang);
  const page = getLegalPageContent("privacy", locale);

  return (
    <LegalPage
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
      sections={page.sections}
      backHref={localizePath(locale, "/signin")}
      backLabel={dictionary.common.back}
    />
  );
}
