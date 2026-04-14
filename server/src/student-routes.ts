import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { requireRole } from './auth.js';
import { db, jsonParse, jsonStringify } from './db.js';
import {
  createManagedSession,
  sendAndCollect,
  sendCloseAndCollect,
  archiveSession,
} from './socratic/agent.js';
import type {
  Activity,
  ActivityConfig,
  ActivitySession,
  ExtractedIdea,
  Message,
  StudentIdea,
  Course,
  StudentProfile,
  ListStudentActivitiesResponse,
  ListStudentCoursesResponse,
  ListStudentIdeasResponse,
  ListConversationsResponse,
  StudentSessionDetail,
  SessionTurnResponse,
  CloseSessionResponse,
  SendMessageRequest,
} from './contracts.js';

function parseSession(row: Record<string, unknown>): ActivitySession {
  return {
    ...(row as unknown as Omit<ActivitySession, 'extracted_ideas'>),
    extracted_ideas: jsonParse<ExtractedIdea[]>(row.extracted_ideas as string, []),
  };
}

function parseActivity(row: Record<string, unknown>): Activity {
  return {
    ...(row as unknown as Omit<Activity, 'config'>),
    config: jsonParse<ActivityConfig>(row.config as string, {}),
  };
}

function parseMessage(row: Record<string, unknown>): Message {
  return row as unknown as Message;
}

function parseStudentIdea(row: Record<string, unknown>): StudentIdea {
  return {
    ...(row as unknown as Omit<StudentIdea, 'connections'>),
    connections: jsonParse<string[]>(row.connections as string, []),
  };
}

function buildContextMessage(
  student: { id: string; name: string },
  profile: StudentProfile | null,
  previousSessions: Array<{ session_summary: string | null; activity_title: string; completed_at: string | null }>,
  activity: Activity
): string {
  const parts: string[] = [];

  parts.push('## Student Profile');
  parts.push(`Name: ${student.name}`);
  if (profile?.summary) {
    parts.push(`Profile: ${profile.summary}`);
  } else {
    parts.push('Profile: No detailed profile yet. This may be an early session.');
  }

  if (previousSessions.length > 0) {
    parts.push('');
    parts.push('## Previous Session Summaries');
    for (const prev of previousSessions.slice(-5)) {
      const date = prev.completed_at ? new Date(prev.completed_at).toLocaleDateString('es-AR') : '';
      parts.push(`- "${prev.activity_title}" (${date}): ${prev.session_summary ?? 'No summary available.'}`);
    }
  }

  parts.push('');
  parts.push('## Current Activity');
  parts.push(`Title: ${activity.title}`);
  parts.push(`Topic: ${activity.topic}`);
  parts.push(`Objective: ${activity.objective}`);
  if (activity.config.success_criteria) {
    parts.push(`Success criteria: ${activity.config.success_criteria}`);
  }
  if (activity.config.reference_material) {
    parts.push(`Reference material: ${activity.config.reference_material}`);
  }

  parts.push('');
  parts.push('---');
  parts.push('Begin the conversation with the student. Your first message should engage them with the topic in a way that connects to what you know about how they think.');

  return parts.join('\n');
}

