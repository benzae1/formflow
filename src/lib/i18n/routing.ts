import { defaultLocale, isLocale, type Locale } from "./config";

export function stripLocaleFromPathname(pathname: string) {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];

  if (maybeLocale && isLocale(maybeLocale)) {
    const nextPath = `/${segments.slice(2).join("/")}`.replace(/\/+/g, "/");
    return nextPath === "/" ? "/" : nextPath.replace(/\/$/, "");
  }

  return pathname || "/";
}

export function localizePath(locale: Locale, pathname: string) {
  const cleanPath = stripLocaleFromPathname(pathname);
  if (cleanPath === "/") {
    return `/${locale}`;
  }

  return `/${locale}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
}

export function switchLocalePath(pathname: string, locale: Locale) {
  return localizePath(locale, pathname);
}

export function getLocaleFromPathname(pathname: string) {
  const segment = pathname.split("/")[1];
  return segment && isLocale(segment) ? segment : defaultLocale;
}

export function maybeLocalizeHref(locale: Locale, href: string | null | undefined) {
  if (!href) return href ?? undefined;

  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return href;
  }

  return localizePath(locale, href);
}
