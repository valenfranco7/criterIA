import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { requireUser } from './auth.js';
import type { MeResponse } from './contracts.js';
import { registerTeacherRoutes } from './teacher-routes.js';
import { registerStudentRoutes } from './student-routes.js';

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: ['http://localhost:5173'],
    credentials: true,
  });

  app.get('/api/health', async () => ({
    status: 'ok',
    time: new Date().toISOString(),
  }));

  app.get('/api/me', async (req, reply): Promise<MeResponse | void> => {
    const user = await requireUser(req, reply);
    if (!user) return;
    return { user };
  });

  app.register(registerTeacherRoutes, { prefix: '/api/teacher' });
  app.register(registerStudentRoutes, { prefix: '/api/student' });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ port, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
