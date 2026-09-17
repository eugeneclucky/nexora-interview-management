import type { Server } from "socket.io";

const g = globalThis as unknown as { __io?: Server };

export function setIO(io: Server) {
  g.__io = io;
}

export function getIO(): Server | undefined {
  return g.__io;
}

export function managerRoom(managerId: string) {
  return `manager:${managerId}`;
}

export function userRoom(userId: string) {
  return `user:${userId}`;
}

export const ADMIN_ROOM = "admins";

/** Broadcasts an event to everyone who should see data scoped to the given manager, plus all super admins. */
export function broadcastToManagerScope(managerId: string, event: string, payload: unknown) {
  const io = getIO();
  if (!io) return;
  io.to(managerRoom(managerId)).to(ADMIN_ROOM).emit(event, payload);
}

/** Broadcasts an event to every open session of one specific user (e.g. other
 * tabs/devices they're signed into) -- for changes only they would see, like
 * their own settings, as opposed to team-scoped data. */
export function broadcastToUser(userId: string, event: string, payload: unknown) {
  const io = getIO();
  if (!io) return;
  io.to(userRoom(userId)).emit(event, payload);
}
