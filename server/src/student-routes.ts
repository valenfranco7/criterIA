import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { requireRole } from './auth.js';
import { db, jsonParse, jsonStringify } from './db.js';
import { runTurn } from './socratic/engine.js';
import { closeSession } from './socratic/closer.js';
import type {
  Activity,
  ActivityConfig,
  ActivitySession,
  ExtractedIdea,
  Message,
  StudentIdea,
  Course,
  ListStudentActivitiesResponse,
  ListStudentCoursesResponse,
  ListStudentIdeasResponse,
  ListConversationsResponse,
  StudentSessionDetail,
  SessionTurnResponse,
  CloseSessionResponse,
  SendMessageRequest,
} from './contracts.js';

// Helper: parse a raw DB row into a typed ActivitySession
function parseSession(row: Record<string, unknown>): ActivitySession {
  return {
    ...(row as Omit<ActivitySession, 'extracted_ideas'>),
    extracted_ideas: jsonParse<ExtractedIdea[]>(
      row.extracted_ideas as string,
      []
    ),
  };
}

// Helper: parse a raw DB row into a typed Activity
function parseActivity(row: Record<string, unknown>): Activity {
  return {
    ...(row as Omit<Activity, 'config'>),
    config: jsonParse<ActivityConfig>(row.config as string, {}),
  };
}

// Helper: parse a raw DB row into a typed Message
function parseMessage(row: Record<string, unknown>): Message {
  return row as unknown as Message;
}

// Helper: parse a raw DB row into a typed StudentIdea
function parseStudentIdea(row: Record<string, unknown>): StudentIdea {
  return {
    ...(row as Omit<StudentIdea, 'connections'>),
    connections: jsonParse<string[]>(row.connections as string, []),
  };
}

