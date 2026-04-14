import type { FastifyInstance } from 'fastify';
import { requireRole } from './auth.js';
import { db, jsonParse, jsonStringify } from './db.js';
import { nanoid } from 'nanoid';
import type { CreateActivityRequest } from './contracts.js';
import { runClassAnalyst } from './class-analyst.js';
import { refreshStudentProfile } from './profile-updater.js';
import { requireAnthropic } from './anthropic.js';

export async function registerTeacherRoutes(app: FastifyInstance) {
  // POST /api/teacher/upload — upload file to Anthropic Files API
  app.post('/upload', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;

    const data = await req.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const client = requireAnthropic();
    const buffer = await data.toBuffer();
    const blob = new Blob([buffer], { type: data.mimetype });
    const file = new File([blob], data.filename, { type: data.mimetype });

    try {
      const uploaded = await (client.beta as any).files.upload({
        file,
        purpose: 'agent',
      });
      return reply.send({ file_id: uploaded.id, filename: data.filename });
    } catch (err) {
      console.error('[upload] Failed to upload to Anthropic:', err);
      return reply.code(502).send({ error: 'Failed to upload file' });
    }
  });

  // GET /api/teacher/courses → { courses: Course[] }
  app.get('/courses', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;

    const courses = db
      .prepare('SELECT * FROM courses WHERE teacher_id = ? ORDER BY name')
      .all(user.id);

    reply.send({ courses });
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

    const { courseId } = req.params as { courseId: string };

    const course = db
      .prepare('SELECT * FROM courses WHERE id = ? AND teacher_id = ?')
      .get(courseId, user.id);

    if (!course) {
      return reply.code(404).send({ error: 'course_not_found' });
    }

    const students = db
      .prepare(
        `SELECT u.* FROM users u
         JOIN course_students cs ON cs.student_id = u.id
         WHERE cs.course_id = ?
         ORDER BY u.name`
      )
      .all(courseId);

    const analyticsRow = db
      .prepare('SELECT analysis FROM course_analytics WHERE course_id = ?')
      .get(courseId) as { analysis: string } | undefined;

    const analytics = analyticsRow ? jsonParse(analyticsRow.analysis, null) : null;

    reply.send({ course, students, analytics });
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

  // GET /api/teacher/activities → ListActivitiesResponse
  app.get('/activities', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;

    const rows = db
      .prepare(
        `SELECT
           a.*,
           (SELECT COUNT(*) FROM activity_sessions s
            WHERE s.activity_id = a.id AND s.status = 'completed') AS completed_count,
           (SELECT COUNT(*) FROM activity_sessions s
            WHERE s.activity_id = a.id) AS total_count
         FROM activities a
         WHERE a.teacher_id = ?
         ORDER BY a.created_at DESC`
      )
      .all(user.id) as any[];

    const mapActivity = (row: any) => ({
      ...row,
      config: jsonParse(row.config, {}),
    });

    const pending = rows.filter((r) => r.status === 'draft').map(mapActivity);
    const active = rows.filter((r) => r.status === 'active').map(mapActivity);
    const finished = rows.filter((r) => r.status === 'closed').map(mapActivity);

    reply.send({ pending, active, finished });
  });

  // POST /api/teacher/activities → Activity (status='draft')
  app.post('/activities', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;

    const body = req.body as CreateActivityRequest;
    const id = nanoid(12);
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO activities
         (id, teacher_id, course_id, class_plan_id, title, objective, topic,
          estimated_duration_minutes, status, config, anthropic_file_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`
    ).run(
      id,
      user.id,
      body.course_id,
      body.class_plan_id ?? null,
      body.title,
      body.objective,
      body.topic,
      body.estimated_duration_minutes,
      jsonStringify(body.config ?? {}),
      body.anthropic_file_id ?? null,
      now
    );

    const activity = db
      .prepare('SELECT * FROM activities WHERE id = ?')
      .get(id) as any;

    reply.send({ ...activity, config: jsonParse(activity.config, {}) });
  });

  // POST /api/teacher/activities/:id/activate → Activity (status='active')
  app.post('/activities/:id/activate', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;

    const { id } = req.params as { id: string };

    const activity = db
      .prepare('SELECT * FROM activities WHERE id = ? AND teacher_id = ?')
      .get(id, user.id) as any;

    if (!activity) {
      return reply.code(404).send({ error: 'not_found' });
    }
    if (activity.status !== 'draft') {
      return reply.code(400).send({ error: 'activity_not_draft' });
    }

    db.prepare("UPDATE activities SET status = 'active' WHERE id = ?").run(id);

    // Create not_started sessions for all students in the course
    const students = db
      .prepare(
        'SELECT student_id FROM course_students WHERE course_id = ?'
      )
      .all(activity.course_id) as { student_id: string }[];

    const insertSession = db.prepare(
      `INSERT OR IGNORE INTO activity_sessions
         (id, activity_id, student_id, status, current_phase, phase_turn_count,
          started_at, completed_at, session_summary, teacher_report, extracted_ideas)
       VALUES (?, ?, ?, 'not_started', 'anchoring', 0, NULL, NULL, NULL, NULL, '[]')`
    );

    const insertMany = db.transaction(() => {
      for (const { student_id } of students) {
        insertSession.run(nanoid(12), id, student_id);
      }
    });
    insertMany();

    const updated = db
      .prepare('SELECT * FROM activities WHERE id = ?')
      .get(id) as any;

    reply.send({ ...updated, config: jsonParse(updated.config, {}) });
  });

  // GET /api/teacher/activities/:id → ActivityDetailResponse
  app.get('/activities/:id', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;

    const { id } = req.params as { id: string };

    const activity = db
      .prepare('SELECT * FROM activities WHERE id = ? AND teacher_id = ?')
      .get(id, user.id) as any;

    if (!activity) {
      return reply.code(404).send({ error: 'activity_not_found' });
    }

    const sessionRows = db
      .prepare(
        `SELECT s.*, u.name AS student_name, u.avatar_initials
         FROM activity_sessions s
         JOIN users u ON u.id = s.student_id
         WHERE s.activity_id = ?
         ORDER BY u.name`
      )
      .all(id) as any[];

    const sessions = sessionRows.map((s) => ({
      ...s,
      extracted_ideas: jsonParse(s.extracted_ideas, []),
      difficult_topics: jsonParse(s.difficult_topics, []),
    }));

    const latestSummary =
      (db
        .prepare(
          `SELECT * FROM activity_summaries
           WHERE activity_id = ?
           ORDER BY created_at DESC
           LIMIT 1`
        )
        .get(id) as any) ?? null;

    if (latestSummary) {
      latestSummary.analysis = jsonParse(latestSummary.analysis, null);
    }

    reply.send({
      activity: { ...activity, config: jsonParse(activity.config, {}) },
      sessions,
      latest_summary: latestSummary,
    });
  });

  // POST /api/teacher/activities/:id/generate-summary → ActivitySummary
  app.post('/activities/:id/generate-summary', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;

    const { id: activityId } = req.params as { id: string };

    // Close any open sessions first
    const openSessions = db
      .prepare(
        `SELECT id, managed_session_id FROM activity_sessions
         WHERE activity_id = ? AND status = 'in_progress' AND managed_session_id IS NOT NULL`
      )
      .all(activityId) as Array<{ id: string; managed_session_id: string }>;

    if (openSessions.length > 0) {
      const { sendCloseAndCollect } = await import('./socratic/agent.js');
      const closeResults = await Promise.all(
        openSessions.map(async (s) => {
          try {
            return { id: s.id, managed: s.managed_session_id, result: await sendCloseAndCollect(s.managed_session_id) };
          } catch (err) {
            console.error('[generate-summary] Failed to close session:', err);
            return null;
          }
        })
      );

      const now = new Date().toISOString();
      for (const item of closeResults) {
        if (!item?.result) continue;
        const r = item.result;
        db.prepare(
          `UPDATE activity_sessions
           SET status = 'completed', completed_at = ?, session_summary = ?, teacher_report = ?,
               extracted_ideas = ?, comprehension_pct = ?, difficult_topics = ?
           WHERE id = ?`
        ).run(
          now, r.session_summary, r.teacher_report,
          JSON.stringify(r.extracted_ideas), r.comprehension_pct, JSON.stringify(r.difficult_topics),
          item.id
        );
      }
    }

    let analysisResult;
    try {
      analysisResult = await runClassAnalyst(activityId);
    } catch (err: any) {
      if (err.message === 'no_completed_sessions') {
        return reply.code(400).send({ error: 'No completed sessions to analyze' });
      }
      console.error('[generate-summary] Analyst failed:', err);
      return reply.code(502).send({ error: 'Failed to generate analysis' });
    }

    const summaryId = nanoid();
    const activityRow = db.prepare('SELECT course_id FROM activities WHERE id = ?').get(activityId) as { course_id: string };

    db.prepare(
      `INSERT INTO activity_summaries (id, activity_id, course_id, summary, understanding_avg, analysis, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      summaryId, activityId, activityRow.course_id,
      analysisResult.summary, analysisResult.understanding_avg,
      JSON.stringify(analysisResult.analysis),
      new Date().toISOString()
    );

    // Fire-and-forget: update course analytics
    import('./course-analyst.js').then(({ runCourseAnalyst }) => {
      runCourseAnalyst(activityRow.course_id).catch((err: any) =>
        console.error('[generate-summary] Course analyst failed:', err)
      );
    });

    return reply.send({
      summary: {
        id: summaryId,
        activity_id: activityId,
        course_id: activityRow.course_id,
        summary: analysisResult.summary,
        understanding_avg: analysisResult.understanding_avg,
        analysis: analysisResult.analysis,
        created_at: new Date().toISOString(),
      },
    });
  });

  // POST /api/teacher/activities/:id/finalize → SSE stream with progress
  app.post('/activities/:id/finalize', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;

    const { id: activityId } = req.params as { id: string };

    const activityRow = db
      .prepare('SELECT * FROM activities WHERE id = ? AND teacher_id = ?')
      .get(activityId, user.id) as Record<string, unknown> | undefined;

    if (!activityRow) {
      return reply.code(404).send({ error: 'activity not found' });
    }
    if ((activityRow as any).status !== 'active') {
      return reply.code(400).send({ error: 'activity is not active' });
    }

    // Set up SSE
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const send = (data: { step: string; detail?: string; done?: boolean }) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Close all in-progress sessions one by one
    const openSessions = db
      .prepare(
        `SELECT s.id, s.managed_session_id, u.name as student_name
         FROM activity_sessions s
         JOIN users u ON u.id = s.student_id
         WHERE s.activity_id = ? AND s.status = 'in_progress' AND s.managed_session_id IS NOT NULL`
      )
      .all(activityId) as Array<{ id: string; managed_session_id: string; student_name: string }>;

    if (openSessions.length > 0) {
      const { sendCloseAndCollect } = await import('./socratic/agent.js');

      for (let i = 0; i < openSessions.length; i++) {
        const s = openSessions[i];
        send({ step: `Cerrando sesión de ${s.student_name}...`, detail: `${i + 1}/${openSessions.length}` });

        try {
          const r = await sendCloseAndCollect(s.managed_session_id);
          const now = new Date().toISOString();
          db.prepare(
            `UPDATE activity_sessions
             SET status = 'completed', completed_at = ?, session_summary = ?, teacher_report = ?,
                 extracted_ideas = ?, comprehension_pct = ?, difficult_topics = ?
             WHERE id = ?`
          ).run(
            now, r.session_summary, r.teacher_report,
            JSON.stringify(r.extracted_ideas), r.comprehension_pct, JSON.stringify(r.difficult_topics),
            s.id
          );
        } catch (err) {
          console.error('[finalize] Failed to close session:', err);
        }
      }
    }

    // Generate class analysis
    send({ step: 'Generando análisis de clase...' });
    try {
      const analysisResult = await runClassAnalyst(activityId);

      const summaryId = nanoid();
      const courseId = (activityRow as any).course_id;

      db.prepare(
        `INSERT INTO activity_summaries (id, activity_id, course_id, summary, understanding_avg, analysis, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        summaryId, activityId, courseId,
        analysisResult.summary, analysisResult.understanding_avg,
        JSON.stringify(analysisResult.analysis),
        new Date().toISOString()
      );

      // Fire-and-forget: update course analytics
      import('./course-analyst.js').then(({ runCourseAnalyst }) => {
        runCourseAnalyst(courseId).catch((err: any) =>
          console.error('[finalize] Course analyst failed:', err)
        );
      });
    } catch (err: any) {
      console.error('[finalize] Analyst failed (continuing with close):', err);
    }

    // Mark activity as closed
    db.prepare('UPDATE activities SET status = ? WHERE id = ?').run('closed', activityId);

    send({ step: 'Actividad finalizada', done: true });
    reply.raw.end();
  });

  // GET /api/teacher/students/:id → TeacherStudentDetail
  app.get('/students/:id', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;

    const { id: studentId } = req.params as { id: string };

    // Verify this student is in at least one of the teacher's courses
    const membership = db
      .prepare(
        `SELECT cs.student_id FROM course_students cs
         JOIN courses c ON c.id = cs.course_id
         WHERE c.teacher_id = ? AND cs.student_id = ?
         LIMIT 1`
      )
      .get(user.id, studentId);

    if (!membership) {
      return reply.code(404).send({ error: 'student_not_found' });
    }

    const student = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(studentId) as any;

    const profile =
      (db
        .prepare('SELECT * FROM student_profiles WHERE student_id = ?')
        .get(studentId) as any) ??
      { student_id: studentId, summary: '', updated_at: new Date().toISOString() };

    const sessionRows = db
      .prepare(
        `SELECT s.*, a.title AS activity_title, a.topic AS activity_topic, a.course_id
         FROM activity_sessions s
         JOIN activities a ON a.id = s.activity_id
         WHERE s.student_id = ?
         ORDER BY s.started_at DESC`
      )
      .all(studentId) as any[];

    const sessions = sessionRows.map((s) => ({
      ...s,
      extracted_ideas: jsonParse(s.extracted_ideas, []),
      difficult_topics: jsonParse(s.difficult_topics, []),
    }));

    reply.send({ student, profile, sessions });
  });

  // POST /api/teacher/students/:id/refresh-summary → StudentProfile
  app.post('/students/:id/refresh-summary', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;

    const { id: studentId } = req.params as { id: string };

    const membership = db
      .prepare(
        `SELECT cs.student_id FROM course_students cs
         JOIN courses c ON c.id = cs.course_id
         WHERE c.teacher_id = ? AND cs.student_id = ?
         LIMIT 1`
      )
      .get(user.id, studentId);

    if (!membership) {
      return reply.code(404).send({ error: 'student_not_found' });
    }

    const { summary } = await refreshStudentProfile(studentId);
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO student_profiles (student_id, summary, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(student_id) DO UPDATE SET summary = excluded.summary, updated_at = excluded.updated_at`
    ).run(studentId, summary, now);

    const profile = db
      .prepare('SELECT * FROM student_profiles WHERE student_id = ?')
      .get(studentId);

    reply.send(profile);
  });

  // GET /api/teacher/sessions/:sessionId → StudentSessionDetail
  app.get('/sessions/:sessionId', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;

    const { sessionId } = req.params as { sessionId: string };

    // Get session with its activity, verify teacher owns the activity
    const sessionRow = db
      .prepare(
        `SELECT s.* FROM activity_sessions s
         JOIN activities a ON a.id = s.activity_id
         WHERE s.id = ? AND a.teacher_id = ?`
      )
      .get(sessionId, user.id) as any;

    if (!sessionRow) {
      return reply.code(404).send({ error: 'session_not_found' });
    }

    const session = {
      ...sessionRow,
      extracted_ideas: jsonParse(sessionRow.extracted_ideas, []),
    };

    const activityRow = db
      .prepare('SELECT * FROM activities WHERE id = ?')
      .get(sessionRow.activity_id) as any;

    const activity = { ...activityRow, config: jsonParse(activityRow.config, {}) };

    const messages = db
      .prepare(
        'SELECT * FROM messages WHERE session_id = ? ORDER BY turn_index'
      )
      .all(sessionId);

    reply.send({ session, activity, messages });
  });
}
