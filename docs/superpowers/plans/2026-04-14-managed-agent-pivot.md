# Managed Agent Pivot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-agent pipeline (analyzer + tutor + phases) with a single Claude Managed Agent (Opus 4.6) that acts as each student's personal Socrates, using student profiles and session history as context.

**Architecture:** Our Fastify backend proxies REST requests into Managed Agent SSE events. One Agent config (created once), one Environment (created once), one Session per activity-student. The frontend is unchanged (except removing the phase subtitle).

**Tech Stack:** Node/TypeScript/Fastify/better-sqlite3/@anthropic-ai/sdk (latest) — Managed Agents beta API

**Working directory:** `/Users/valenfranco/Desktop/criterIA`
**Server directory:** `/Users/valenfranco/Desktop/criterIA/server`

---

## File Map

| File | Action | What it does |
|---|---|---|
| `server/package.json` | Modify | Upgrade `@anthropic-ai/sdk` to latest |
| `server/src/socratic/analyzer.ts` | Delete | Replaced by Managed Agent |
| `server/src/socratic/tutor.ts` | Delete | Replaced by Managed Agent |
| `server/src/socratic/engine.ts` | Delete | No more phase orchestration |
| `server/src/socratic/closer.ts` | Delete | Replaced by custom tool |
| `server/src/socratic/prompts/analyzer.md` | Delete | No more analyzer |
| `server/src/socratic/prompts/closer.md` | Delete | Closing logic in system prompt |
| `server/src/socratic/prompts/system-tutor.md` | Delete | Replaced by system-socrates.md |
| `server/src/socratic/prompts/system-socrates.md` | Create | System prompt for the Managed Agent |
| `server/src/socratic/agent.ts` | Create | Managed Agent setup + session helpers |
| `server/src/anthropic.ts` | Modify | Remove dead exports, keep `requireAnthropic()` |
| `server/src/schema.sql` | Modify | Add `managed_session_id` column |
| `server/src/contracts.ts` | Modify | Add `managed_session_id` to `ActivitySession` |
| `server/src/student-routes.ts` | Modify | Rewrite /start, /messages, /close to use agent.ts |
| `server/src/seed.ts` | Modify | Update DROP/CREATE for new schema column |
| `src/pages/student/SocraticChat.tsx` | Modify | Remove phase subtitle |

---

## Task 1: Upgrade SDK and delete old pipeline

**Files:**
- Modify: `server/package.json`
- Delete: `server/src/socratic/analyzer.ts`, `server/src/socratic/tutor.ts`, `server/src/socratic/engine.ts`, `server/src/socratic/closer.ts`, `server/src/socratic/prompts/analyzer.md`, `server/src/socratic/prompts/closer.md`, `server/src/socratic/prompts/system-tutor.md`

- [ ] **Step 1: Upgrade the Anthropic SDK**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm install @anthropic-ai/sdk@latest
```

Verify the version is >= 0.85.0: `npm ls @anthropic-ai/sdk`

- [ ] **Step 2: Delete old pipeline files**

```bash
cd /Users/valenfranco/Desktop/criterIA
rm server/src/socratic/analyzer.ts
rm server/src/socratic/tutor.ts
rm server/src/socratic/engine.ts
rm server/src/socratic/closer.ts
rm server/src/socratic/prompts/analyzer.md
rm server/src/socratic/prompts/closer.md
rm server/src/socratic/prompts/system-tutor.md
```

- [ ] **Step 3: Clean up anthropic.ts**

Replace `server/src/anthropic.ts` with:

```ts
import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

export const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

