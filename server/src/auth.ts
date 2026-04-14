import type { FastifyReply, FastifyRequest } from 'fastify';
import { db } from './db.js';
import type { User, UserRole } from './contracts.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

export async function requireUser(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<User | null> {
  const userId = req.headers['x-user-id'];
  if (typeof userId !== 'string' || userId.length === 0) {
    reply.code(401).send({ error: 'missing x-user-id header' });
    return null;
  }
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
    | User
    | undefined;
  if (!row) {
    reply.code(401).send({ error: 'unknown user' });
    return null;
  }
  req.user = row;
  return row;
}

export async function requireRole(
  req: FastifyRequest,
  reply: FastifyReply,
  role: UserRole
): Promise<User | null> {
  const user = await requireUser(req, reply);
  if (!user) return null;
  if (user.role !== role) {
    reply.code(403).send({ error: `role ${role} required` });
    return null;
  }
  return user;
}
