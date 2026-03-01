import type { Socket } from 'socket.io';

/**
 * Registers notification event handlers on a socket connection.
 * Each authenticated user joins a personal room for targeted notifications.
 */
export function registerNotificationHandlers(socket: Socket): void {
  const userId = socket.data.userId as string;
  const tenantId = socket.data.tenantId as string;

  // Join user-specific room for targeted notifications
  socket.join(`user:${userId}`);

  // Join tenant room for broadcast notifications
  socket.join(`tenant:${tenantId}`);

  console.log(`[Notifications] User ${userId} joined rooms: user:${userId}, tenant:${tenantId}`);

  // Client can mark notifications as read via socket
  socket.on('notification:read', (notificationId: string) => {
    console.log(`[Notifications] User ${userId} read notification ${notificationId}`);
    // In production, this would update the DB via an API call or direct query
  });

  // Client can mark all as read
  socket.on('notification:read-all', () => {
    console.log(`[Notifications] User ${userId} marked all notifications as read`);
  });

  socket.on('disconnect', () => {
    console.log(`[Notifications] User ${userId} disconnected`);
  });
}
