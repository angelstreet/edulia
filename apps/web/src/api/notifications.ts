import client from './client';

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function getNotifications(params: { page?: number; per_page?: number } = {}) {
  return client.get<{ data: NotificationData[]; meta: { total: number; unread_count: number } }>(
    '/v1/notifications',
    { params },
  );
}

export function markNotificationRead(id: string) {
  return client.patch(`/v1/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return client.post('/v1/notifications/read-all');
}
