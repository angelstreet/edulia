import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export interface JwtPayload {
  sub: string;
  tenant_id: string;
  roles: string[];
  permissions: string[];
  exp: number;
}

/**
 * Socket.IO middleware that validates JWT tokens on connection.
 * Expects token in auth.token or as a query parameter.
 */
export function authMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const token =
    (socket.handshake.auth as { token?: string }).token ||
    (socket.handshake.query.token as string | undefined);

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    socket.data.userId = payload.sub;
    socket.data.tenantId = payload.tenant_id;
    socket.data.roles = payload.roles;
    socket.data.permissions = payload.permissions;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}
