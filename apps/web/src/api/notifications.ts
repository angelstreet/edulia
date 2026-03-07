import client from './client';

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function getNotifications(_params: { page?: number; per_page?: number } = {}) {
  return client.get<NotificationData[]>('/v1/notifications');
}

export function markNotificationRead(id: string) {
  return client.patch(`/v1/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return client.post('/v1/notifications/read-all');
}
