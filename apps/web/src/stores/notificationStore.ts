import { create } from 'zustand';
import type { NotificationData } from '../api/notifications';

interface NotificationState {
  notifications: NotificationData[];
  unreadCount: number;
  setNotifications: (items: NotificationData[]) => void;
  setUnreadCount: (count: number) => void;
  prepend: (item: NotificationData) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (items) => set({ notifications: items }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  prepend: (item) =>
    set((s) => ({
      notifications: [item, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    })),
  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),
  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),
}));
