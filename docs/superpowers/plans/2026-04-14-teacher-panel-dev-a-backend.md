# Teacher Panel — Dev A (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Course Analyst (cross-activity analytics per course), fix JSON column parsing in teacher endpoints, and enrich the course detail API response with analytics.

**Architecture:** New `course-analyst.ts` uses Messages API (Opus, forced tool call) to aggregate all activity summaries + student sessions for a course. Runs fire-and-forget after generate-summary. Result stored in new `course_analytics` table. Existing teacher endpoints fixed to parse JSON columns before sending to frontend.

**Tech Stack:** Node/TypeScript/Fastify/better-sqlite3/@anthropic-ai/sdk 0.88.0 · Messages API with forced tool call

**Working directory:** `/Users/valenfranco/Desktop/criterIA`
**Server directory:** `/Users/valenfranco/Desktop/criterIA/server`

**Depends on:** The enriched close backend (already merged in `feat/student-side`). Dev B (frontend) depends on this plan completing first for Tasks 1-3.

---

## File Map

| File | Action | What it does |
|---|---|---|
| `server/src/schema.sql` | Modify | Add `course_analytics` table |
| `server/src/contracts.ts` | Modify | Add `CourseAnalytics`, `CourseAnalyticsRow`, update `CourseDetailResponse` |
| `server/src/course-analyst.ts` | Create | `runCourseAnalyst(courseId)` — Opus forced tool call |
| `server/src/teacher-routes.ts` | Modify | Fix JSON parsing in 2 endpoints, add analytics to course detail, fire-and-forget course analyst after summary |

---

### Task A1: Schema + contracts

**Files:**
- Modify: `server/src/schema.sql`
- Modify: `server/src/contracts.ts`

- [ ] **Step 1: Add course_analytics table to schema.sql**

After the `activity_summaries` table definition, add:

```sql
-- 11. course_analytics
CREATE TABLE course_analytics (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL UNIQUE REFERENCES courses(id),
  analysis TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- [ ] **Step 2: Add types to contracts.ts**

Add at the end of the file (after `ClassAnalysis`):

```ts
export interface CourseAnalytics {
  course_comprehension_avg: number;
  student_rankings: Array<{
    student_id: string;
    name: string;
    comprehension_avg: number;
    trend: 'improving' | 'stable' | 'declining';
    main_strengths: string;
    main_difficulties: string;
  }>;
  accumulated_difficult_topics: Array<{
    topic: string;
    frequency: number;
    description: string;
  }>;
  suggested_groups: Array<{
    group_name: string;
    student_ids: string[];
    topic: string;
    rationale: string;
  }>;
  course_summary: string;
}

export interface CourseAnalyticsRow {
  id: string;
  course_id: string;
  analysis: CourseAnalytics;
  created_at: string;
  updated_at: string;
}
```

Update `CourseDetailResponse`:

```ts
export interface CourseDetailResponse {
  course: Course;
  students: User[];
  analytics: CourseAnalytics | null;
}
```

- [ ] **Step 3: Reset DB and commit**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run db:reset
cd /Users/valenfranco/Desktop/criterIA && git add server/src/schema.sql server/src/contracts.ts && git commit -m "feat: add course_analytics table and CourseAnalytics types"
```

---

### Task A2: Create course-analyst.ts

**Files:**
- Create: `server/src/course-analyst.ts`

- [ ] **Step 1: Create the file**

Create `server/src/course-analyst.ts`:

```ts
import type { CourseAnalytics } from './contracts.js';
import { db, jsonParse } from './db.js';
import { requireAnthropic } from './anthropic.js';
import { nanoid } from 'nanoid';

const MODEL = process.env.ANTHROPIC_MODEL_ANALYST ?? 'claude-opus-4-6';

const courseAnalyticsSchema = {
  type: 'object' as const,
  properties: {
    course_comprehension_avg: { type: 'number', description: 'Average comprehension 0-100 across all activities' },
    student_rankings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          student_id: { type: 'string' },
          name: { type: 'string' },
          comprehension_avg: { type: 'number', description: 'Average comprehension across activities' },
          trend: { type: 'string', enum: ['improving', 'stable', 'declining'], description: 'Based on chronological comprehension scores' },
          main_strengths: { type: 'string' },
          main_difficulties: { type: 'string' },
        },
        required: ['student_id', 'name', 'comprehension_avg', 'trend', 'main_strengths', 'main_difficulties'],
      },
    },
    accumulated_difficult_topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          frequency: { type: 'number', description: 'Number of activities where this topic appeared as difficult' },
          description: { type: 'string' },
        },
        required: ['topic', 'frequency', 'description'],
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
    course_summary: { type: 'string', description: 'Narrative summary of how the course is going overall' },
  },
  required: ['course_comprehension_avg', 'student_rankings', 'accumulated_difficult_topics', 'suggested_groups', 'course_summary'],
};

export async function runCourseAnalyst(courseId: string): Promise<CourseAnalytics> {
  const course = db
    .prepare('SELECT * FROM courses WHERE id = ?')
    .get(courseId) as any;

  if (!course) throw new Error('course_not_found');

  // Load all activity summaries with their analysis
  const summaries = db
    .prepare(
      `SELECT a.title, a.topic, a.objective, s.analysis, s.understanding_avg
       FROM activity_summaries s
       JOIN activities a ON a.id = s.activity_id
       WHERE s.course_id = ?
       ORDER BY s.created_at ASC`
    )
    .all(courseId) as any[];

  // Load all individual sessions for trend calculation
  const sessions = db
    .prepare(
      `SELECT s.student_id, u.name AS student_name, s.comprehension_pct, s.difficult_topics,
              s.completed_at, a.title AS activity_title
       FROM activity_sessions s
       JOIN users u ON u.id = s.student_id
       JOIN activities a ON a.id = s.activity_id
       WHERE a.course_id = ? AND s.status = 'completed'
       ORDER BY s.completed_at ASC`
    )
    .all(courseId) as any[];

  // Load student profiles
  const profiles = db
    .prepare(
      `SELECT sp.student_id, u.name, sp.summary
       FROM student_profiles sp
       JOIN users u ON u.id = sp.student_id
       JOIN course_students cs ON cs.student_id = sp.student_id AND cs.course_id = ?`
    )
    .all(courseId) as any[];

  if (summaries.length === 0 && sessions.length === 0) {
    throw new Error('no_data_for_course');
  }

  // Build summary blocks
  const summaryBlocks = summaries
    .map((s: any) => {
      const analysis = jsonParse<any>(s.analysis, null);
      return (
        `Activity: ${s.title} (${s.topic})\n` +
        `Objective: ${s.objective}\n` +
        `Class comprehension: ${s.understanding_avg ?? '?'}%\n` +
        (analysis
          ? `Difficult topics: ${JSON.stringify(analysis.difficult_topics ?? [])}\n` +
            `Struggling students: ${JSON.stringify(analysis.struggling_students ?? [])}`
          : '(no detailed analysis)')
      );
    })
    .join('\n\n─────────────────\n\n');

  // Build per-student session history (for trend)
  const studentSessionBlocks = sessions
    .map((s: any) => {
      const topics = jsonParse<string[]>(s.difficult_topics, []);
      return (
        `Student ID: ${s.student_id} | Name: ${s.student_name}\n` +
        `Activity: ${s.activity_title}\n` +
        `Comprehension: ${s.comprehension_pct ?? '?'}% | Date: ${s.completed_at ?? ''}\n` +
        `Difficult topics: ${JSON.stringify(topics)}`
      );
    })
    .join('\n\n');

  // Build profile blocks
  const profileBlocks = profiles
    .map((p: any) => `Student ID: ${p.student_id} | Name: ${p.name}\nProfile: ${p.summary || '(no profile yet)'}`)
    .join('\n\n');

  const input =
    `Course: ${course.name} (${course.year_or_level})\n\n` +
    `=== ACTIVITY SUMMARIES (${summaries.length}) ===\n\n${summaryBlocks || '(none yet)'}\n\n` +
    `=== INDIVIDUAL SESSION HISTORY (for trend calculation) ===\n\n${studentSessionBlocks || '(none)'}\n\n` +
    `=== STUDENT PROFILES ===\n\n${profileBlocks || '(none)'}`;

  const client = requireAnthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system:
      'Sos un analista pedagógico experto. Te doy los resúmenes de todas las actividades de un curso, el historial de sesiones individuales de cada alumno (con comprensión % y fecha para calcular tendencias), y los perfiles cognitivos de los alumnos. ' +
      'Generá un análisis completo del curso. Para la tendencia de cada alumno, compará su comprensión cronológicamente: si mejoró entre actividades es "improving", si se mantuvo es "stable", si empeoró es "declining". ' +
      'Usá la herramienta submit_course_analysis para devolver el resultado. Escribí todo en español rioplatense, tono profesional.',
    messages: [{ role: 'user', content: input }],
    tools: [
      {
        name: 'submit_course_analysis',
        description: 'Submit the structured course analysis',
        input_schema: courseAnalyticsSchema,
      },
    ],
    tool_choice: { type: 'tool' as const, name: 'submit_course_analysis' },
  });

  const toolBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Course analyst did not call submit_course_analysis');
  }

  const analysis = toolBlock.input as unknown as CourseAnalytics;

  // Persist with upsert
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO course_analytics (id, course_id, analysis, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(course_id) DO UPDATE SET analysis = excluded.analysis, updated_at = excluded.updated_at`
  ).run(nanoid(), courseId, JSON.stringify(analysis), now, now);

  return analysis;
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
cd /Users/valenfranco/Desktop/criterIA && git add server/src/course-analyst.ts && git commit -m "feat: add Course Analyst with forced tool call for cross-activity analytics"
```

---

### Task A3: Fix teacher-routes.ts — JSON parsing + analytics + fire-and-forget

**Files:**
- Modify: `server/src/teacher-routes.ts`

- [ ] **Step 1: Fix JSON parsing in activity detail endpoint**

Find the `GET /api/teacher/activities/:id` handler. In the `latestSummary` block (around line 242-256), parse the `analysis` field before sending:

After the latestSummary query, add parsing:

```ts
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
```

Also parse `difficult_topics` for each session in the same endpoint:

```ts
    const sessions = sessionRows.map((s) => ({
      ...s,
      extracted_ideas: jsonParse(s.extracted_ideas, []),
      difficult_topics: jsonParse(s.difficult_topics, []),
    }));