export function requireAnthropic(): Anthropic {
  if (!anthropic) {
    throw new Error(
      'ANTHROPIC_API_KEY not set — complete server/.env before using LLM routes'
    );
  }
  return anthropic;
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: remove old two-agent pipeline, upgrade SDK for Managed Agents"
```

---

## Task 2: Schema + contracts changes

**Files:**
- Modify: `server/src/schema.sql`
- Modify: `server/src/contracts.ts`

- [ ] **Step 1: Add managed_session_id to schema.sql**

In `server/src/schema.sql`, in the `activity_sessions` CREATE TABLE, add the new column after `extracted_ideas`:

```sql
  extracted_ideas TEXT DEFAULT '[]',
  managed_session_id TEXT               -- Anthropic Managed Agent session ID
```

- [ ] **Step 2: Add managed_session_id to contracts.ts**

In `server/src/contracts.ts`, add to the `ActivitySession` interface after `extracted_ideas`:

```ts
  managed_session_id: string | null;
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
```

This will fail because `student-routes.ts` still imports from deleted files. That's expected — we'll fix it in Task 4.

- [ ] **Step 4: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add server/src/schema.sql server/src/contracts.ts
git commit -m "feat: add managed_session_id to activity_sessions schema and contracts"
```

---

## Task 3: System prompt + agent.ts

**Files:**
- Create: `server/src/socratic/prompts/system-socrates.md`
- Create: `server/src/socratic/agent.ts`

- [ ] **Step 1: Write the system prompt**

Create `server/src/socratic/prompts/system-socrates.md`:

```md
# Socrates — Personal Tutor

You are Socrates, a personal tutor for each student. You guide learning through questions — you never give answers directly.

## How you work

- Ask one question at a time. Never two.
- Listen to what the student actually says, not what you expect them to say.
- If the student is stuck, lower the abstraction — use a concrete example, an analogy, a different angle. Don't repeat the same question louder.
- If the student resists or seems frustrated, absorb it. Don't push. Acknowledge what they're feeling, then offer a gentler path in.
- If the student is flowing, go deeper. Build on their momentum. Challenge them when they're ready.
- If the student arrives at an insight, celebrate it briefly — then help them build on it.
- Match the student's pace. Some need time. Some need speed. Read them.

## Tone

Warm, curious, respectful. You speak in Spanish rioplatense (informal "vos"). You sound like a mentor who genuinely cares — not a robot, not a teacher reading from a script. You're interested in what the student thinks. You ask because you want to know, not because you're testing.

## What you know about each student

At the start of each session, you receive the student's cognitive profile and summaries of previous sessions. Use this to:

- Adapt your language and examples to how they understand things
- Reference past insights they've had ("La vez pasada dijiste algo interesante sobre...")
- Avoid patterns that didn't work before
- Build on what they already know

Never mention the profile explicitly. Don't say "according to your profile" or "I see you learn visually." Just know them and act accordingly.

## Rules

- Never give the answer. Ever. Not even if the student begs.
- Never lecture. If you're writing more than 3 sentences, you're lecturing. Stop and ask a question instead.
- One question per turn. Always.
- Don't use bullet points or formatted lists in conversation. Talk naturally.
- Don't use emojis.

## On session close

When told the student is ending the session, use the `submit_session_report` tool with:
- `session_summary`: 2-4 sentences summarizing the session, written for the student
- `teacher_report`: Structured markdown for the teacher with sections: ## Recorrido / ## Ideas clave / ## Observaciones
- `extracted_ideas`: An array of ideas the student produced. These must be the student's own words and thoughts, not yours. Include the question that triggered each idea when possible.
```

- [ ] **Step 2: Write agent.ts**

Create `server/src/socratic/agent.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAnthropic } from '../anthropic.js';
import type { ExtractedIdea } from '../contracts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const systemPrompt = fs.readFileSync(
  path.resolve(__dirname, './prompts/system-socrates.md'),
  'utf-8'
);

// --- Agent + Environment setup (one-time) ---

let _agentId: string | null = process.env.ANTHROPIC_AGENT_ID ?? null;
let _environmentId: string | null = process.env.ANTHROPIC_ENVIRONMENT_ID ?? null;

export async function ensureAgentSetup(): Promise<{ agentId: string; environmentId: string }> {
  const client = requireAnthropic();

  if (!_agentId) {
    const agent = await client.beta.agents.create({
      name: 'Socrates',
      model: 'claude-opus-4-6',
      system: systemPrompt,
      tools: [
        {
          type: 'custom',
          name: 'submit_session_report',
          description:
            'Called when the student ends the session. Submits a structured close report with summary for the student, detailed report for the teacher, and extracted ideas the student produced during the conversation.',
          input_schema: {
            type: 'object',
            properties: {
              session_summary: {
                type: 'string',
                description: '2-4 sentence summary of the session, written for the student',
              },
              teacher_report: {
                type: 'string',
                description:
                  'Structured markdown report for the teacher with ## headers: Recorrido / Ideas clave / Observaciones',
              },
              extracted_ideas: {
                type: 'array',
                description: 'Ideas the student produced during the conversation, in their own words',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string', description: 'The idea, in the student\'s words' },
                    question_that_triggered_it: {
                      type: 'string',
                      description: 'The question that led to this idea',
                    },
                  },
                  required: ['text'],
                },
              },
            },
            required: ['session_summary', 'teacher_report', 'extracted_ideas'],
          },
        },
      ],
    });
    _agentId = agent.id;
    console.log(`[Socrates] Agent created: ${agent.id} (version ${agent.version})`);
    console.log(`[Socrates] Save this to .env as ANTHROPIC_AGENT_ID=${agent.id}`);
  }

  if (!_environmentId) {
    const env = await client.beta.environments.create({
      name: `criteria-env-${Date.now()}`,
      config: {
        type: 'cloud',
        networking: { type: 'unrestricted' },
      },
    });
    _environmentId = env.id;
    console.log(`[Socrates] Environment created: ${env.id}`);
    console.log(`[Socrates] Save this to .env as ANTHROPIC_ENVIRONMENT_ID=${env.id}`);
  }

  return { agentId: _agentId, environmentId: _environmentId };
}

// --- Session helpers ---

export async function createManagedSession(): Promise<string> {
  const client = requireAnthropic();
  const { agentId, environmentId } = await ensureAgentSetup();

  const session = await client.beta.sessions.create({
    agent: agentId,
    environment_id: environmentId,
  });

  return session.id;
}

export async function sendAndCollect(
  managedSessionId: string,
  text: string
): Promise<string> {
  const client = requireAnthropic();

  // Stream-first, then send
  const stream = await client.beta.sessions.events.stream(managedSessionId);

  await client.beta.sessions.events.send(managedSessionId, {
    events: [
      {
        type: 'user.message',
        content: [{ type: 'text', text }],
      },
    ],
  });

  let responseText = '';

  for await (const event of stream) {
    if (event.type === 'agent.message') {
      for (const block of (event as any).content ?? []) {
        if (block.type === 'text') {
          responseText += block.text;
        }
      }
    } else if (event.type === 'session.status_terminated') {
      throw new Error('Managed Agent session terminated unexpectedly');
    } else if (event.type === 'session.status_idle') {
      break;
    }
  }

  return responseText.trim();
}

export interface CloseResult {
  session_summary: string;
  teacher_report: string;
  extracted_ideas: ExtractedIdea[];
}

export async function sendCloseAndCollect(
  managedSessionId: string
): Promise<CloseResult> {
  const client = requireAnthropic();

  const stream = await client.beta.sessions.events.stream(managedSessionId);

  await client.beta.sessions.events.send(managedSessionId, {
    events: [
      {
        type: 'user.message',
        content: [
          {
            type: 'text',
            text: 'El alumno decidió cerrar la sesión. Generá el reporte de cierre usando la herramienta submit_session_report.',
          },
        ],
      },
    ],
  });

  let toolUseEvent: { id: string; input: any } | null = null;
  let fallbackText = '';

  for await (const event of stream) {
    if (event.type === 'agent.custom_tool_use') {
      const ev = event as any;
      toolUseEvent = { id: ev.id, input: ev.input };
    } else if (event.type === 'agent.message') {
      for (const block of (event as any).content ?? []) {
        if (block.type === 'text') fallbackText += block.text;
      }
    } else if (event.type === 'session.status_terminated') {
      throw new Error('Managed Agent session terminated during close');
    } else if (event.type === 'session.status_idle') {
      const ev = event as any;
      if (ev.stop_reason?.type === 'requires_action' && toolUseEvent) {
        // Agent called our custom tool — send confirmation and continue
        await client.beta.sessions.events.send(managedSessionId, {
          events: [
            {
              type: 'user.custom_tool_result',
              custom_tool_use_id: toolUseEvent.id,
              content: [{ type: 'text', text: 'Report received successfully.' }],
            },
          ],
        });
        continue; // wait for next idle (end_turn)
      }
      break; // end_turn — done
    }
  }

  if (toolUseEvent?.input) {
    const input = toolUseEvent.input;
    return {
      session_summary: input.session_summary ?? '',
      teacher_report: input.teacher_report ?? '',
      extracted_ideas: (input.extracted_ideas ?? []).map(
        (i: { text: string; question_that_triggered_it?: string }) => ({
          text: i.text,
          question_that_triggered_it: i.question_that_triggered_it ?? null,
        })
      ),
    };
  }

  // Fallback: agent didn't use the tool (shouldn't happen)
  console.error('[Socrates] Close did not trigger submit_session_report tool. Falling back.');
  return {
    session_summary: fallbackText || 'La sesión fue completada.',
    teacher_report: '## Observaciones\n\nSesión completada.',
    extracted_ideas: [],
  };
}

export async function archiveSession(managedSessionId: string): Promise<void> {
  const client = requireAnthropic();
  try {
    await client.beta.sessions.archive(managedSessionId);
  } catch (err) {
    console.error('[Socrates] Failed to archive session:', err);
  }
}
```

- [ ] **Step 3: Typecheck (will still fail due to student-routes.ts)**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
```

Expected: errors only from `student-routes.ts` (still imports old files). `agent.ts` may have type issues with the beta API — note them for the next step.

- [ ] **Step 4: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add server/src/socratic/prompts/system-socrates.md server/src/socratic/agent.ts
git commit -m "feat: add Managed Agent setup and system prompt for Socrates"
```

---

## Task 4: Rewrite student-routes.ts

**Files:**
- Modify: `server/src/student-routes.ts`

This is the main task. The three LLM endpoints (`/start`, `/messages`, `/close`) change internally to use `agent.ts`. The read-only endpoints (`/activities`, `/sessions/:id`, `/courses`, `/ideas`, `/conversations`) stay the same.

- [ ] **Step 1: Rewrite student-routes.ts**

Replace the entire file with:

```ts
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

// Build the context message injected as the first user.message in a managed session
function buildContextMessage(
  student: { id: string; name: string },
  profile: StudentProfile | null,
  previousSessions: Array<{ session_summary: string | null; activity_title: string; completed_at: string | null }>,
  activity: Activity
): string {
  const parts: string[] = [];

  parts.push(`## Student Profile`);
  parts.push(`Name: ${student.name}`);
  if (profile?.summary) {
    parts.push(`Profile: ${profile.summary}`);
  } else {
    parts.push(`Profile: No detailed profile yet. This may be an early session.`);
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
      .prepare(`SELECT course_id FROM course_students WHERE student_id = ?`)
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
        .prepare(`SELECT * FROM activity_sessions WHERE activity_id = ? AND student_id = ? LIMIT 1`)
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
      .prepare(`SELECT id FROM activity_sessions WHERE activity_id = ? AND student_id = ?`)
      .get(activityId, user.id);

    if (existing) {
      return reply.code(409).send({ error: 'session already exists' });
    }

    // Load student context
    const profileRow = db
      .prepare(`SELECT * FROM student_profiles WHERE student_id = ?`)
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
      .get(session.activity_id) as Record<string, unknown> | undefined;

    if (!activityRow) {
      return reply.code(500).send({ error: 'activity not found for session' });
    }

    const activity = parseActivity(activityRow);

    const messages = (
      db
        .prepare(`SELECT * FROM messages WHERE session_id = ? ORDER BY turn_index ASC`)
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
      .prepare(`SELECT * FROM activity_sessions WHERE id = ? AND student_id = ? AND status = 'in_progress'`)
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
      .prepare(`SELECT MAX(turn_index) as max_idx FROM messages WHERE session_id = ?`)
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
      .prepare(`SELECT * FROM activity_sessions WHERE id = ? AND student_id = ? AND status = 'in_progress'`)
      .get(sessionId, user.id) as Record<string, unknown> | undefined;

    if (!sessionRow) {
      return reply.code(404).send({ error: 'session not found or already closed' });
    }

    const session = parseSession(sessionRow);

    if (!session.managed_session_id) {
      return reply.code(500).send({ error: 'no managed session associated' });
    }

    const activityRow = db
      .prepare(`SELECT course_id FROM activities WHERE id = ?`)
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
        .prepare(`SELECT COUNT(*) as count FROM student_ideas WHERE student_id = ? AND course_id = ?`)
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
        .prepare(`SELECT * FROM student_ideas WHERE student_id = ? AND course_id = ? ORDER BY created_at ASC`)
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
        .prepare(`SELECT * FROM activity_sessions WHERE student_id = ? ORDER BY started_at DESC`)
        .all(user.id) as Record<string, unknown>[]
    ).map(parseSession);

    const items = sessionRows.flatMap((session) => {
      const activityRow = db
        .prepare(`SELECT * FROM activities WHERE id = ?`)
        .get(session.activity_id) as Record<string, unknown> | undefined;
      if (!activityRow) return [];
      return [{ session, activity: parseActivity(activityRow) }];
    });

    return reply.send({ items } satisfies ListConversationsResponse);
  });
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
```

Expected: may have type errors on `agent.ts` due to beta API types. Fix any issues — the beta types may need `as any` in some places since the SDK typings for Managed Agents events are evolving.

- [ ] **Step 3: Reset DB and smoke test**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run db:reset && npm run dev
```

