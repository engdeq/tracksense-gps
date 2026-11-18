import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { corsOrigins } from '../config/env.js';
import { verifyAccessToken } from '../services/tokenService.js';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers.authorization?.toString().replace('Bearer ', '') ?? '');
      if (!token) return next(new Error('Unauthorized'));
      const user = verifyAccessToken(token);
      socket.data.user = user;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    if (user.role === 'customer' && user.customerId) {
      socket.join(`customer:${user.customerId}`);
    } else {
      socket.join('admins');
    }

    socket.on('subscribe:vehicle', (vehicleId: string) => {
      if (vehicleId) socket.join(`vehicle:${vehicleId}`);
    });

    socket.on('unsubscribe:vehicle', (vehicleId: string) => {
      if (vehicleId) socket.leave(`vehicle:${vehicleId}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function emitVehiclePosition(payload: {
  vehicleId: string;
  customerId?: string | null;
  position: Record<string, unknown>;
  motionStatus?: string;
}) {
  if (!io) return;
  io.to(`vehicle:${payload.vehicleId}`).emit('gps:position', payload);
  if (payload.customerId) {
    io.to(`customer:${payload.customerId}`).emit('gps:position', payload);
  }
  io.to('admins').emit('gps:position', payload);
}
