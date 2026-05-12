"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/components/inbox/useNotifications";
import { mutationHeaders } from "@/lib/mutation-headers";
import type { Locale } from "@/lib/i18n/config";
import { maybeLocalizeHref } from "@/lib/i18n/routing";

export function NotificationPanel({
  locale,
  labels,
}: {
  locale: Locale;
  labels: {
    button: string;
    panelTitle: string;
    empty: string;
  };
}) {
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
    if (href) router.push(maybeLocalizeHref(locale, href) ?? href);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="bf-btn"
        style={{ minHeight: "100%", borderWidth: 0, gap: 8 }}
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
        {labels.button}
        {count > 0 && (
          <span
            style={{
              color: "var(--muted-strong)",
              fontVariantNumeric: "tabular-nums",
              marginLeft: 2,
            }}
          >
            ({count})
          </span>
        )}
      </button>

      {open && (
        <div className="bf-panel absolute right-0 z-20 mt-1 w-80">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <p className="bf-kicker">
              {labels.panelTitle}
            </p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                {labels.empty}
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotification(item.id, item.linkUrl)}
                  className="w-full px-4 py-3 text-left hover:bg-[var(--canvas-soft)]"
                >
                  <p className="bf-kicker">
                    {item.type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{item.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--muted-strong)]">{item.body}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
