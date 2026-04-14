# Flipped Classroom — Enriched Close & Class Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the session close with comprehension % and difficult topics, auto-update student profiles after close, and add a Class Analyst that aggregates all session data into a teacher-facing panorama with groups, struggling students, and a suggested plan.

**Architecture:** Sócrates (Managed Agent, Opus fast) produces enriched close data per student. A shared `profile-updater.ts` runs in background post-close. A new `class-analyst.ts` uses the Messages API with forced tool call to produce structured ClassAnalysis JSON. File upload uses a separate endpoint + Anthropic Files API.

**Tech Stack:** Node/TypeScript/Fastify/better-sqlite3/@anthropic-ai/sdk 0.88.0 · Managed Agents beta · Messages API with forced tool call

**Working directory:** `/Users/valenfranco/Desktop/criterIA`
**Server directory:** `/Users/valenfranco/Desktop/criterIA/server`

---

## File Map

| File | Action | What it does |
|---|---|---|
| `server/src/schema.sql` | Modify | Add `comprehension_pct`, `difficult_topics` to activity_sessions; `anthropic_file_id` to activities; `analysis` to activity_summaries |
| `server/src/contracts.ts` | Modify | Add new fields to interfaces + new `ClassAnalysis` interface |
| `server/src/socratic/agent.ts` | Modify | Update tool schema (2 new fields), update `CloseResult`, update `createManagedSession` to accept optional file, update fallback |
| `server/src/socratic/prompts/system-socrates.md` | Modify | Update `<session_close>` with new field descriptions |
| `server/src/profile-updater.ts` | Create | Extract `refreshStudentProfile` from teacher-agents.ts into shared module |
| `server/src/class-analyst.ts` | Create | `runClassAnalyst(activityId)` — Messages API forced tool call → ClassAnalysis |
| `server/src/teacher-agents.ts` | Modify | Remove `refreshStudentProfile` and `summarizeActivity` (moved/replaced) |
| `server/src/teacher-routes.ts` | Modify | Import from new modules, add upload endpoint |
| `server/src/student-routes.ts` | Modify | Close endpoint: persist new fields + fire profile update. Start: pass file to session. |

---

## Task 1: Schema + contracts changes

**Files:**
- Modify: `server/src/schema.sql`
- Modify: `server/src/contracts.ts`

- [ ] **Step 1: Add new columns to schema.sql**

In `server/src/schema.sql`, in the `activity_sessions` CREATE TABLE, after `managed_session_id TEXT`:

```sql
  managed_session_id TEXT,
  comprehension_pct INTEGER,
  difficult_topics TEXT DEFAULT '[]'
```

In the `activities` CREATE TABLE, after `config TEXT NOT NULL DEFAULT '{}'`:

```sql
  config TEXT NOT NULL DEFAULT '{}',
  anthropic_file_id TEXT,
```

In the `activity_summaries` CREATE TABLE, after `understanding_avg REAL`:

```sql
  understanding_avg REAL,
  analysis TEXT,
```

- [ ] **Step 2: Add new fields and interface to contracts.ts**

Add to `ActivitySession` interface after `managed_session_id`:

```ts
  comprehension_pct: number | null;
  difficult_topics: string[];
```

Add to `Activity` interface after `config`:

```ts
  anthropic_file_id: string | null;
```

Add to `ActivitySummary` interface after `understanding_avg`:

```ts
  analysis: ClassAnalysis | null;
```

Add new interface at the end of the file:

```ts
export interface ClassAnalysis {
  class_comprehension_avg: number;
  difficult_topics: Array<{
    topic: string;
    student_count: number;
    description: string;
  }>;
  struggling_students: Array<{
    student_id: string;
    name: string;
    comprehension_pct: number;
    main_difficulty: string;
  }>;
  suggested_groups: Array<{
    group_name: string;
    student_ids: string[];
    topic: string;
    rationale: string;
  }>;
  class_summary: string;
  suggested_plan: string;
}
```

