import type { TenantScoped, NotificationType, NotificationChannel } from './common';

export interface Notification extends TenantScoped {
  id: string;
  user_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  sent_at: string;
  created_at: string;
}