export async function registerStudentRoutes(app: FastifyInstance) {
  // GET /api/student/activities
  app.get('/activities', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const courseRows = db
      .prepare('SELECT course_id FROM course_students WHERE student_id = ?')
      .all(user.id) as Array<{ course_id: string }>;

    if (courseRows.length === 0) {
      return reply.send({ items: [] } satisfies ListStudentActivitiesResponse);
    }

    const placeholders = courseRows.map(() => '?').join(',');
    const courseIds = courseRows.map((r) => r.course_id);

    const activities = (
      db
        .prepare(`SELECT * FROM activities WHERE course_id IN (${placeholders}) AND status = 'active' ORDER BY created_at DESC`)
        .all(...courseIds) as Record<string, unknown>[]
    ).map(parseActivity);

    const items = activities.map((activity) => {
      const sessionRow = db
        .prepare('SELECT * FROM activity_sessions WHERE activity_id = ? AND student_id = ? LIMIT 1')
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
      .prepare(
        `SELECT a.* FROM activities a
         JOIN course_students cs ON cs.course_id = a.course_id AND cs.student_id = ?
         WHERE a.id = ? AND a.status = 'active'`
      )
      .get(user.id, activityId) as Record<string, unknown> | undefined;

    if (!activityRow) {
      return reply.code(404).send({ error: 'activity not found or not active' });
    }

    const activity = parseActivity(activityRow);

    const existing = db
      .prepare('SELECT id FROM activity_sessions WHERE activity_id = ? AND student_id = ?')
      .get(activityId, user.id);

    if (existing) {
      return reply.code(409).send({ error: 'session already exists' });
    }

    // Load student context
    const profileRow = db
      .prepare('SELECT * FROM student_profiles WHERE student_id = ?')
      .get(user.id) as { summary: string; updated_at: string } | undefined;

    const previousSessions = db
      .prepare(
        `SELECT s.session_summary, s.completed_at, a.title as activity_title
         FROM activity_sessions s
         JOIN activities a ON a.id = s.activity_id
         WHERE s.student_id = ? AND s.status = 'completed'
         ORDER BY s.completed_at DESC LIMIT 5`
      )
      .all(user.id) as Array<{ session_summary: string | null; activity_title: string; completed_at: string | null }>;

    const contextMessage = buildContextMessage(
      { id: user.id, name: user.name },
      profileRow ? { student_id: user.id, summary: profileRow.summary, updated_at: profileRow.updated_at } : null,
      previousSessions.reverse(),
      activity
    );

    // Create Managed Agent session
    let managedSessionId: string;
    try {
      managedSessionId = await createManagedSession();
    } catch (err) {
      console.error('[start] Failed to create managed session:', err);
      return reply.code(503).send({ error: 'Failed to create agent session' });
    }

    const sessionId = nanoid();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO activity_sessions
       (id, activity_id, student_id, status, current_phase, phase_turn_count, started_at, completed_at, session_summary, teacher_report, extracted_ideas, managed_session_id)
       VALUES (?, ?, ?, 'in_progress', 'anchoring', 0, ?, NULL, NULL, NULL, '[]', ?)`
    ).run(sessionId, activityId, user.id, now, managedSessionId);

    // Send context and get first message
    let firstMessage: string;
    try {
      firstMessage = await sendAndCollect(managedSessionId, contextMessage);
    } catch (err) {
      console.error('[start] Failed to get first message from agent:', err);
      firstMessage = '¿Qué es lo que ya sabés sobre este tema?';
    }

    const msgId = nanoid();
    db.prepare(
      `INSERT INTO messages (id, session_id, turn_index, role, content, phase_at_turn, analyzer_json, created_at)
       VALUES (?, ?, 0, 'assistant', ?, NULL, NULL, ?)`
    ).run(msgId, sessionId, firstMessage, now);

    const session = parseSession(
      db.prepare('SELECT * FROM activity_sessions WHERE id = ?').get(sessionId) as Record<string, unknown>
    );

    return reply.code(201).send({ session });
  });

  // GET /api/student/sessions/:sessionId
  app.get('/sessions/:sessionId', async (req, reply) => {
    const user = await requireRole(req, reply, 'student');
    if (!user) return;

    const { sessionId } = req.params as { sessionId: string };

    const sessionRow = db
      .prepare('SELECT * FROM activity_sessions WHERE id = ? AND student_id = ?')
      .get(sessionId, user.id) as Record<string, unknown> | undefined;

    if (!sessionRow) {
      return reply.code(404).send({ error: 'session not found' });
    }

    const session = parseSession(sessionRow);

    const activityRow = db
      .prepare('SELECT * FROM activities WHERE id = ?')
      .get(session.activity_id) as Record<string, unknown> | undefined;

    if (!activityRow) {
      return reply.code(500).send({ error: 'activity not found for session' });
    }

    const activity = parseActivity(activityRow);

    const messages = (
      db
        .prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY turn_index ASC')
        .all(sessionId) as Record<string, unknown>[]
    ).map(parseMessage);

    return reply.send({ session, activity, messages } satisfies StudentSessionDetail);
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
      .prepare("SELECT * FROM activity_sessions WHERE id = ? AND student_id = ? AND status = 'in_progress'")
      .get(sessionId, user.id) as Record<string, unknown> | undefined;

    if (!sessionRow) {
      return reply.code(404).send({ error: 'session not found or not in progress' });
    }

    const session = parseSession(sessionRow);

    if (!session.managed_session_id) {
      return reply.code(500).send({ error: 'no managed session associated' });
    }

    const now = new Date().toISOString();

    const maxRow = db
      .prepare('SELECT MAX(turn_index) as max_idx FROM messages WHERE session_id = ?')
      .get(sessionId) as { max_idx: number | null };
    const nextIndex = (maxRow.max_idx ?? -1) + 1;

    // Persist student message
    const studentMsgId = nanoid();
    db.prepare(
      `INSERT INTO messages (id, session_id, turn_index, role, content, phase_at_turn, analyzer_json, created_at)
       VALUES (?, ?, ?, 'student', ?, NULL, NULL, ?)`
    ).run(studentMsgId, sessionId, nextIndex, content.trim(), now);

    // Send to Managed Agent and collect response
    let assistantContent: string;
    try {
      assistantContent = await sendAndCollect(session.managed_session_id, content.trim());
    } catch (err) {
      console.error('[messages] Failed to get response from agent:', err);
      return reply.code(502).send({ error: 'Failed to get agent response' });
    }

    const assistantMsgId = nanoid();
    db.prepare(
      `INSERT INTO messages (id, session_id, turn_index, role, content, phase_at_turn, analyzer_json, created_at)
       VALUES (?, ?, ?, 'assistant', ?, NULL, NULL, ?)`
    ).run(assistantMsgId, sessionId, nextIndex + 1, assistantContent, now);

    const updatedSession = parseSession(
      db.prepare('SELECT * FROM activity_sessions WHERE id = ?').get(sessionId) as Record<string, unknown>
    );
    const userMessage = parseMessage(
      db.prepare('SELECT * FROM messages WHERE id = ?').get(studentMsgId) as Record<string, unknown>
    );
    const assistantMessage = parseMessage(
      db.prepare('SELECT * FROM messages WHERE id = ?').get(assistantMsgId) as Record<string, unknown>
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
      .prepare("SELECT * FROM activity_sessions WHERE id = ? AND student_id = ? AND status = 'in_progress'")
      .get(sessionId, user.id) as Record<string, unknown> | undefined;

    if (!sessionRow) {
      return reply.code(404).send({ error: 'session not found or already closed' });
    }

    const session = parseSession(sessionRow);

    if (!session.managed_session_id) {
      return reply.code(500).send({ error: 'no managed session associated' });
    }

    const activityRow = db
      .prepare('SELECT course_id FROM activities WHERE id = ?')
      .get(session.activity_id) as { course_id: string } | undefined;

    if (!activityRow) {
      return reply.code(500).send({ error: 'activity not found' });
    }

    const courseId = activityRow.course_id;

    let result;
    try {
      result = await sendCloseAndCollect(session.managed_session_id);
    } catch (err) {
      console.error('[close] Failed to close managed session:', err);
      result = {
        session_summary: 'La sesión fue completada.',
        teacher_report: '## Observaciones\n\nSesión completada.',
        extracted_ideas: [],
      };
    }

    const now = new Date().toISOString();

    const persist = db.transaction(() => {
      db.prepare(
        `UPDATE activity_sessions
         SET status = 'completed', completed_at = ?, session_summary = ?, teacher_report = ?,
             extracted_ideas = ?
         WHERE id = ?`
      ).run(now, result.session_summary, result.teacher_report, jsonStringify(result.extracted_ideas), sessionId);

      for (const idea of result.extracted_ideas) {
        db.prepare(
          `INSERT INTO student_ideas
           (id, student_id, course_id, activity_id, session_id, text, question_that_triggered_it, connections, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?)`
        ).run(nanoid(), user.id, courseId, session.activity_id, sessionId, idea.text, idea.question_that_triggered_it ?? null, now);
      }
    });
    persist();

    // Archive the managed session (fire and forget)
    archiveSession(session.managed_session_id).catch(() => {});

    const updatedSession = parseSession(
      db.prepare('SELECT * FROM activity_sessions WHERE id = ?').get(sessionId) as Record<string, unknown>
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
        .prepare('SELECT COUNT(*) as count FROM student_ideas WHERE student_id = ? AND course_id = ?')
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
        .prepare('SELECT * FROM student_ideas WHERE student_id = ? AND course_id = ? ORDER BY created_at ASC')
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
        .prepare('SELECT * FROM activity_sessions WHERE student_id = ? ORDER BY started_at DESC')
        .all(user.id) as Record<string, unknown>[]
    ).map(parseSession);

    const items = sessionRows.flatMap((session) => {
      const activityRow = db
        .prepare('SELECT * FROM activities WHERE id = ?')
        .get(session.activity_id) as Record<string, unknown> | undefined;
      if (!activityRow) return [];
      return [{ session, activity: parseActivity(activityRow) }];
    });

    return reply.send({ items } satisfies ListConversationsResponse);
  });
}
