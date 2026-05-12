"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      style={{
        background: "transparent",
        border: "none",
        fontFamily: "inherit",
        cursor: "pointer",
        color: "var(--ink)",
        padding: "0 18px",
        display: "flex",
        alignItems: "center",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        height: "100%",
      }}
    >
      Sign out
    </button>
  );
}
