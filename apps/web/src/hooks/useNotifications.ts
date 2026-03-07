import { useEffect, useCallback, useRef } from 'react';
import { useNotificationStore } from '../stores/notificationStore';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';
import { useAuthStore } from '../stores/authStore';

const SSE_URL = `${import.meta.env.VITE_API_URL || ''}/api/v1/notifications/stream`;

export function useNotifications() {
  const { notifications, unreadCount, setNotifications, setUnreadCount, prepend, markRead, markAllRead } =
    useNotificationStore();
  const token = useAuthStore((s) => s.accessToken);
  const esRef = useRef<EventSource | null>(null);

  const fetch = useCallback(async () => {
    try {
      const { data } = await getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read_at).length);
    } catch {
      // ignore
    }
  }, [setNotifications, setUnreadCount]);

  // SSE connection
  useEffect(() => {
    if (!token) return;

    // EventSource doesn't support Authorization header natively.
    // Pass token as query param — backend must accept ?token= too.
    // If not supported, fall back to polling.
    let es: EventSource;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    try {
      es = new EventSource(`${SSE_URL}?token=${token}`);
      esRef.current = es;

      es.onopen = () => {
        // SSE connected — initial fetch to populate
        fetch();
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected') return; // heartbeat
          // Push new notification into store
          prepend({
            id: data.id,
            type: data.type,
            title: data.title,
            body: data.body ?? null,
            link: data.link ?? null,
            read_at: null,
            created_at: new Date().toISOString(),
          });
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        // SSE failed — close and fall back to polling
        es.close();
        if (!fallbackInterval) {
          fetch();
          fallbackInterval = setInterval(fetch, 30000);
        }
      };
    } catch {
      // EventSource not supported — fall back to polling
      fetch();
      fallbackInterval = setInterval(fetch, 30000);
    }

    return () => {
      esRef.current?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [token, fetch, prepend]);

  // Initial fetch on mount regardless of SSE status
  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      try {
        await markNotificationRead(id);
        markRead(id);
      } catch {
        // ignore
      }
    },
    [markRead],
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      markAllRead();
    } catch {
      // ignore
    }
  }, [markAllRead]);

  return {
    notifications,
    unreadCount,
    markRead: handleMarkRead,
    markAllRead: handleMarkAllRead,
    refresh: fetch,
  };
}
