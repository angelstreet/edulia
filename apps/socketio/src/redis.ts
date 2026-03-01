import Redis from 'ioredis';
import type { Server } from 'socket.io';

// Parse from REDIS_URL if available (format: redis://:password@host:port/db)
const _redisUrl = process.env.REDIS_URL || process.env.SOCKETIO_REDIS_URL || '';
const _parsed = _redisUrl ? new URL(_redisUrl) : null;
const REDIS_HOST = process.env.REDIS_HOST || (_parsed?.hostname) || '192.168.0.122';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || (_parsed?.port) || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || (_parsed?.password ? decodeURIComponent(_parsed.password) : undefined);

let subscriber: Redis | null = null;

/**
 * Creates a Redis subscriber that listens for notification events
 * and forwards them to connected Socket.IO clients.
 */
export function setupRedisSubscriber(io: Server): Redis {
  subscriber = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    retryStrategy(times) {
      const delay = Math.min(times * 500, 5000);
      console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
    maxRetriesPerRequest: null,
  });

  subscriber.on('connect', () => {
    console.log(`[Redis] Connected to ${REDIS_HOST}:${REDIS_PORT}`);
  });

  subscriber.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  // Subscribe to notification channel
  subscriber.subscribe('notifications', (err) => {
    if (err) {
      console.error('[Redis] Failed to subscribe to notifications:', err.message);
    } else {
      console.log('[Redis] Subscribed to notifications channel');
    }
  });

  // Forward messages to Socket.IO rooms
  subscriber.on('message', (channel, message) => {
    if (channel === 'notifications') {
      try {
        const data = JSON.parse(message) as {
          tenant_id: string;
          user_id: string;
          notification: unknown;
        };

        // Emit to the specific user's room
        const room = `user:${data.user_id}`;
        io.to(room).emit('notification:new', data.notification);
      } catch (err) {
        console.error('[Redis] Failed to parse notification message:', err);
      }
    }
  });

  return subscriber;
}

export function getSubscriber(): Redis | null {
  return subscriber;
}
