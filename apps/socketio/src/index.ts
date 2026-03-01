import { createServer } from 'http';
import { Server } from 'socket.io';
import { authMiddleware } from './auth.js';
import { setupRedisSubscriber } from './redis.js';
import { registerNotificationHandlers } from './handlers/notifications.js';

const PORT = parseInt(process.env.SOCKETIO_PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const httpServer = createServer((_req, res) => {
  // Health check endpoint
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'healthy', service: 'socketio' }));
});

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

// JWT authentication middleware
io.use(authMiddleware);

// Connection handler
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id} (user: ${socket.data.userId})`);

  // Register handlers
  registerNotificationHandlers(socket);
});

// Set up Redis pub/sub for cross-process events
setupRedisSubscriber(io);

httpServer.listen(PORT, () => {
  console.log(`[Socket.IO] Server listening on port ${PORT}`);
  console.log(`[Socket.IO] CORS origin: ${CORS_ORIGIN}`);
});
