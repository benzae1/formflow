import type { ReactNode } from "react";
import { getLocaleContext } from "@/lib/i18n/server";

export async function generateStaticParams() {
  return [{ lang: "de" }, { lang: "en" }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const { locale } = await getLocaleContext(lang);

  return <div lang={locale}>{children}</div>;
}
