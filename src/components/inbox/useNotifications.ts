"use client";

import { useEffect, useState } from "react";
import { getMutationHeaders } from "@/lib/mutation-headers";

type NotificationItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export function useNotifications() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchUnread() {
      const res = await fetch("/api/notifications/unread");
      if (!res.ok) return;

      const json = (await res.json()) as {
        count: number;
        items: NotificationItem[];
      };

      if (!cancelled) {
        setCount(json.count);
        setItems(json.items);
      }
    }

    fetchUnread();

    const id = setInterval(fetchUnread, 30_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function markAllRead() {
    if (count === 0) return;
    const mutationHeaders = await getMutationHeaders();
    await fetch("/api/notifications/read-all", {
      method: "POST",
      headers: mutationHeaders,
    });
    setCount(0);
    setItems((current) =>
      current.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() })),
    );
  }

  return { count, items, markAllRead };
}
