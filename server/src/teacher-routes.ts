import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { requireRole } from './auth.js';
import { db } from './db.js';
import type { Course, User } from './contracts.js';

export async function registerTeacherRoutes(app: FastifyInstance) {
  // GET /api/teacher/courses → { courses: Course[] }
  app.get('/courses', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;

    type CourseWithCount = Course & { student_count: number };

    const rows = db
      .prepare(
        `SELECT c.*,
                COUNT(cs.student_id) AS student_count
         FROM courses c
         LEFT JOIN course_students cs ON cs.course_id = c.id
         WHERE c.teacher_id = ?
         GROUP BY c.id
         ORDER BY c.created_at DESC`
      )
      .all(user.id) as CourseWithCount[];

    return { courses: rows };
  });

  // POST /api/teacher/courses → CreateCourseRequest
  app.post('/courses', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;

    const body = req.body as {
      name?: string;
      year_or_level?: string;
      student_usernames?: string[];
    };

    if (!body.name?.trim() || !body.year_or_level?.trim()) {
      return reply.code(400).send({ error: 'name and year_or_level are required' });
    }

    // Generate slug: "Geografía" + "2do B" → "geografia-2do-b"
    const slugBase = (body.name + '-' + body.year_or_level)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const now = new Date().toISOString();
    const studentUsernames = body.student_usernames ?? [];

    const insertCourse = db.prepare(
      `INSERT INTO courses (id, teacher_id, name, year_or_level, created_at)
       VALUES (?, ?, ?, ?, ?)`
    );
    const insertCourseStudent = db.prepare(
      `INSERT OR IGNORE INTO course_students (course_id, student_id) VALUES (?, ?)`
    );
    const lookupStudent = db.prepare(
      `SELECT id FROM users WHERE id = ? AND role = 'student'`
    );

    const createCourse = db.transaction((courseId: string) => {
      insertCourse.run(courseId, user!.id, body.name!.trim(), body.year_or_level!.trim(), now);
      for (const username of studentUsernames) {
        const student = lookupStudent.get(username) as { id: string } | undefined;
        if (student) insertCourseStudent.run(courseId, student.id);
      }
    });

    // Try primary slug, fall back to slug+nanoid on collision
    let id = slugBase;
    try {
      createCourse(id);
    } catch (err: unknown) {
      const isUnique =
        err instanceof Error && err.message.includes('UNIQUE constraint failed');
      if (isUnique) {
        id = `${slugBase}-${nanoid(4)}`;
        try {
          createCourse(id);
        } catch {
          return reply.code(500).send({ error: 'internal_error' });
        }
      } else {
        return reply.code(500).send({ error: 'internal_error' });
      }
    }

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
    reply.code(201).send({ course });
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

  // GET /api/teacher/students → { students: User[] }
  app.get('/students', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;

    const students = db
      .prepare(`SELECT * FROM users WHERE role = 'student' ORDER BY name ASC`)
      .all() as User[];

    return { students };
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