```

- [ ] **Step 2: Fix JSON parsing in student detail endpoint**

Find the `GET /api/teacher/students/:id` handler. In the sessions mapping, add `difficult_topics` parsing:

Find where sessions are mapped with `extracted_ideas` and add `difficult_topics`:

```ts
      extracted_ideas: jsonParse(s.extracted_ideas, []),
      difficult_topics: jsonParse(s.difficult_topics, []),
```

- [ ] **Step 3: Add analytics to course detail response**

Find the `GET /api/teacher/courses/:courseId` handler. After loading students, add:

```ts
    const analyticsRow = db
      .prepare('SELECT analysis FROM course_analytics WHERE course_id = ?')
      .get(courseId as string) as { analysis: string } | undefined;

    const analytics = analyticsRow ? jsonParse<CourseAnalytics>(analyticsRow.analysis, null) : null;
```

Add `CourseAnalytics` to the imports from contracts.ts.

Update the response to include analytics:

```ts
    reply.send({ course, students, analytics });
```

- [ ] **Step 4: Fire-and-forget course analyst after generate-summary**

Find the `generate-summary` endpoint. After the `activity_summaries` INSERT, before the `reply.send`, add:

```ts
    // Fire-and-forget: update course analytics
    import('./course-analyst.js').then(({ runCourseAnalyst }) => {
      runCourseAnalyst(activityRow.course_id).catch((err) =>
        console.error('[generate-summary] Course analyst failed:', err)
      );
    });
```

- [ ] **Step 5: Typecheck and commit**

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run typecheck
cd /Users/valenfranco/Desktop/criterIA && git add server/src/teacher-routes.ts && git commit -m "feat: fix JSON parsing, add course analytics to detail, fire-and-forget course analyst"
```

---

## Smoke test after all tasks

```bash
cd /Users/valenfranco/Desktop/criterIA/server && npm run db:reset && npm run dev
```

```bash
# Course detail should now include analytics (null if no summaries yet)
curl -s -H "x-user-id: yairp" http://localhost:3001/api/teacher/courses/hist-3a | python3 -m json.tool

# Activity detail should have parsed analysis
curl -s -H "x-user-id: yairp" http://localhost:3001/api/teacher/activities/act-revolucion | python3 -m json.tool

# Student detail should have parsed difficult_topics per session
curl -s -H "x-user-id: yairp" http://localhost:3001/api/teacher/students/sofiam | python3 -m json.tool
```