- [ ] **Step 3: Reset DB and commit**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run db:reset
cd /Users/valenfranco/Desktop/criterIA && git add server/src/schema.sql server/src/contracts.ts && git commit -m "feat: add schema + contracts for enriched close, file upload, and class analytics"
```

---

## Task 2: Enrich Sócrates close — agent.ts + prompt

**Files:**
- Modify: `server/src/socratic/agent.ts`
- Modify: `server/src/socratic/prompts/system-socrates.md`

- [ ] **Step 1: Add new fields to the submit_session_report tool schema in agent.ts**

In the `ensureAgentSetup` function, in the `input_schema.properties` object of the custom tool, add after `extracted_ideas`:

```ts
              comprehension_pct: {
                type: 'number',
                description:
                  'Rate 0-100 how well the student understood the core objective of the activity. 0 = no understanding, 100 = full mastery.',
              },
              difficult_topics: {
                type: 'array',
                description:
                  'List specific sub-topics where the student showed confusion, needed extra scaffolding, or could not articulate a clear idea.',
                items: { type: 'string' },
              },
```

Update the `required` array to include the new fields:

```ts
            required: ['session_summary', 'teacher_report', 'extracted_ideas', 'comprehension_pct', 'difficult_topics'],
```

- [ ] **Step 2: Update CloseResult interface and parsing in agent.ts**

Replace the `CloseResult` interface:

```ts
export interface CloseResult {
  session_summary: string;
  teacher_report: string;
  extracted_ideas: ExtractedIdea[];
  comprehension_pct: number | null;
  difficult_topics: string[];
}
```

In the `sendCloseAndCollect` function, in the block where `toolUseEvent?.input` is processed, add after the `extracted_ideas` mapping:

```ts
      comprehension_pct: typeof input.comprehension_pct === 'number' ? input.comprehension_pct : null,
      difficult_topics: Array.isArray(input.difficult_topics)
        ? input.difficult_topics.filter((t: any) => typeof t === 'string')
        : [],
```

In the fallback return at the end of `sendCloseAndCollect`, add:

```ts
    comprehension_pct: null,
    difficult_topics: [],
```

- [ ] **Step 3: Update createManagedSession to accept optional file**

Change the signature and body of `createManagedSession`:

```ts
export async function createManagedSession(anthropicFileId?: string | null): Promise<string> {
  const client = requireAnthropic();
  const { agentId, environmentId } = await ensureAgentSetup();

  const sessionParams: any = {
    agent: agentId,
    environment_id: environmentId,
  };

  if (anthropicFileId) {
    sessionParams.resources = [
      { type: 'file', file_id: anthropicFileId, mount_path: '/workspace/material.pdf' },
    ];
  }

  const session = await (client.beta as any).sessions.create(sessionParams);
  return session.id;
}
```

- [ ] **Step 4: Update system-socrates.md prompt**

In `server/src/socratic/prompts/system-socrates.md`, replace the `<session_close>` section with:

```md
<session_close>
When told the student is ending the session, call the `submit_session_report` tool with:

- `session_summary`: 2-4 sentences summarizing what happened in the session, written for the student in a warm tone
- `teacher_report`: structured markdown for the teacher with these sections:
  - `## Recorrido` — what path the conversation took
  - `## Ideas clave` — the most important ideas the student produced
  - `## Observaciones` — observations about the student's thinking patterns, strengths, and areas to work on
- `extracted_ideas`: an array of ideas the student produced during the conversation. Use the student's own words. Include the question that triggered each idea when possible.
- `comprehension_pct`: a number from 0 to 100 rating how well the student understood the core objective of the activity. 0 means no understanding at all, 100 means full mastery. Be honest — a student who repeated your words without understanding gets a low score; a student who built their own criterion gets a high one.
- `difficult_topics`: a list of specific sub-topics where the student showed confusion, needed extra scaffolding, or could not articulate a clear idea. Be specific — "causas económicas de la revolución" is better than "la revolución".
</session_close>
```

- [ ] **Step 5: Typecheck and commit**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
cd /Users/valenfranco/Desktop/criterIA && git add server/src/socratic/agent.ts server/src/socratic/prompts/system-socrates.md && git commit -m "feat: enrich Sócrates close with comprehension % and difficult topics"
```

---

## Task 3: Extract profile-updater.ts

**Files:**
- Create: `server/src/profile-updater.ts`
- Modify: `server/src/teacher-agents.ts`
- Modify: `server/src/teacher-routes.ts`

