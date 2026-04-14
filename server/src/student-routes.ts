import type { FastifyInstance } from 'fastify';
import { requireRole } from './auth.js';

export async function registerStudentRoutes(app: FastifyInstance) {
  // GET /api/student/activities → ListStudentActivitiesResponse
  app.get('/activities', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // POST /api/student/activities/:id/start → ActivitySession + primer mensaje
  app.post('/activities/:id/start', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // GET /api/student/sessions/:sessionId → StudentSessionDetail
  app.get('/sessions/:sessionId', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // POST /api/student/sessions/:sessionId/messages → SessionTurnResponse
  app.post('/sessions/:sessionId/messages', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // POST /api/student/sessions/:sessionId/close → CloseSessionResponse
  app.post('/sessions/:sessionId/close', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // GET /api/student/courses → ListStudentCoursesResponse
  app.get('/courses', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // GET /api/student/ideas?course_id=X → ListStudentIdeasResponse
  app.get('/ideas', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // GET /api/student/conversations → ListConversationsResponse
  app.get('/conversations', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });
}