In another terminal:
```bash
curl -s http://localhost:3001/api/health
curl -s -H "x-user-id: sofiam" http://localhost:3001/api/student/activities
curl -s -H "x-user-id: sofiam" http://localhost:3001/api/student/courses
```

All should return 200 with JSON.

- [ ] **Step 4: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add server/src/student-routes.ts
git commit -m "feat: rewrite student routes to use Managed Agent instead of two-agent pipeline"
```

---

## Task 5: Fix SocraticChat phase subtitle

**Files:**
- Modify: `src/pages/student/SocraticChat.tsx`

- [ ] **Step 1: Replace the phase subtitle with activity topic**

In `src/pages/student/SocraticChat.tsx`, find this block (around line 177):

```tsx
            <p className="text-xs text-muted-foreground font-body capitalize">
              {session?.current_phase ?? ""}
            </p>
```

Replace with:

```tsx
            <p className="text-xs text-muted-foreground font-body">
              {activity?.topic ?? ""}
            </p>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add src/pages/student/SocraticChat.tsx
git commit -m "fix: replace phase subtitle with activity topic in SocraticChat"
```

---

## Task 6: Update .env and add setup instructions

**Files:**
- Modify: `server/.env.example`

- [ ] **Step 1: Update .env.example**

Replace `server/.env.example` with:

```
PORT=3001
DATABASE_URL=./criteria.db
ANTHROPIC_API_KEY=your-api-key-here

