# Student Side Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full student experience — socratic engine backend + all student API routes + frontend wiring — replacing all mockData usage with real API calls.

**Architecture:** Two-agent pipeline per turn: Haiku analyzer classifies pedagogical state → Sonnet tutor generates the socratic question. Engine orchestrates both, applies phase transitions, persists to SQLite. Frontend pages use `apiFetch()` from `src/lib/api.ts` with `x-user-id` header.

**Tech Stack:** Node/TypeScript/Fastify/better-sqlite3/@anthropic-ai/sdk (server) · React/Vite/TypeScript/Tailwind/shadcn (frontend) · nanoid for IDs · prompt caching on all LLM system prompts.

**Server runs on:** `http://localhost:3001` · Frontend on `http://localhost:5173`  
**Restart server after each backend task:** `cd server && npm run dev`  
**Reset DB if needed:** `cd server && npm run db:reset`

---

## File Map

| File | Action | What it does |
|---|---|---|
| `server/src/anthropic.ts` | Modify | Fix model ID defaults |
| `server/src/socratic/analyzer.ts` | Modify | Implement `runAnalyzer` with Haiku 4.5 |
| `server/src/socratic/tutor.ts` | Modify | Implement `runTutor` with Sonnet 4.6 |
| `server/src/socratic/engine.ts` | Modify | Implement `runTurn` — orchestrates analyzer + tutor + phase logic |
| `server/src/socratic/closer.ts` | Modify | Implement `closeSession` with Sonnet 4.6 |
| `server/src/student-routes.ts` | Modify | Implement all 8 student endpoints |
| `src/pages/student/SocraticChat.tsx` | Modify | Wire to real API — real chat, Pensando..., close |
| `src/pages/student/StudentActivities.tsx` | Modify | Replace mockData with fetch |
| `src/pages/student/StudentHome.tsx` | Modify | Replace mockData with fetch |
| `src/pages/student/MyPath.tsx` | Modify | Tabs by course, dynamic positions, dynamic counts |
| `src/pages/student/Conversations.tsx` | Modify | Replace mockData with fetch |

---

## Task 1: Fix model IDs in anthropic.ts

**Files:**
- Modify: `server/src/anthropic.ts`

- [ ] **Step 1: Update model defaults to latest IDs**

Replace the file content:

```ts
import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

export const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

export const MODEL_TUTOR =
  process.env.ANTHROPIC_MODEL_TUTOR ?? 'claude-sonnet-4-6';
export const MODEL_ANALYZER =
  process.env.ANTHROPIC_MODEL_ANALYZER ?? 'claude-haiku-4-5-20251001';

export function requireAnthropic(): Anthropic {
  if (!anthropic) {
    throw new Error(
      'ANTHROPIC_API_KEY not set — complete server/.env before using LLM routes'
    );
  }
  return anthropic;
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add server/src/anthropic.ts
git commit -m "fix: update Claude model IDs to latest versions"
```

---

## Task 2: Implement analyzer.ts

**Files:**
- Modify: `server/src/socratic/analyzer.ts`

The analyzer calls Haiku at temp=0. It receives the last student message + recent chat history + current phase. Returns structured JSON with `resistance_level`, `blockage_level`, `phase_action`. Uses prompt caching on the system block (the prompt file is static, ideal for caching).

- [ ] **Step 1: Implement runAnalyzer**

Replace the entire file:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAnthropic, MODEL_ANALYZER } from '../anthropic.js';
import type { Phase } from '../contracts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface AnalyzerOutput {
  resistance_level: 0 | 1 | 2 | 3;
  blockage_level: 0 | 1 | 2 | 3;
  phase_action: 'stay' | 'advance' | 'retreat';
}

export interface AnalyzerInput {
  current_phase: Phase;
  recent_history: Array<{ role: 'student' | 'assistant'; content: string }>;
  student_message: string;
}

const analyzerPrompt = fs.readFileSync(
  path.resolve(__dirname, './prompts/analyzer.md'),
  'utf-8'
);

