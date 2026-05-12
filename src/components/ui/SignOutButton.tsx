"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="bf-btn"
      style={{ minHeight: "100%", borderWidth: 0, borderLeftWidth: 1 }}
    >
      Sign out
    </button>
  );
}
