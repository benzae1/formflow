"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/components/inbox/useNotifications";
import { mutationHeaders } from "@/lib/mutation-headers";

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { count, items } = useNotifications();

  async function openNotification(id: string, href?: string | null) {
    await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      headers: mutationHeaders,
    });
    setOpen(false);
    router.refresh();
    if (href) router.push(href);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "transparent",
          border: "none",
          fontFamily: "inherit",
          cursor: "pointer",
          color: "var(--ink)",
          padding: "0 18px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          height: "100%",
        }}
      >
        {count > 0 && (
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              background: "#D22630",
            }}
          />
        )}
        Alerts
        {count > 0 && (
          <span
            style={{
              color: "var(--muted)",
              fontVariantNumeric: "tabular-nums",
              marginLeft: 2,
            }}
          >
            ({count})
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-80 border border-[var(--line-strong)] bg-white">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[var(--muted)]">
              Notifications
            </p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                No unread notifications.
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotification(item.id, item.linkUrl)}
                  className="w-full px-4 py-3 text-left hover:bg-[var(--canvas)]"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted)]">
                    {item.type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{item.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">{item.body}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