- [ ] **Step 1: Create profile-updater.ts**

Create `server/src/profile-updater.ts` by moving the `refreshStudentProfile` function from `teacher-agents.ts`:

```ts
import type { StudentProfile } from './contracts.js';
import { db } from './db.js';
import { requireAnthropic } from './anthropic.js';

const MODEL = process.env.ANTHROPIC_MODEL_TEACHER ?? 'claude-opus-4-6';

export async function refreshStudentProfile(
  studentId: string
): Promise<Pick<StudentProfile, 'summary'>> {
  const student = db
    .prepare("SELECT * FROM users WHERE id = ? AND role = 'student'")
    .get(studentId) as any;

  if (!student) {
    throw new Error('student_not_found');
  }

  const sessions = db
    .prepare(
      `SELECT s.session_summary, s.teacher_report, s.comprehension_pct, s.difficult_topics,
              a.title AS activity_title, a.topic AS activity_topic
       FROM activity_sessions s
       JOIN activities a ON a.id = s.activity_id
       WHERE s.student_id = ? AND s.status = 'completed'
       ORDER BY s.completed_at DESC
       LIMIT 10`
    )
    .all(studentId) as any[];

  const ideas = db
    .prepare(
      `SELECT text, question_that_triggered_it
       FROM student_ideas
       WHERE student_id = ?
       ORDER BY created_at DESC
       LIMIT 20`
    )
    .all(studentId) as any[];

  const sessionLines =
    sessions.length > 0
      ? sessions
          .map(
            (s: any, i: number) =>
              `Sesión ${i + 1} — ${s.activity_title} (${s.activity_topic})\n` +
              `  Resumen: ${s.session_summary ?? '(sin resumen)'}\n` +
              `  Comprensión: ${s.comprehension_pct ?? '?'}%\n` +
              `  Temas difíciles: ${s.difficult_topics ?? '[]'}\n` +
              `  Reporte: ${s.teacher_report ?? '(sin reporte)'}`
          )
          .join('\n\n')
      : '(sin sesiones completadas)';

  const ideaLines =
    ideas.length > 0
      ? ideas
          .map(
            (idea: any, i: number) =>
              `Idea ${i + 1}: ${idea.text}` +
              (idea.question_that_triggered_it
                ? ` (pregunta disparadora: ${idea.question_that_triggered_it})`
                : '')
          )
          .join('\n')
      : '(sin ideas registradas)';

  const context =
    `Alumno: ${student.name}\n\n` +
    `Sesiones recientes:\n${sessionLines}\n\n` +
    `Ideas generadas:\n${ideaLines}`;

  const client = requireAnthropic();

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      'Sos un analista pedagógico experto. Te doy el historial de un alumno: sus sesiones socráticas, reportes, comprensión y temas difíciles. ' +
      'Escribí un perfil cognitivo del alumno en 4-6 oraciones. Incluí: cómo piensa (visual, abstracto, concreto, analógico), ' +
      'qué patrones muestra (resistencia, velocidad, profundidad), dónde se traba y qué lo/la desbloquea, qué estrategias ' +
      'pedagógicas le funcionan mejor. Escribí en tercera persona, en español rioplatense, tono profesional pero cálido. ' +
      'No uses bullet points — párrafo corrido.',
    messages: [{ role: 'user', content: context }],
  });

  const summary =
    message.content[0].type === 'text' ? message.content[0].text.trim() : '';

  return { summary };
}
```

- [ ] **Step 2: Remove refreshStudentProfile from teacher-agents.ts**

In `teacher-agents.ts`, delete the `refreshStudentProfile` function (lines 86-166). Keep `summarizeActivity` and `planClass` for now (summarizeActivity gets replaced in Task 4 but teacher-routes still imports it until then).

- [ ] **Step 3: Update teacher-routes.ts imports**

In `teacher-routes.ts`, change:

```ts
import { summarizeActivity, refreshStudentProfile } from './teacher-agents.js';
```

To:

```ts
import { summarizeActivity } from './teacher-agents.js';
import { refreshStudentProfile } from './profile-updater.js';
```

