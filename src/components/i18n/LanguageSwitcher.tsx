"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { switchLocalePath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";

export function LanguageSwitcher({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <div
      aria-label={dictionary.language.label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 16px",
        borderLeft: "1px solid var(--line)",
      }}
    >
      {(["de", "en"] as const).map((targetLocale) => {
        const href = `${switchLocalePath(pathname, targetLocale)}${query ? `?${query}` : ""}`;
        const active = targetLocale === locale;

        return (
          <Link
            key={targetLocale}
            href={href}
            prefetch={false}
            style={{
              textDecoration: "none",
              color: "var(--ink)",
              fontSize: 12,
              fontWeight: active ? 800 : 600,
              letterSpacing: ".08em",
              opacity: active ? 1 : 0.55,
            }}
          >
            {dictionary.language[targetLocale]}
          </Link>
        );
      })}
    </div>
  );
}
