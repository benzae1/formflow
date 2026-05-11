"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--canvas)]"
    >
      Sign out
    </button>
  );
}
