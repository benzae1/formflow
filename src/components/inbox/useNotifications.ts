"use client";

import { useEffect, useState } from "react";

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

  return { count, items };
}
