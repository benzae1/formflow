"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:border-black/20 hover:bg-black/[0.03]"
    >
      Sign out
    </button>
  );
}