export async function runAnalyzer(input: AnalyzerInput): Promise<AnalyzerOutput> {
  const client = requireAnthropic();

  const historyText = input.recent_history
    .map((m) => `${m.role === 'student' ? 'Alumno' : 'Tutor'}: ${m.content}`)
    .join('\n');

  const userContent = `Fase actual: ${input.current_phase}

Historial reciente:
${historyText || '(sin historial previo)'}

Último mensaje del alumno:
${input.student_message}`;

  const response = await client.messages.create({
    model: MODEL_ANALYZER,
    max_tokens: 256,
    temperature: 0,
    system: [
      {
        type: 'text',
        text: analyzerPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userContent }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as AnalyzerOutput;
    // Validate shape
    if (
      typeof parsed.resistance_level !== 'number' ||
      typeof parsed.blockage_level !== 'number' ||
      !['stay', 'advance', 'retreat'].includes(parsed.phase_action)
    ) {
      throw new Error('invalid shape');
    }
    return parsed;
  } catch {
    // Fallback: conservative defaults so the turn doesn't fail
    return { resistance_level: 0, blockage_level: 0, phase_action: 'stay' };
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add server/src/socratic/analyzer.ts
git commit -m "feat: implement socratic analyzer with Haiku 4.5"
```

---

## Task 3: Implement tutor.ts

**Files:**
- Modify: `server/src/socratic/tutor.ts`

The tutor calls Sonnet at temp=0.7. System prompt = `system-tutor.md` (cached) + dynamic phase context + analyzer notes injected as informative context. The student's recent messages become the conversation history.

- [ ] **Step 1: Implement runTutor**

Replace the entire file:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAnthropic, MODEL_TUTOR } from '../anthropic.js';
import type { Phase } from '../contracts.js';
import type { AnalyzerOutput } from './analyzer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface TutorInput {
  current_phase: Phase;
  recent_history: Array<{ role: 'student' | 'assistant'; content: string }>;
  student_message: string;
  analyzer_notes: AnalyzerOutput;
  activity_config: {
    initial_question?: string;
    success_criteria?: string;
    agent_tone?: string;
    reference_material?: string;
  };
}

const baseSystemPrompt = fs.readFileSync(
  path.resolve(__dirname, './prompts/system-tutor.md'),
  'utf-8'
);

export async function runTutor(input: TutorInput): Promise<string> {
  const client = requireAnthropic();

  const phaseContext = `\n\n## Contexto de esta sesión\n\nFase actual: **${input.current_phase}**\n\nSeñales del analyzer (orientativas, no mandatorias):\n- resistance_level: ${input.analyzer_notes.resistance_level}/3\n- blockage_level: ${input.analyzer_notes.blockage_level}/3\n- phase_action sugerido: ${input.analyzer_notes.phase_action}\n\nSi el mensaje literal del alumno no confirma estas señales, ignoralas y respondé al texto.`;

  const configContext = [
    input.activity_config.success_criteria
      ? `\nCriterio de éxito de esta actividad: ${input.activity_config.success_criteria}`
      : '',
    input.activity_config.agent_tone
      ? `\nTono sugerido por el docente: ${input.activity_config.agent_tone}`
      : '',
    input.activity_config.reference_material
      ? `\nMaterial de referencia: ${input.activity_config.reference_material}`
      : '',
  ]
    .filter(Boolean)
    .join('');

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...input.recent_history.map((m) => ({
      role: (m.role === 'student' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: input.student_message },
  ];

  const response = await client.messages.create({
    model: MODEL_TUTOR,
    max_tokens: 512,
    temperature: 0.7,
    system: [
      {
        type: 'text',
        text: baseSystemPrompt + phaseContext + configContext,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return text.trim();
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add server/src/socratic/tutor.ts
git commit -m "feat: implement socratic tutor with Sonnet 4.6 and prompt caching"
```

---

## Task 4: Implement engine.ts

**Files:**
- Modify: `server/src/socratic/engine.ts`

The engine orchestrates: load recent history → call analyzer → call tutor → compute next phase/turn_count → return everything for the route to persist.

- [ ] **Step 1: Implement runTurn**

Replace the entire file:

```ts
import type { ActivitySession, Phase, ActivityConfig } from '../contracts.js';
import { runAnalyzer } from './analyzer.js';
import { runTutor } from './tutor.js';

export const PHASE_ORDER: Phase[] = [
  'anchoring',
  'exploration',
  'tension',
  'consolidation',
];

export const PHASE_HARD_CAP = 8;

export function nextPhase(current: Phase): Phase {
  const i = PHASE_ORDER.indexOf(current);
  return PHASE_ORDER[Math.min(i + 1, PHASE_ORDER.length - 1)];
}

export function previousPhase(current: Phase): Phase {
  const i = PHASE_ORDER.indexOf(current);
  return PHASE_ORDER[Math.max(i - 1, 0)];
}

export async function runTurn(
  session: ActivitySession,
  studentMessage: string,
  recentHistory: Array<{ role: 'student' | 'assistant'; content: string }>,
  activityConfig: ActivityConfig
): Promise<{
  assistant_content: string;
  analyzer_json: string;
  next_phase: Phase;
  next_phase_turn_count: number;
}> {
  // 1. Analyzer: classify pedagogical state
  const analyzerOutput = await runAnalyzer({
    current_phase: session.current_phase,
    recent_history: recentHistory,
    student_message: studentMessage,
  });

  // 2. Tutor: generate socratic response
  const assistantContent = await runTutor({
    current_phase: session.current_phase,
    recent_history: recentHistory,
    student_message: studentMessage,
    analyzer_notes: analyzerOutput,
    activity_config: activityConfig,
  });

  // 3. Phase transition logic
  let nextPhaseValue = session.current_phase;
  let nextPhaseTurnCount = session.phase_turn_count + 1;

  const forcedAdvance = session.phase_turn_count >= PHASE_HARD_CAP;
  const action = forcedAdvance ? 'advance' : analyzerOutput.phase_action;

  if (action === 'advance') {
    nextPhaseValue = nextPhase(session.current_phase);
    nextPhaseTurnCount = 0;
  } else if (action === 'retreat') {
    nextPhaseValue = previousPhase(session.current_phase);
    nextPhaseTurnCount = 0;
  }
  // 'stay' → keep current phase, increment turn count (already done above)

  return {
    assistant_content: assistantContent,
    analyzer_json: JSON.stringify(analyzerOutput),
    next_phase: nextPhaseValue,
    next_phase_turn_count: nextPhaseTurnCount,
  };
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add server/src/socratic/engine.ts
git commit -m "feat: implement socratic engine with phase transition logic"
```

---

## Task 5: Implement closer.ts

**Files:**
- Modify: `server/src/socratic/closer.ts`

The closer calls Sonnet to generate a session summary, teacher report, and extract ideas from the conversation. It receives the full conversation and previous student ideas for the same course (to allow the LLM to note connections in the report).

- [ ] **Step 1: Implement closeSession**

Replace the entire file:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAnthropic, MODEL_TUTOR } from '../anthropic.js';
import type { ActivitySession, Message, StudentIdea, ExtractedIdea } from '../contracts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface CloseResult {
  session_summary: string;
  teacher_report: string;
  extracted_ideas: ExtractedIdea[];
}

const closerPrompt = fs.readFileSync(
  path.resolve(__dirname, './prompts/closer.md'),
  'utf-8'
);

export async function closeSession(
  session: ActivitySession,
  messages: Message[],
  previousIdeas: StudentIdea[]
): Promise<CloseResult> {
  const client = requireAnthropic();

  const conversationText = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'student' ? 'Alumno' : 'Tutor'}: ${m.content}`)
    .join('\n');

  const previousIdeasText =
    previousIdeas.length > 0
      ? `\n\nIdeas previas del alumno en esta materia:\n${previousIdeas.map((i) => `- ${i.text}`).join('\n')}`
      : '\n\n(Sin ideas previas del alumno en esta materia)';

  const userContent = `Conversación completa:\n${conversationText}${previousIdeasText}`;

  const response = await client.messages.create({
    model: MODEL_TUTOR,
    max_tokens: 1024,
    temperature: 0.3,
    system: [
      {
        type: 'text',
        text: closerPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userContent }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      session_summary: string;
      teacher_report: string;
      extracted_ideas: Array<{ text: string; question_that_triggered_it?: string }>;
    };
    return {
      session_summary: parsed.session_summary ?? '',
      teacher_report: parsed.teacher_report ?? '',
      extracted_ideas: (parsed.extracted_ideas ?? []).map((i) => ({
        text: i.text,
        question_that_triggered_it: i.question_that_triggered_it ?? null,
      })),
    };
  } catch {
    return {
      session_summary: 'La sesión fue completada.',
      teacher_report: '## Observaciones\n\nSesión completada.',
      extracted_ideas: [],
    };
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add server/src/socratic/closer.ts
git commit -m "feat: implement session closer with idea extraction"
```

---

## Task 6: Implement student-routes.ts

**Files:**
- Modify: `server/src/student-routes.ts`

8 endpoints. All DB queries use synchronous better-sqlite3. ID generation uses nanoid.

- [ ] **Step 1: Write the full implementation**

Replace the entire file:

```ts
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
  return row as Message;
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
        course: course as unknown as import('./contracts.js').Course,
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
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Start the server and run smoke tests**

In one terminal: `cd /Users/valenfranco/Desktop/criterIA/server && npm run dev`

Then (seed first if you haven't): `npm run db:reset`

```bash
# Health check
curl http://localhost:3001/api/health

# Me endpoint (sofiam is a student)
curl -H "x-user-id: sofiam" http://localhost:3001/api/me

# Student activities (should list active activities for sofiam's courses)
curl -H "x-user-id: sofiam" http://localhost:3001/api/student/activities

# Student courses
curl -H "x-user-id: sofiam" http://localhost:3001/api/student/courses
```

Expected: all return 200 with JSON (not 501).

- [ ] **Step 4: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add server/src/student-routes.ts
git commit -m "feat: implement all student API routes"
```

---

## Task 7: Wire SocraticChat.tsx to real API

**Files:**
- Modify: `src/pages/student/SocraticChat.tsx`

The route is `/estudiante/actividad/:activityId`. On mount: find existing session from the activities list, or call start. On send: POST messages. On close: POST close → navigate to conversations. `showIdeas` panel stays but defaults to `false` (MVP).

- [ ] **Step 1: Rewrite SocraticChat.tsx**

Replace the entire file:

```tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type {
  ListStudentActivitiesResponse,
  StudentSessionDetail,
  SessionTurnResponse,
  CloseSessionResponse,
  Message,
  Activity,
  ActivitySession,
} from "../../../server/src/contracts";

const SocraticChat = () => {
  const navigate = useNavigate();
  const { activityId } = useParams<{ activityId: string }>();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [session, setSession] = useState<ActivitySession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  // On mount: load or start session
  useEffect(() => {
    if (!activityId) return;

    async function init() {
      try {
        // Find the activity + existing session
        const list = await apiFetch<ListStudentActivitiesResponse>('/api/student/activities');
        const item = list.items.find((i) => i.activity.id === activityId);

        if (!item) {
          setError("Actividad no encontrada.");
          setLoading(false);
          return;
        }

        setActivity(item.activity);

        if (item.session && item.session.status !== 'not_started') {
          // Load existing session with messages
          const detail = await apiFetch<StudentSessionDetail>(
            `/api/student/sessions/${item.session.id}`
          );
          setSession(detail.session);
          setMessages(detail.messages.filter((m) => m.role !== 'system'));
        } else {
          // Start a new session
          const started = await apiFetch<{ session: ActivitySession }>(
            `/api/student/activities/${activityId}/start`,
            { method: 'POST' }
          );
          setSession(started.session);
          // Fetch messages after start
          const detail = await apiFetch<StudentSessionDetail>(
            `/api/student/sessions/${started.session.id}`
          );
          setMessages(detail.messages.filter((m) => m.role !== 'system'));
        }
      } catch (e) {
        setError("Error al cargar la actividad.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [activityId]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const handleSend = async () => {
    if (!input.trim() || thinking || !session) return;

    const text = input.trim();
    setInput("");
    setThinking(true);

    // Optimistically add student message to UI
    const tempStudentMsg: Message = {
      id: `temp-${Date.now()}`,
      session_id: session.id,
      turn_index: messages.length,
      role: "student",
      content: text,
      phase_at_turn: session.current_phase,
      analyzer_json: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempStudentMsg]);

    try {
      const result = await apiFetch<SessionTurnResponse>(
        `/api/student/sessions/${session.id}/messages`,
        { method: 'POST', body: { content: text } }
      );
      // Replace temp messages with real ones from server
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempStudentMsg.id),
        result.user_message,
        result.assistant_message,
      ]);
      setSession(result.session);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempStudentMsg.id));
      setError("Error al enviar el mensaje. Intentá de nuevo.");
    } finally {
      setThinking(false);
    }
  };

  const handleClose = async () => {
    if (!session || closing) return;
    setClosing(true);
    try {
      await apiFetch<CloseSessionResponse>(
        `/api/student/sessions/${session.id}/close`,
        { method: 'POST' }
      );
      navigate("/estudiante/conversaciones");
    } catch {
      setError("Error al cerrar la sesión.");
      setClosing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground font-body">Cargando...</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-sm text-destructive font-body">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/estudiante/actividades")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-sm font-body font-medium">
              {activity?.title ?? "Actividad"}
            </p>
            <p className="text-xs text-muted-foreground font-body capitalize">
              {session?.current_phase ?? ""}
            </p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] px-4 py-3 rounded-lg text-sm font-body leading-relaxed ${
                  msg.role === "student"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-lg bg-card border border-border text-sm font-body text-muted-foreground">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce [animation-delay:0ms]">·</span>
                  <span className="animate-bounce [animation-delay:150ms]">·</span>
                  <span className="animate-bounce [animation-delay:300ms]">·</span>
                </span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive text-center font-body">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí tu respuesta..."
              disabled={thinking || session?.status === 'completed'}
              className="flex-1 px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <Button onClick={handleSend} disabled={thinking || !input.trim() || session?.status === 'completed'}>
              Enviar
            </Button>
          </div>
          {session?.status !== 'completed' && (
            <div className="flex justify-center mt-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleClose}
                disabled={closing || thinking}
              >
                {closing ? "Cerrando..." : "Cerrar actividad"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocraticChat;
```

- [ ] **Step 2: Verify TypeScript in frontend**

```bash
cd /Users/valenfranco/Desktop/criterIA && bun run typecheck 2>/dev/null || npx tsc --noEmit
```

Expected: no errors (or only pre-existing ones).

- [ ] **Step 3: Test in browser**

1. Start server: `cd server && npm run dev`
2. Start frontend: `cd /Users/valenfranco/Desktop/criterIA && bun run dev`
3. Open `http://localhost:5173`
4. Pick student user (sofiam) via UserSwitcher
5. Navigate to an activity → should open SocraticChat with the tutor's first question
6. Type a message → should get a real response from Claude

- [ ] **Step 4: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add src/pages/student/SocraticChat.tsx
git commit -m "feat: wire SocraticChat to real API with two-agent pipeline"
```

---

## Task 8: Wire StudentActivities.tsx to real API

**Files:**
- Modify: `src/pages/student/StudentActivities.tsx`

Replaces `activities` mock with `GET /api/student/activities`. The items have `{ activity, session }` shape. Tabs: "Pendientes" = no session or not_started, "En curso" = in_progress, "Completadas" = completed.

- [ ] **Step 1: Rewrite StudentActivities.tsx**

Replace the entire file:

```tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import type { ListStudentActivitiesResponse, Activity, ActivitySession } from "../../../server/src/contracts";

type Tab = "pending" | "active" | "completed";

type Item = { activity: Activity; session: ActivitySession | null };

const StudentActivities = () => {
  const [tab, setTab] = useState<Tab>("pending");
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ListStudentActivitiesResponse>('/api/student/activities')
      .then((data) => setAllItems(data.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending", label: "Pendientes" },
    { key: "active", label: "En curso" },
    { key: "completed", label: "Completadas" },
  ];

  const filtered = allItems.filter(({ session }) => {
    if (tab === "pending") return !session || session.status === "not_started";
    if (tab === "active") return session?.status === "in_progress";
    return session?.status === "completed";
  });

  return (
    <div className="p-8 animate-fade-in">
      <h2 className="text-2xl font-serif mb-6">Mis actividades</h2>

      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-body transition-colors ${
              tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground font-body">Cargando...</p>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground font-body">No hay actividades en esta categoría.</p>
          )}
          {filtered.map(({ activity, session }) => (
            <button
              key={activity.id}
              onClick={() => navigate(`/estudiante/actividad/${activity.id}`)}
              className="w-full text-left bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all"
            >
              <p className="text-sm font-body font-medium">{activity.title}</p>
              <p className="text-xs text-muted-foreground font-body mt-1">{activity.topic}</p>
              {session?.status === "in_progress" && (
                <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-body">
                  En curso
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentActivities;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add src/pages/student/StudentActivities.tsx
git commit -m "feat: wire StudentActivities to real API"
```

---

## Task 9: Wire StudentHome.tsx to real API

**Files:**
- Modify: `src/pages/student/StudentHome.tsx`

Shows the first pending activity as a highlight card, and the total idea count from all courses.

- [ ] **Step 1: Rewrite StudentHome.tsx**

Replace the entire file:

```tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type {
  MeResponse,
  ListStudentActivitiesResponse,
  ListStudentCoursesResponse,
} from "../../../server/src/contracts";

const StudentHome = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [pendingActivity, setPendingActivity] = useState<{ id: string; title: string; topic: string } | null>(null);
  const [totalIdeas, setTotalIdeas] = useState<number>(0);

  useEffect(() => {
    async function load() {
      try {
        const [me, activities, courses] = await Promise.all([
          apiFetch<MeResponse>('/api/me'),
          apiFetch<ListStudentActivitiesResponse>('/api/student/activities'),
          apiFetch<ListStudentCoursesResponse>('/api/student/courses'),
        ]);

        setUserName(me.user.name.split(' ')[0]);

        const pending = activities.items.find(
          ({ session }) => !session || session.status === 'not_started'
        );
        if (pending) {
          setPendingActivity({
            id: pending.activity.id,
            title: pending.activity.title,
            topic: pending.activity.topic,
          });
        }

        const total = courses.courses.reduce((sum, c) => sum + c.idea_count, 0);
        setTotalIdeas(total);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  return (
    <div className="p-8 max-w-2xl animate-fade-in">
      <h1 className="text-3xl font-serif mb-2">Hola, {userName || "..."}</h1>
      <p className="text-muted-foreground font-body mb-10">Bienvenida de vuelta.</p>

      {pendingActivity && (
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-2">Actividad pendiente</p>
          <h2 className="font-serif text-xl mb-1">{pendingActivity.title}</h2>
          <p className="text-sm text-muted-foreground font-body mb-4">{pendingActivity.topic}</p>
          <Button onClick={() => navigate(`/estudiante/actividad/${pendingActivity.id}`)}>
            Empezar
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      <button
        onClick={() => navigate("/estudiante/mi-camino")}
        className="text-left w-full bg-card border border-border rounded-lg p-6 hover:border-primary/30 transition-all group"
      >
        <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-1">Tu recorrido</p>
        <p className="font-serif text-lg group-hover:text-primary transition-colors">
          {totalIdeas > 0 ? `Descubriste ${totalIdeas} idea${totalIdeas !== 1 ? 's' : ''}` : "Todavía no hay ideas registradas"}
        </p>
        <p className="text-sm text-muted-foreground font-body mt-1">Ver mi camino →</p>
      </button>
    </div>
  );
};

export default StudentHome;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add src/pages/student/StudentHome.tsx
git commit -m "feat: wire StudentHome to real API"
```

---

## Task 10: Wire MyPath.tsx to real API

**Files:**
- Modify: `src/pages/student/MyPath.tsx`

Adds a course selector (tabs) at top. Ideas loaded per `course_id`. Positions calculated dynamically from index — distributes nodes in a deterministic pseudo-random layout that adapts to any array length.

- [ ] **Step 1: Rewrite MyPath.tsx**

Replace the entire file:

```tsx
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { X } from "lucide-react";
import type {
  ListStudentCoursesResponse,
  ListStudentIdeasResponse,
  StudentIdea,
  Course,
} from "../../../server/src/contracts";

// Deterministic position spread: distributes nodes in a wave pattern
function positionForIndex(index: number, total: number): { x: number; y: number } {
  const cols = Math.ceil(Math.sqrt(total + 1));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const xBase = (col / cols) * 80 + 5;
  const yBase = (row / Math.max(Math.ceil(total / cols), 1)) * 70 + 8;
  // small offset to avoid grid feel
  const xOff = (index % 3) * 3 - 3;
  const yOff = (index % 2) * 4 - 2;
  return { x: xBase + xOff, y: yBase + yOff };
}

const MyPath = () => {
  const [courses, setCourses] = useState<Array<{ course: Course; idea_count: number }>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<StudentIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<StudentIdea | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingIdeas, setLoadingIdeas] = useState(false);

  useEffect(() => {
    apiFetch<ListStudentCoursesResponse>('/api/student/courses')
      .then((data) => {
        setCourses(data.courses);
        if (data.courses.length > 0) {
          setSelectedCourseId(data.courses[0].course.id);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingCourses(false));
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;
    setLoadingIdeas(true);
    setSelectedIdea(null);
    apiFetch<ListStudentIdeasResponse>(`/api/student/ideas?course_id=${selectedCourseId}`)
      .then((data) => setIdeas(data.ideas))
      .catch(console.error)
      .finally(() => setLoadingIdeas(false));
  }, [selectedCourseId]);

  const totalIdeas = courses.reduce((sum, c) => sum + c.idea_count, 0);
  const positions = ideas.map((_, i) => positionForIndex(i, ideas.length));

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-3xl">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-1">Tu recorrido</p>
        <h2 className="text-2xl font-serif mb-1">
          {totalIdeas > 0
            ? `Descubriste ${totalIdeas} idea${totalIdeas !== 1 ? 's' : ''}`
            : "Todavía no hay ideas"}
        </h2>
        <p className="text-sm text-muted-foreground font-body italic mb-6">Esto es tuyo. Lo pensaste vos.</p>
      </div>

      {/* Course tabs */}
      {!loadingCourses && courses.length > 0 && (
        <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit">
          {courses.map(({ course, idea_count }) => (
            <button
              key={course.id}
              onClick={() => setSelectedCourseId(course.id)}
              className={`px-4 py-2 rounded-md text-sm font-body transition-colors ${
                selectedCourseId === course.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {course.name} ({idea_count})
            </button>
          ))}
        </div>
      )}

      {/* Visual map */}
      <div
        className="relative bg-card border border-border rounded-lg overflow-hidden"
        style={{ height: "500px" }}
      >
        {loadingIdeas ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground font-body">Cargando ideas...</p>
          </div>
        ) : ideas.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground font-body italic">
              Todavía no hay ideas en esta materia.
            </p>
          </div>
        ) : (
          <>
            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {ideas.map((idea, fromIdx) =>
                idea.connections.map((connId) => {
                  const toIdx = ideas.findIndex((i) => i.id === connId);
                  if (toIdx === -1) return null;
                  return (
                    <line
                      key={`${idea.id}-${connId}`}
                      x1={`${positions[fromIdx].x}%`}
                      y1={`${positions[fromIdx].y + 5}%`}
                      x2={`${positions[toIdx].x}%`}
                      y2={`${positions[toIdx].y + 5}%`}
                      stroke="hsl(var(--border))"
                      strokeWidth="1.5"
                      strokeDasharray="6 4"
                    />
                  );
                })
              )}
            </svg>

            {/* Idea nodes */}
            {ideas.map((idea, i) => (
              <button
                key={idea.id}
                onClick={() => setSelectedIdea(selectedIdea?.id === idea.id ? null : idea)}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-xs font-body text-left max-w-[160px] transition-all border ${
                  selectedIdea?.id === idea.id
                    ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                    : "bg-background border-border hover:border-primary/40 hover:shadow-md"
                }`}
                style={{ left: `${positions[i].x}%`, top: `${positions[i].y + 5}%` }}
              >
                {idea.text.length > 60 ? idea.text.slice(0, 60) + "…" : idea.text}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Selected idea detail */}
      {selectedIdea && (
        <div className="mt-4 bg-card border border-border rounded-lg p-5 max-w-2xl animate-fade-in">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-body leading-relaxed">{selectedIdea.text}</p>
            <button
              onClick={() => setSelectedIdea(null)}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {selectedIdea.question_that_triggered_it && (
            <p className="text-xs text-muted-foreground font-body italic mt-3">
              Disparada por: "{selectedIdea.question_that_triggered_it}"
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MyPath;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add src/pages/student/MyPath.tsx
git commit -m "feat: wire MyPath with course tabs and dynamic idea map"
```

---

## Task 11: Wire Conversations.tsx to real API

**Files:**
- Modify: `src/pages/student/Conversations.tsx`

Replaces mock with `GET /api/student/conversations`. Each item has `{ session, activity }`. Shows session_summary and messages count if session is completed.

- [ ] **Step 1: Rewrite Conversations.tsx**

Replace the entire file:

```tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { ListConversationsResponse, Activity, ActivitySession } from "../../../server/src/contracts";

type Item = { session: ActivitySession; activity: Activity };

const Conversations = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ListConversationsResponse>('/api/student/conversations')
      .then((data) => setItems(data.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 animate-fade-in max-w-3xl">
      <h2 className="text-2xl font-serif mb-6">Conversaciones</h2>

      {loading && (
        <p className="text-sm text-muted-foreground font-body">Cargando...</p>
      )}

      {!loading && items.length === 0 && (
        <p className="text-sm text-muted-foreground font-body">
          Todavía no hay conversaciones. Completá una actividad para que aparezca acá.
        </p>
      )}

      <div className="space-y-3">
        {items.map(({ session, activity }) => (
          <div key={session.id} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === session.id ? null : session.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="text-sm font-body font-medium">{activity.title}</p>
                <p className="text-xs text-muted-foreground font-body">
                  {activity.topic} ·{" "}
                  {session.completed_at
                    ? new Date(session.completed_at).toLocaleDateString("es-AR")
                    : session.started_at
                    ? new Date(session.started_at).toLocaleDateString("es-AR")
                    : ""}
                  {" · "}
                  {session.status === "completed"
                    ? "Completada"
                    : session.status === "in_progress"
                    ? "En curso"
                    : "Pendiente"}
                </p>
              </div>
              {expanded === session.id ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {expanded === session.id && (
              <div className="border-t border-border p-4 animate-fade-in space-y-3">
                {session.session_summary && (
                  <p className="text-sm font-body leading-relaxed text-muted-foreground">
                    {session.session_summary}
                  </p>
                )}
                {session.status === "in_progress" && (
                  <button
                    onClick={() => navigate(`/estudiante/actividad/${activity.id}`)}
                    className="text-xs text-primary font-body hover:underline"
                  >
                    Continuar conversación →
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Conversations;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA
git add src/pages/student/Conversations.tsx
git commit -m "feat: wire Conversations to real API"
```

---

## End-to-end Smoke Test

After all tasks are done, run this full flow:

```bash
# Reset DB to clean state with seed data
cd /Users/valenfranco/Desktop/criterIA/server && npm run db:reset

# In separate terminal, start server
npm run dev

# In separate terminal, start frontend
cd /Users/valenfranco/Desktop/criterIA && bun run dev
```

1. Open `http://localhost:5173`
2. Pick user **sofiam** via UserSwitcher
3. Home: should show her name + a pending activity
4. Go to Actividades → tab Pendientes → click an activity
5. SocraticChat opens with tutor's first question
6. Send 2-3 messages → Claude responds with socratic questions
7. Click "Cerrar actividad" → redirects to Conversaciones
8. Conversaciones shows the closed session with summary
9. Go to Mi Camino → course tabs appear → ideas from the session visible as nodes

If the chat pipeline works, everything else is mechanical. The pipeline is the only moving part.
