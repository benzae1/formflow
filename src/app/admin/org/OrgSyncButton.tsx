"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { mutationHeaders } from "@/lib/mutation-headers";

export default function OrgSyncButton() {
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
      className="bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Syncing..." : "Run org sync"}
    </button>
  );
}
