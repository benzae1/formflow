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

    if (href) {
      router.push(href);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:border-black/20 hover:bg-black/[0.03]"
      >
        Alerts
        {count > 0 ? (
          <span className="ml-2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-bold text-white">
            {count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-3 w-[22rem] rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)] p-3 shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between px-2 py-1">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                Notifications
              </p>
              <p className="text-sm text-[var(--muted)]">
                Latest unread activity across your workflow.
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--line)] px-4 py-6 text-center text-sm text-[var(--muted)]">
                No unread notifications.
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotification(item.id, item.linkUrl)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-left transition hover:border-black/20 hover:bg-[var(--canvas)]"
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                    {item.type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {item.body}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
