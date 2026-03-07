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

export function getUnreadCount() {
  return client.get<{ count: number }>('/v1/notifications/unread-count');
}

export function markNotificationRead(id: string) {
  return client.patch(`/v1/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return client.post('/v1/notifications/read-all');
}

// SSE connection pattern:
// The real-time stream is consumed via the native EventSource browser API, not axios.
// EventSource does not support custom headers (e.g. Authorization: Bearer <token>).
// The backend SSE endpoint at GET /api/v1/notifications/stream therefore accepts the
// JWT via a `?token=` query parameter as a fallback for EventSource clients.
// If the backend does not yet support ?token=, the onerror handler in useNotifications
// will catch the failure and automatically degrade to 30-second polling via setInterval.