export async function registerStudentRoutes(app: FastifyInstance) {
  // GET /api/student/activities
  app.get('/activities', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const courseRows = db
      .prepare(
        `SELECT course_id FROM course_students WHERE student_id = ?`
      )
      .all(user.id) as Array<{ course_id: string }>;

    if (courseRows.length === 0) {
      return reply.send({ items: [] } satisfies ListStudentActivitiesResponse);
    }

    const placeholders = courseRows.map(() => '?').join(',');
    const courseIds = courseRows.map((r) => r.course_id);

    const activities = (
      db
        .prepare(
          `SELECT * FROM activities WHERE course_id IN (${placeholders}) AND status = 'active' ORDER BY created_at DESC`
        )
        .all(...courseIds) as Record<string, unknown>[]
    ).map(parseActivity);

    const items = activities.map((activity) => {
      const sessionRow = db
        .prepare(
          `SELECT * FROM activity_sessions WHERE activity_id = ? AND student_id = ? LIMIT 1`
        )
        .get(activity.id, user.id) as Record<string, unknown> | undefined;

      return {
        activity,
        session: sessionRow ? parseSession(sessionRow) : null,
      };
    });

    return reply.send({ items } satisfies ListStudentActivitiesResponse);
  });

  // POST /api/student/activities/:id/start
  app.post('/activities/:id/start', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const { id: activityId } = req.params as { id: string };

    const activityRow = db
      .prepare(`SELECT * FROM activities WHERE id = ? AND status = 'active'`)
      .get(activityId) as Record<string, unknown> | undefined;

    if (!activityRow) {
      return reply.code(404).send({ error: 'activity not found or not active' });
    }

    const activity = parseActivity(activityRow);

    // Check not already started
    const existing = db
      .prepare(
        `SELECT id FROM activity_sessions WHERE activity_id = ? AND student_id = ?`
      )
      .get(activityId, user.id);

    if (existing) {
      return reply.code(409).send({ error: 'session already exists' });
    }

    const sessionId = nanoid();
    const now = new Date().toISOString();

    // First assistant message: use initial_question from config or generic opener
    const firstMessage =
      activity.config.initial_question ??
      '¿Qué es lo que ya sabés sobre este tema?';

    db.prepare(
      `INSERT INTO activity_sessions
       (id, activity_id, student_id, status, current_phase, phase_turn_count, started_at, completed_at, session_summary, teacher_report, extracted_ideas)
       VALUES (?, ?, ?, 'in_progress', 'anchoring', 0, ?, NULL, NULL, NULL, '[]')`
    ).run(sessionId, activityId, user.id, now);

    const msgId = nanoid();
    db.prepare(
      `INSERT INTO messages (id, session_id, turn_index, role, content, phase_at_turn, analyzer_json, created_at)
       VALUES (?, ?, 0, 'assistant', ?, 'anchoring', NULL, ?)`
    ).run(msgId, sessionId, firstMessage, now);

    const session = parseSession(
      db.prepare(`SELECT * FROM activity_sessions WHERE id = ?`).get(sessionId) as Record<string, unknown>
    );

    return reply.code(201).send({ session });
  });

  // GET /api/student/sessions/:sessionId
  app.get('/sessions/:sessionId', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const { sessionId } = req.params as { sessionId: string };

    const sessionRow = db
      .prepare(`SELECT * FROM activity_sessions WHERE id = ? AND student_id = ?`)
      .get(sessionId, user.id) as Record<string, unknown> | undefined;

    if (!sessionRow) {
      return reply.code(404).send({ error: 'session not found' });
    }

    const session = parseSession(sessionRow);

    const activityRow = db
      .prepare(`SELECT * FROM activities WHERE id = ?`)
      .get(session.activity_id) as Record<string, unknown>;

    const activity = parseActivity(activityRow);

    const messages = (
      db
        .prepare(
          `SELECT * FROM messages WHERE session_id = ? ORDER BY turn_index ASC`
        )
        .all(sessionId) as Record<string, unknown>[]
    ).map(parseMessage);

    return reply.send({
      session,
      activity,
      messages,
    } satisfies StudentSessionDetail);
  });

  // POST /api/student/sessions/:sessionId/messages
  app.post('/sessions/:sessionId/messages', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const { sessionId } = req.params as { sessionId: string };
    const { content } = req.body as SendMessageRequest;

    if (!content || content.trim().length === 0) {
      return reply.code(400).send({ error: 'content is required' });
    }

    const sessionRow = db
      .prepare(
        `SELECT * FROM activity_sessions WHERE id = ? AND student_id = ? AND status = 'in_progress'`
      )
      .get(sessionId, user.id) as Record<string, unknown> | undefined;

    if (!sessionRow) {
      return reply.code(404).send({ error: 'session not found or not in progress' });
    }

    const session = parseSession(sessionRow);

    const activityRow = db
      .prepare(`SELECT * FROM activities WHERE id = ?`)
      .get(session.activity_id) as Record<string, unknown>;

    const activity = parseActivity(activityRow);

    // Load last 20 messages for history
    const historyRows = (
      db
        .prepare(
          `SELECT role, content FROM messages
           WHERE session_id = ? AND role IN ('student', 'assistant')
           ORDER BY turn_index DESC LIMIT 20`
        )
        .all(sessionId) as Array<{ role: string; content: string }>
    ).reverse();

    const recentHistory = historyRows.map((m) => ({
      role: m.role as 'student' | 'assistant',
      content: m.content,
    }));

    // Run the two-agent pipeline
    const { assistant_content, analyzer_json, next_phase, next_phase_turn_count } =
      await runTurn(session, content.trim(), recentHistory, activity.config);

    const now = new Date().toISOString();

    // Get current max turn_index
    const maxRow = db
      .prepare(`SELECT MAX(turn_index) as max_idx FROM messages WHERE session_id = ?`)
      .get(sessionId) as { max_idx: number | null };

    const nextIndex = (maxRow.max_idx ?? -1) + 1;

    // Persist student message
    const studentMsgId = nanoid();
    db.prepare(
      `INSERT INTO messages (id, session_id, turn_index, role, content, phase_at_turn, analyzer_json, created_at)
       VALUES (?, ?, ?, 'student', ?, ?, NULL, ?)`
    ).run(studentMsgId, sessionId, nextIndex, content.trim(), session.current_phase, now);

    // Persist assistant message
    const assistantMsgId = nanoid();
    db.prepare(
      `INSERT INTO messages (id, session_id, turn_index, role, content, phase_at_turn, analyzer_json, created_at)
       VALUES (?, ?, ?, 'assistant', ?, ?, ?, ?)`
    ).run(
      assistantMsgId,
      sessionId,
      nextIndex + 1,
      assistant_content,
      next_phase,
      analyzer_json,
      now
    );

    // Update session phase
    db.prepare(
      `UPDATE activity_sessions SET current_phase = ?, phase_turn_count = ? WHERE id = ?`
    ).run(next_phase, next_phase_turn_count, sessionId);

    const updatedSession = parseSession(
      db.prepare(`SELECT * FROM activity_sessions WHERE id = ?`).get(sessionId) as Record<string, unknown>
    );

    const userMessage = parseMessage(
      db.prepare(`SELECT * FROM messages WHERE id = ?`).get(studentMsgId) as Record<string, unknown>
    );
    const assistantMessage = parseMessage(
      db.prepare(`SELECT * FROM messages WHERE id = ?`).get(assistantMsgId) as Record<string, unknown>
    );

    return reply.send({
      user_message: userMessage,
      assistant_message: assistantMessage,
      session: updatedSession,
    } satisfies SessionTurnResponse);
  });

  // POST /api/student/sessions/:sessionId/close
  app.post('/sessions/:sessionId/close', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const { sessionId } = req.params as { sessionId: string };

    const sessionRow = db
      .prepare(
        `SELECT * FROM activity_sessions WHERE id = ? AND student_id = ? AND status = 'in_progress'`
      )
      .get(sessionId, user.id) as Record<string, unknown> | undefined;

    if (!sessionRow) {
      return reply.code(404).send({ error: 'session not found or already closed' });
    }

    const session = parseSession(sessionRow);

    const messages = (
      db
        .prepare(`SELECT * FROM messages WHERE session_id = ? ORDER BY turn_index ASC`)
        .all(sessionId) as Record<string, unknown>[]
    ).map(parseMessage);

    // Get course_id from activity
    const activityRow = db
      .prepare(`SELECT course_id FROM activities WHERE id = ?`)
      .get(session.activity_id) as { course_id: string };

    const courseId = activityRow.course_id;

    // Get previous ideas for this student in this course
    const previousIdeas = (
      db
        .prepare(
          `SELECT * FROM student_ideas WHERE student_id = ? AND course_id = ? ORDER BY created_at ASC`
        )
        .all(user.id, courseId) as Record<string, unknown>[]
    ).map(parseStudentIdea);

    const result = await closeSession(session, messages, previousIdeas);

    const now = new Date().toISOString();

    // Update session
    db.prepare(
      `UPDATE activity_sessions
       SET status = 'completed', completed_at = ?, session_summary = ?, teacher_report = ?,
           extracted_ideas = ?, current_phase = 'consolidation'
       WHERE id = ?`
    ).run(
      now,
      result.session_summary,
      result.teacher_report,
      jsonStringify(result.extracted_ideas),
      sessionId
    );

    // Insert each extracted idea into student_ideas
    for (const idea of result.extracted_ideas) {
      db.prepare(
        `INSERT INTO student_ideas
         (id, student_id, course_id, activity_id, session_id, text, question_that_triggered_it, connections, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?)`
      ).run(
        nanoid(),
        user.id,
        courseId,
        session.activity_id,
        sessionId,
        idea.text,
        idea.question_that_triggered_it,
        now
      );
    }

    const updatedSession = parseSession(
      db.prepare(`SELECT * FROM activity_sessions WHERE id = ?`).get(sessionId) as Record<string, unknown>
    );

    return reply.send({ session: updatedSession } satisfies CloseSessionResponse);
  });

  // GET /api/student/courses
  app.get('/courses', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const courses = db
      .prepare(
        `SELECT c.* FROM courses c
         JOIN course_students cs ON cs.course_id = c.id
         WHERE cs.student_id = ?
         ORDER BY c.name ASC`
      )
      .all(user.id) as Array<Record<string, unknown>>;

    const items = courses.map((course) => {
      const ideaCountRow = db
        .prepare(
          `SELECT COUNT(*) as count FROM student_ideas WHERE student_id = ? AND course_id = ?`
        )
        .get(user.id, course.id) as { count: number };

      return {
        course: course as unknown as Course,
        idea_count: ideaCountRow.count,
      };
    });

    return reply.send({ courses: items } satisfies ListStudentCoursesResponse);
  });

  // GET /api/student/ideas?course_id=X
  app.get('/ideas', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const { course_id } = req.query as { course_id?: string };

    if (!course_id) {
      return reply.code(400).send({ error: 'course_id query param required' });
    }

    const ideas = (
      db
        .prepare(
          `SELECT * FROM student_ideas WHERE student_id = ? AND course_id = ? ORDER BY created_at ASC`
        )
        .all(user.id, course_id) as Record<string, unknown>[]
    ).map(parseStudentIdea);

    return reply.send({ ideas } satisfies ListStudentIdeasResponse);
  });

  // GET /api/student/conversations
  app.get('/conversations', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const sessionRows = (
      db
        .prepare(
          `SELECT * FROM activity_sessions WHERE student_id = ? ORDER BY started_at DESC`
        )
        .all(user.id) as Record<string, unknown>[]
    ).map(parseSession);

    const items = sessionRows.map((session) => {
      const activityRow = db
        .prepare(`SELECT * FROM activities WHERE id = ?`)
        .get(session.activity_id) as Record<string, unknown>;

      return {
        session,
        activity: parseActivity(activityRow),
      };
    });

    return reply.send({ items } satisfies ListConversationsResponse);
  });
}
