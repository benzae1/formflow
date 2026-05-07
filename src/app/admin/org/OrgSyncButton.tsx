"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OrgSyncButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function sync() {
    setPending(true);
    await fetch("/api/org/sync", { method: "POST" });
    setPending(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sync}
      disabled={pending}
      className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Syncing..." : "Run org sync"}
    </button>
  );
}
