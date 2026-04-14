import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { requireRole } from './auth.js';
import { db, jsonParse, jsonStringify } from './db.js';
import type {
  Activity,
  ActivityConfig,
  ActivitySession,
  ExtractedIdea,
  Message,
} from './contracts.js';
import { requireAnthropic } from './anthropic.js';
import { runTurn } from './socratic/engine.js';
import { closeSession } from './socratic/closer.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function parseActivity(raw: Activity & { config: string }): Activity {
  return { ...raw, config: jsonParse<ActivityConfig>(raw.config as unknown as string, {}) };
}

function parseSession(raw: ActivitySession & { extracted_ideas: string }): ActivitySession {
  return { ...raw, extracted_ideas: jsonParse<ExtractedIdea[]>(raw.extracted_ideas as unknown as string, []) };
}

// ── routes ────────────────────────────────────────────────────────────────────

export async function registerStudentRoutes(app: FastifyInstance) {
  // GET /api/student/activities → ListStudentActivitiesResponse
  app.get('/activities', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const rawActivities = db
      .prepare(
        `SELECT a.*
         FROM activities a
         JOIN course_students cs ON cs.course_id = a.course_id
         WHERE cs.student_id = ? AND a.status = 'active'
         ORDER BY a.created_at DESC`
      )
      .all(user.id) as Array<Activity & { config: string }>;

    const items = rawActivities.map(raw => {
      const activity = parseActivity(raw);

      const rawSession = db
        .prepare(
          `SELECT * FROM activity_sessions
           WHERE activity_id = ? AND student_id = ?
           ORDER BY started_at DESC LIMIT 1`
        )
        .get(raw.id, user.id) as (ActivitySession & { extracted_ideas: string }) | undefined;

      return {
        activity,
        session: rawSession ? parseSession(rawSession) : null,
      };
    });

    return { items };
  });

  // POST /api/student/activities/:id/start → StudentSessionDetail
  app.post('/activities/:id/start', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const { id } = req.params as { id: string };

    const rawActivity = db
      .prepare(`SELECT * FROM activities WHERE id = ? AND status = 'active'`)
      .get(id) as (Activity & { config: string }) | undefined;

    if (!rawActivity) {
      return reply.code(404).send({ error: 'activity not found or not active' });
    }

    const enrolled = db
      .prepare(`SELECT 1 FROM course_students WHERE course_id = ? AND student_id = ?`)
      .get(rawActivity.course_id, user.id);

    if (!enrolled) {
      return reply.code(403).send({ error: 'not enrolled in this course' });
    }

    const activity = parseActivity(rawActivity);

    // Return existing session if any
    let rawSession = db
      .prepare(
        `SELECT * FROM activity_sessions
         WHERE activity_id = ? AND student_id = ?
         ORDER BY started_at DESC LIMIT 1`
      )
      .get(id, user.id) as (ActivitySession & { extracted_ideas: string }) | undefined;

    if (!rawSession) {
      const sessionId = nanoid();
      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO activity_sessions
           (id, activity_id, student_id, status, current_phase, phase_turn_count, started_at, extracted_ideas)
         VALUES (?, ?, ?, 'in_progress', 'anchoring', 0, ?, '[]')`
      ).run(sessionId, id, user.id, now);

      const openingMessage =
        activity.config.initial_question ??
        '¿Qué sabés sobre este tema? Contame lo que se te ocurra.';

      db.prepare(
        `INSERT INTO messages (id, session_id, turn_index, role, content, phase_at_turn, created_at)
         VALUES (?, ?, 0, 'assistant', ?, 'anchoring', ?)`
      ).run(nanoid(), sessionId, openingMessage, now);

      rawSession = db
        .prepare(`SELECT * FROM activity_sessions WHERE id = ?`)
        .get(sessionId) as ActivitySession & { extracted_ideas: string };
    }

    const session = parseSession(rawSession);

    const messages = db
      .prepare(`SELECT * FROM messages WHERE session_id = ? ORDER BY turn_index ASC`)
      .all(rawSession.id) as Message[];

    return { session, activity, messages };
  });

  // GET /api/student/sessions/:sessionId → StudentSessionDetail
  app.get('/sessions/:sessionId', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const { sessionId } = req.params as { sessionId: string };

    const rawSession = db
      .prepare(`SELECT * FROM activity_sessions WHERE id = ? AND student_id = ?`)
      .get(sessionId, user.id) as (ActivitySession & { extracted_ideas: string }) | undefined;

    if (!rawSession) return reply.code(404).send({ error: 'session not found' });

    const session = parseSession(rawSession);

    const rawActivity = db
      .prepare(`SELECT * FROM activities WHERE id = ?`)
      .get(rawSession.activity_id) as (Activity & { config: string }) | undefined;

    if (!rawActivity) return reply.code(500).send({ error: 'activity not found' });

    const activity = parseActivity(rawActivity);

    const messages = db
      .prepare(`SELECT * FROM messages WHERE session_id = ? ORDER BY turn_index ASC`)
      .all(sessionId) as Message[];

    return { session, activity, messages };
  });

  // POST /api/student/sessions/:sessionId/messages → SessionTurnResponse
  app.post('/sessions/:sessionId/messages', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const { sessionId } = req.params as { sessionId: string };
    const body = req.body as { content?: string };

    if (!body.content?.trim()) {
      return reply.code(400).send({ error: 'content is required' });
    }

    try {
      requireAnthropic();
    } catch {
      return reply.code(503).send({ error: 'LLM not configured — set ANTHROPIC_API_KEY in server/.env' });
    }

    const rawSession = db
      .prepare(`SELECT * FROM activity_sessions WHERE id = ? AND student_id = ?`)
      .get(sessionId, user.id) as (ActivitySession & { extracted_ideas: string }) | undefined;

    if (!rawSession) return reply.code(404).send({ error: 'session not found' });
    if (rawSession.status !== 'in_progress') {
      return reply.code(400).send({ error: 'session is not in progress' });
    }

    const session = parseSession(rawSession);

    const rawActivity = db
      .prepare(`SELECT * FROM activities WHERE id = ?`)
      .get(session.activity_id) as (Activity & { config: string }) | undefined;

    if (!rawActivity) return reply.code(500).send({ error: 'activity not found' });

    const activityConfig = jsonParse<ActivityConfig>(rawActivity.config as unknown as string, {});

    // Last 10 non-system messages for context
    const allMessages = db
      .prepare(
        `SELECT role, content FROM messages
         WHERE session_id = ? AND role != 'system'
         ORDER BY turn_index ASC`
      )
      .all(sessionId) as Array<{ role: string; content: string }>;

    const recentHistory = allMessages.slice(-10).map(m => ({
      role: m.role as 'student' | 'assistant',
      content: m.content,
    }));

    const turnResult = await runTurn(
      session,
      body.content.trim(),
      recentHistory,
      activityConfig
    );

    const now = new Date().toISOString();
    const nextTurnIndex = allMessages.length; // student goes here
    const studentMsgId = nanoid();
    const assistantMsgId = nanoid();

    db.prepare(
      `INSERT INTO messages (id, session_id, turn_index, role, content, phase_at_turn, created_at)
       VALUES (?, ?, ?, 'student', ?, ?, ?)`
    ).run(studentMsgId, sessionId, nextTurnIndex, body.content.trim(), session.current_phase, now);

    db.prepare(
      `INSERT INTO messages (id, session_id, turn_index, role, content, phase_at_turn, analyzer_json, created_at)
       VALUES (?, ?, ?, 'assistant', ?, ?, ?, ?)`
    ).run(
      assistantMsgId, sessionId, nextTurnIndex + 1,
      turnResult.assistant_content, turnResult.next_phase,
      turnResult.analyzer_json, now
    );

    db.prepare(
      `UPDATE activity_sessions SET current_phase = ?, phase_turn_count = ? WHERE id = ?`
    ).run(turnResult.next_phase, turnResult.next_phase_turn_count, sessionId);

    const updatedRaw = db
      .prepare(`SELECT * FROM activity_sessions WHERE id = ?`)
      .get(sessionId) as ActivitySession & { extracted_ideas: string };

    return {
      user_message: db.prepare(`SELECT * FROM messages WHERE id = ?`).get(studentMsgId) as Message,
      assistant_message: db.prepare(`SELECT * FROM messages WHERE id = ?`).get(assistantMsgId) as Message,
      session: parseSession(updatedRaw),
    };
  });

  // POST /api/student/sessions/:sessionId/close → CloseSessionResponse
  app.post('/sessions/:sessionId/close', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const { sessionId } = req.params as { sessionId: string };

    const rawSession = db
      .prepare(`SELECT * FROM activity_sessions WHERE id = ? AND student_id = ?`)
      .get(sessionId, user.id) as (ActivitySession & { extracted_ideas: string }) | undefined;

    if (!rawSession) return reply.code(404).send({ error: 'session not found' });

    // Already closed — return as-is
    if (rawSession.status !== 'in_progress') {
      return { session: parseSession(rawSession) };
    }

    const session = parseSession(rawSession);

    const rawActivity = db
      .prepare(`SELECT course_id FROM activities WHERE id = ?`)
      .get(session.activity_id) as { course_id: string } | undefined;

    const courseId = rawActivity?.course_id ?? '';
    const now = new Date().toISOString();

    let closeResult;
    try {
      requireAnthropic();
      closeResult = await closeSession(session);
    } catch {
      closeResult = {
        session_summary: 'Actividad completada.',
        teacher_report: 'El estudiante completó la actividad.',
        extracted_ideas: [] as ExtractedIdea[],
      };
    }

    // Persist extracted ideas
    for (const idea of closeResult.extracted_ideas) {
      db.prepare(
        `INSERT INTO student_ideas
           (id, student_id, course_id, activity_id, session_id, text, question_that_triggered_it, connections, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?)`
      ).run(
        nanoid(), user.id, courseId, session.activity_id,
        sessionId, idea.text, idea.question_that_triggered_it ?? null, now
      );
    }

    db.prepare(
      `UPDATE activity_sessions
       SET status = 'completed', completed_at = ?, session_summary = ?, teacher_report = ?, extracted_ideas = ?
       WHERE id = ?`
    ).run(now, closeResult.session_summary, closeResult.teacher_report, jsonStringify(closeResult.extracted_ideas), sessionId);

    const updatedRaw = db
      .prepare(`SELECT * FROM activity_sessions WHERE id = ?`)
      .get(sessionId) as ActivitySession & { extracted_ideas: string };

    return { session: parseSession(updatedRaw) };
  });

  // GET /api/student/courses → ListStudentCoursesResponse
  app.get('/courses', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const rows = db
      .prepare(
        `SELECT c.id, c.teacher_id, c.name, c.year_or_level, c.created_at,
                COUNT(DISTINCT si.id) AS idea_count
         FROM courses c
         JOIN course_students cs ON cs.course_id = c.id
         LEFT JOIN student_ideas si ON si.course_id = c.id AND si.student_id = ?
         WHERE cs.student_id = ?
         GROUP BY c.id
         ORDER BY c.created_at DESC`
      )
      .all(user.id, user.id) as Array<{
        id: string; teacher_id: string; name: string;
        year_or_level: string; created_at: string; idea_count: number;
      }>;

    const courses = rows.map(row => ({
      course: {
        id: row.id,
        teacher_id: row.teacher_id,
        name: row.name,
        year_or_level: row.year_or_level,
        created_at: row.created_at,
      },
      idea_count: Number(row.idea_count),
    }));

    return { courses };
  });

  // GET /api/student/ideas?course_id=X → ListStudentIdeasResponse
  app.get('/ideas', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const { course_id } = req.query as { course_id?: string };

    const rawIdeas = course_id
      ? db.prepare(
          `SELECT * FROM student_ideas WHERE student_id = ? AND course_id = ? ORDER BY created_at DESC`
        ).all(user.id, course_id)
      : db.prepare(
          `SELECT * FROM student_ideas WHERE student_id = ? ORDER BY created_at DESC`
        ).all(user.id);

    const ideas = (rawIdeas as Array<Record<string, unknown>>).map(idea => ({
      ...idea,
      connections: jsonParse<string[]>(idea.connections as string, []),
    }));

    return { ideas };
  });

  // GET /api/student/conversations → ListConversationsResponse
  app.get('/conversations', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const rows = db
      .prepare(
        `SELECT
           s.id, s.activity_id, s.student_id, s.status, s.current_phase,
           s.phase_turn_count, s.started_at, s.completed_at, s.session_summary,
           s.teacher_report, s.extracted_ideas,
           a.id AS act_id, a.teacher_id, a.course_id, a.class_plan_id,
           a.title AS act_title, a.objective, a.topic,
           a.estimated_duration_minutes, a.status AS act_status,
           a.config AS act_config, a.created_at AS act_created_at
         FROM activity_sessions s
         JOIN activities a ON a.id = s.activity_id
         WHERE s.student_id = ?
         ORDER BY COALESCE(s.started_at, s.id) DESC`
      )
      .all(user.id) as Array<Record<string, unknown>>;

    const items = rows.map(row => ({
      session: {
        id: row.id,
        activity_id: row.activity_id,
        student_id: row.student_id,
        status: row.status,
        current_phase: row.current_phase,
        phase_turn_count: row.phase_turn_count,
        started_at: row.started_at,
        completed_at: row.completed_at,
        session_summary: row.session_summary,
        teacher_report: row.teacher_report,
        extracted_ideas: jsonParse<ExtractedIdea[]>(row.extracted_ideas as string, []),
      } as ActivitySession,
      activity: {
        id: row.act_id,
        teacher_id: row.teacher_id,
        course_id: row.course_id,
        class_plan_id: row.class_plan_id,
        title: row.act_title,
        objective: row.objective,
        topic: row.topic,
        estimated_duration_minutes: row.estimated_duration_minutes,
        status: row.act_status,
        config: jsonParse<ActivityConfig>(row.act_config as string, {}),
        created_at: row.act_created_at,
      } as Activity,
    }));

    return { items };
  });
}