- [ ] **Step 4: Typecheck and commit**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
cd /Users/valenfranco/Desktop/criterIA && git add server/src/profile-updater.ts server/src/teacher-agents.ts server/src/teacher-routes.ts && git commit -m "refactor: extract refreshStudentProfile into shared profile-updater.ts"
```

---

## Task 4: Create class-analyst.ts and replace summarizeActivity

**Files:**
- Create: `server/src/class-analyst.ts`
- Modify: `server/src/teacher-agents.ts`
- Modify: `server/src/teacher-routes.ts`

- [ ] **Step 1: Create class-analyst.ts**

Create `server/src/class-analyst.ts`:

```ts
import type { ClassAnalysis } from './contracts.js';
import { db, jsonParse } from './db.js';
import { requireAnthropic } from './anthropic.js';

const MODEL = process.env.ANTHROPIC_MODEL_ANALYST ?? 'claude-opus-4-6';

const classAnalysisSchema = {
  type: 'object' as const,
  properties: {
    class_comprehension_avg: { type: 'number', description: 'Average comprehension 0-100' },
    difficult_topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          student_count: { type: 'number' },
          description: { type: 'string' },
        },
        required: ['topic', 'student_count', 'description'],
      },
    },
    struggling_students: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          student_id: { type: 'string' },
          name: { type: 'string' },
          comprehension_pct: { type: 'number' },
          main_difficulty: { type: 'string' },
        },
        required: ['student_id', 'name', 'comprehension_pct', 'main_difficulty'],
      },
    },
    suggested_groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          group_name: { type: 'string' },
          student_ids: { type: 'array', items: { type: 'string' } },
          topic: { type: 'string' },
          rationale: { type: 'string' },
        },
        required: ['group_name', 'student_ids', 'topic', 'rationale'],
      },
    },
    class_summary: { type: 'string' },
    suggested_plan: { type: 'string' },
  },
  required: [
    'class_comprehension_avg',
    'difficult_topics',
    'struggling_students',
    'suggested_groups',
    'class_summary',
    'suggested_plan',
  ],
};

