"use client";

import { signOut } from "next-auth/react";
import type { Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";

export function SignOutButton({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: localizePath(locale, "/") })}
      className="bf-btn"
      style={{ minHeight: "100%", borderWidth: 0, borderLeftWidth: 1 }}
    >
      {label}
    </button>
  );
}
