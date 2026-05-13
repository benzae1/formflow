"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { mutationHeaders } from "@/lib/mutation-headers";

export default function OrgSyncButton({ locale = "en" }: { locale?: Locale }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function sync() {
    setPending(true);
    await fetch("/api/org/sync", {
      method: "POST",
      headers: mutationHeaders,
    });
    setPending(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sync}
      disabled={pending}
      className="bf-btn bf-btn-primary disabled:opacity-60"
    >
      {pending ? (locale === "de" ? "Synchronisiert..." : "Syncing...") : locale === "de" ? "Organisationsabgleich starten" : "Run org sync"}
    </button>
  );
}
