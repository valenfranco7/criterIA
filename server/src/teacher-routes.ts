import type { FastifyInstance } from 'fastify';
import { requireRole } from './auth.js';

export async function registerTeacherRoutes(app: FastifyInstance) {
  // GET /api/teacher/courses → { courses: Course[] }
  app.get('/courses', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // POST /api/teacher/courses → CreateCourseRequest
  app.post('/courses', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // GET /api/teacher/courses/:courseId → CourseDetailResponse
  app.get('/courses/:courseId', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // POST /api/teacher/class-plans → ClassPlan
  app.post('/class-plans', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // POST /api/teacher/class-plans/:id/plan → PlanClassResponse
  app.post('/class-plans/:id/plan', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // POST /api/teacher/activities → Activity (status='draft')
  app.post('/activities', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // POST /api/teacher/activities/:id/activate → Activity (status='active')
  app.post('/activities/:id/activate', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // GET /api/teacher/activities → ListActivitiesResponse
  app.get('/activities', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // GET /api/teacher/activities/:id → ActivityDetailResponse
  app.get('/activities/:id', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // POST /api/teacher/activities/:id/generate-summary → ActivitySummary
  app.post('/activities/:id/generate-summary', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // GET /api/teacher/students/:id → TeacherStudentDetail
  app.get('/students/:id', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // POST /api/teacher/students/:id/refresh-summary → StudentProfile
  app.post('/students/:id/refresh-summary', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });

  // GET /api/teacher/sessions/:sessionId → StudentSessionDetail
  app.get('/sessions/:sessionId', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;
    reply.code(501).send({ error: 'not_implemented' });
  });
}