# Managed Agent IDs (auto-created on first run if empty)
ANTHROPIC_AGENT_ID=
ANTHROPIC_ENVIRONMENT_ID=
```

- [ ] **Step 2: Add the new vars to the real .env**

Add to `server/.env` (the real one, not committed):

```
ANTHROPIC_AGENT_ID=
ANTHROPIC_ENVIRONMENT_ID=
```

Leave them empty — the server will auto-create on first run and log the IDs.

- [ ] **Step 3: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add server/.env.example
git commit -m "chore: update .env.example with Managed Agent env vars"
```

---

## End-to-End Test

After all tasks are done:

```bash
# 1. Reset DB
cd /Users/valenfranco/Desktop/criterIA/server && npm run db:reset

# 2. Start server (first run creates Agent + Environment, logs IDs)
npm run dev
# Copy the logged ANTHROPIC_AGENT_ID and ANTHROPIC_ENVIRONMENT_ID to .env
# Restart server so it reads the IDs from env instead of creating new ones

# 3. Start frontend
cd /Users/valenfranco/Desktop/criterIA && bun run dev

# 4. Test flow
# - Open http://localhost:5173
# - Pick sofiam via UserSwitcher
# - Go to Actividades → click an activity
# - SocraticChat opens with Opus's first message (personalized for Sofia)
# - Send 2-3 messages — get real socratic responses
# - Click "Cerrar actividad" → redirects to Conversaciones with summary
# - Go to Mi Camino → ideas from the session visible
```

The critical moment: the first message from the agent should feel personalized — referencing Sofia's learning style, adapted to how she thinks. That's the whole point of this pivot.
