"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavGroup } from "@/lib/navigation";

export function SidebarNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav style={{ padding: "32px 0" }}>
      {groups.map((group, gi) => (
        <div key={group.group}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: "var(--muted)",
              padding: gi === 0 ? "0 24px 12px" : "24px 24px 12px",
            }}
          >
            {group.group}
          </div>
          {group.items.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 24px",
                  textDecoration: "none",
                  color: "var(--ink)",
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  borderLeft: isActive
                    ? "3px solid var(--accent)"
                    : "3px solid transparent",
                  marginLeft: "-1px",
                  background: isActive ? "var(--canvas)" : "transparent",
                  transition: "background 150ms",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLAnchorElement).style.background =
                      "var(--canvas)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLAnchorElement).style.background =
                      "transparent";
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
