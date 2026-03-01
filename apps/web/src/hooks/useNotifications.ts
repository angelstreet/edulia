import { useEffect, useCallback } from 'react';
import { useNotificationStore } from '../stores/notificationStore';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';

export function useNotifications() {
  const { notifications, unreadCount, setNotifications, setUnreadCount, markRead, markAllRead } =
    useNotificationStore();

  const fetch = useCallback(async () => {
    try {
      const { data } = await getNotifications({ per_page: 20 });
      setNotifications(data.data);
      setUnreadCount(data.meta.unread_count);
    } catch {
      // API not connected yet
    }
  }, [setNotifications, setUnreadCount]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
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
