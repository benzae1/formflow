import { notFound } from "next/navigation";
import { defaultLocale, type Locale } from "./config";
import { isLocale } from "./config";
import { getDictionary } from "./dictionaries";

export async function getLocaleContext(lang: string) {
  if (!isLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const dictionary = await getDictionary(locale);
  return { locale, dictionary };
}

export async function getLocaleContextOrDefault(lang?: string) {
  if (!lang) {
    const dictionary = await getDictionary(defaultLocale);
    return { locale: defaultLocale, dictionary };
  }

  return getLocaleContext(lang);
}