export async function runClassAnalyst(activityId: string): Promise<{
  analysis: ClassAnalysis;
  understanding_avg: number;
  summary: string;
}> {
  const activity = db
    .prepare('SELECT * FROM activities WHERE id = ?')
    .get(activityId) as any;

  if (!activity) throw new Error('activity_not_found');

  const sessions = db
    .prepare(
      `SELECT s.*, u.name AS student_name, u.id AS student_id
       FROM activity_sessions s
       JOIN users u ON u.id = s.student_id
       WHERE s.activity_id = ? AND s.status = 'completed'`
    )
    .all(activityId) as any[];

  if (sessions.length === 0) throw new Error('no_completed_sessions');

  const sessionBlocks = sessions
    .map((s: any) => {
      const ideas = jsonParse<any[]>(s.extracted_ideas, []);
      const difficultTopics = jsonParse<string[]>(s.difficult_topics, []);
      return (
        `Student ID: ${s.student_id}\n` +
        `Student Name: ${s.student_name}\n` +
        `Comprehension: ${s.comprehension_pct ?? '?'}%\n` +
        `Difficult topics: ${JSON.stringify(difficultTopics)}\n` +
        `Summary: ${s.session_summary ?? '(no summary)'}\n` +
        `Ideas: ${ideas.map((i: any) => i.text).join('; ') || '(none)'}\n` +
        `Teacher report:\n${s.teacher_report ?? '(no report)'}`
      );
    })
    .join('\n\n─────────────────\n\n');

  const input =
    `Activity: ${activity.title}\n` +
    `Topic: ${activity.topic}\n` +
    `Objective: ${activity.objective}\n\n` +
    `Session Reports (${sessions.length} students):\n\n` +
    sessionBlocks;

  const client = requireAnthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system:
      'Sos un analista pedagógico experto. Te doy los reportes de sesiones socráticas de todos los alumnos de una clase para una actividad. ' +
      'Analizá los datos y generá un panorama completo para el docente. Usá la herramienta submit_class_analysis para devolver el resultado. ' +
      'Escribí todo en español rioplatense, tono profesional.',
    messages: [{ role: 'user', content: input }],
    tools: [
      {
        name: 'submit_class_analysis',
        description: 'Submit the structured class analysis',
        input_schema: classAnalysisSchema,
      },
    ],
    tool_choice: { type: 'tool' as const, name: 'submit_class_analysis' },
  });

  // Extract the tool call input
  const toolBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Class analyst did not call submit_class_analysis');
  }

  const analysis = toolBlock.input as unknown as ClassAnalysis;

  return {
    analysis,
    understanding_avg: analysis.class_comprehension_avg,
    summary: analysis.class_summary,
  };
}
```

- [ ] **Step 2: Remove summarizeActivity from teacher-agents.ts**

Delete the `summarizeActivity` function from `teacher-agents.ts`. The file should now only contain `planClass` (and `stripJsonFences` if still needed by `planClass`).

- [ ] **Step 3: Update teacher-routes.ts for the generate-summary endpoint**

In `teacher-routes.ts`, change the import:

```ts
import { planClass } from './teacher-agents.js';
import { refreshStudentProfile } from './profile-updater.js';
import { runClassAnalyst } from './class-analyst.js';
```

Find the `generate-summary` endpoint and replace its handler. The endpoint needs to:
1. Find open sessions and close them via `sendCloseAndCollect`
2. Call `runClassAnalyst`
3. Persist the result

Replace the generate-summary route handler with:

```ts
  // POST /api/teacher/activities/:id/generate-summary
  app.post('/activities/:id/generate-summary', async (req, reply) => {
    const user = await requireRole(req, reply, 'teacher');
    if (!user) return;

    const { id: activityId } = req.params as { id: string };

    // Close any open sessions first
    const openSessions = db
      .prepare(
        `SELECT managed_session_id FROM activity_sessions
         WHERE activity_id = ? AND status = 'in_progress' AND managed_session_id IS NOT NULL`
      )
      .all(activityId) as Array<{ managed_session_id: string }>;

    if (openSessions.length > 0) {
      const { sendCloseAndCollect } = await import('./socratic/agent.js');
      const closeResults = await Promise.all(
        openSessions.map(async (s) => {
          try {
            return await sendCloseAndCollect(s.managed_session_id);
          } catch (err) {
            console.error('[generate-summary] Failed to close session:', err);
            return null;
          }
        })
      );

      // Persist close results
      const now = new Date().toISOString();
      for (let i = 0; i < openSessions.length; i++) {
        const result = closeResults[i];
        if (!result) continue;
        db.prepare(
          `UPDATE activity_sessions
           SET status = 'completed', completed_at = ?, session_summary = ?, teacher_report = ?,
               extracted_ideas = ?, comprehension_pct = ?, difficult_topics = ?
           WHERE managed_session_id = ?`
        ).run(
          now,
          result.session_summary,
          result.teacher_report,
          JSON.stringify(result.extracted_ideas),
          result.comprehension_pct,
          JSON.stringify(result.difficult_topics),
          openSessions[i].managed_session_id
        );
      }
    }

    // Run the class analyst
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

    // Persist
    const summaryId = (await import('nanoid')).nanoid();
    const activity = db.prepare('SELECT course_id FROM activities WHERE id = ?').get(activityId) as { course_id: string };

    db.prepare(
      `INSERT INTO activity_summaries (id, activity_id, course_id, summary, understanding_avg, analysis, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      summaryId,
      activityId,
      activity.course_id,
      analysisResult.summary,
      analysisResult.understanding_avg,
      JSON.stringify(analysisResult.analysis),
      new Date().toISOString()
    );

    return reply.send({
      summary: {
        id: summaryId,
        activity_id: activityId,
        course_id: activity.course_id,
        summary: analysisResult.summary,
        understanding_avg: analysisResult.understanding_avg,
        analysis: analysisResult.analysis,
        created_at: new Date().toISOString(),
      },
    });
  });
```

- [ ] **Step 4: Typecheck and commit**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
cd /Users/valenfranco/Desktop/criterIA && git add server/src/class-analyst.ts server/src/teacher-agents.ts server/src/teacher-routes.ts && git commit -m "feat: add Class Analyst with forced tool call, replace summarizeActivity"
```

---

## Task 5: Update student-routes.ts — enriched close + file mount + auto profile update

**Files:**
- Modify: `server/src/student-routes.ts`

- [ ] **Step 1: Update close endpoint to persist new fields**

In the close endpoint, find the UPDATE statement and add the new columns:

```sql
UPDATE activity_sessions
SET status = 'completed', completed_at = ?, session_summary = ?, teacher_report = ?,
    extracted_ideas = ?, comprehension_pct = ?, difficult_topics = ?
WHERE id = ?
```

Add the corresponding `.run()` arguments: `result.comprehension_pct, jsonStringify(result.difficult_topics)` before `sessionId`.

- [ ] **Step 2: Add fire-and-forget profile update after close**

At the top of `student-routes.ts`, add the import:

```ts
import { refreshStudentProfile } from './profile-updater.js';
```

In the close endpoint, after `persist()` and before `archiveSession`, add:

```ts
    // Fire-and-forget: update student profile based on all their sessions
    refreshStudentProfile(user.id)
      .then(({ summary }) => {
        db.prepare('UPDATE student_profiles SET summary = ?, updated_at = ? WHERE student_id = ?')
          .run(summary, new Date().toISOString(), user.id);
      })
      .catch((err) => console.error('[close] Profile update failed:', err));
```

- [ ] **Step 3: Update start endpoint to pass file to managed session**

In the start endpoint, find the `createManagedSession()` call and change it to pass the file:

```ts
    let managedSessionId: string;
    try {
      managedSessionId = await createManagedSession(activity.anthropic_file_id);
    } catch (err) {
```

- [ ] **Step 4: Update parseSession to include new fields**

In the `parseSession` helper, add the new JSON field parsing:

```ts
function parseSession(row: Record<string, unknown>): ActivitySession {
  return {
    ...(row as unknown as Omit<ActivitySession, 'extracted_ideas' | 'difficult_topics'>),
    extracted_ideas: jsonParse<ExtractedIdea[]>(row.extracted_ideas as string, []),
    difficult_topics: jsonParse<string[]>(row.difficult_topics as string, []),
  };
}
```

- [ ] **Step 5: Typecheck and commit**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
cd /Users/valenfranco/Desktop/criterIA && git add server/src/student-routes.ts && git commit -m "feat: enriched close with comprehension/topics, auto profile update, file mount on start"
```

---

## Task 6: File upload endpoint

**Files:**
- Modify: `server/src/teacher-routes.ts`

- [ ] **Step 1: Install @fastify/multipart**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm install @fastify/multipart
```

- [ ] **Step 2: Register multipart in server.ts**

In `server/src/server.ts`, add after the cors registration:

```ts
import multipart from '@fastify/multipart';

// Inside main():
await app.register(multipart, { limits: { fileSize: 500 * 1024 * 1024 } });
```

- [ ] **Step 3: Add upload endpoint to teacher-routes.ts**

Add a new endpoint in `registerTeacherRoutes`:

```ts
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
```

- [ ] **Step 4: Add anthropic_file_id to activity creation**

In the activity creation endpoint, if `CreateActivityRequest` gains an optional `anthropic_file_id` field, include it in the INSERT. In `contracts.ts`, add to `CreateActivityRequest`:

```ts
  anthropic_file_id?: string | null;
```

Update the INSERT in the activity creation endpoint to include the new column.

- [ ] **Step 5: Typecheck and commit**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
cd /Users/valenfranco/Desktop/criterIA && git add -A && git commit -m "feat: add file upload endpoint and mount files in managed sessions"
```

---

## End-to-End Test

After all tasks:

```bash
cd /Users/valenfranco/Desktop/criterIA/server
# Clear old agent IDs to force recreation with new tool schema
# Edit .env: clear ANTHROPIC_AGENT_ID and ANTHROPIC_ENVIRONMENT_ID
npm run db:reset
npm run dev
```

1. As `sofiam`: Start activity → chat with Sócrates → close session
2. Verify the session has `comprehension_pct` and `difficult_topics` in the DB
3. Verify `student_profiles.summary` was auto-updated
4. As `yairp` (teacher): click "Generar resumen" on the activity
5. Verify `activity_summaries` has the enriched `analysis` JSON with groups, struggling students, suggested plan
