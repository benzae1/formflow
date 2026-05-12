import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";

export function getRequestLocale(request: Request): Locale {
  const value = request.headers.get("x-formflow-locale");
  return value && isLocale(value) ? value : defaultLocale;
}
