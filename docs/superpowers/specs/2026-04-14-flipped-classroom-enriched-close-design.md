# Flipped Classroom — Enriched Close & Class Analytics

**Date**: 2026-04-14
**Status**: Approved in brainstorming

## 1. Context

The product pivots from "activity during class" to **flipped classroom** (aula invertida). Students complete activities BEFORE class using Sócrates (the Managed Agent). When all sessions are done, the teacher generates a class-wide analysis that tells them what students understood, what was hard, and how to plan the next class.

This spec covers four interconnected changes:
1. **Enriched session close** — Sócrates generates more data per session (comprehension %, difficult topics)
2. **Automatic profile update** — After close, a separate Opus call rewrites the student's cognitive profile
3. **Class Analyst** — A new Opus call aggregates all session reports into a class-wide panorama
4. **File upload on activity creation** — Teacher can attach reference material that Sócrates reads

## 2. Architecture — Three LLM layers

```
                    PER STUDENT                           PER CLASS
                    ──────────                            ─────────
Sócrates            Actualizador de perfil                Analista de clase
(Managed Agent)     (Messages API, Opus)                  (Messages API, Opus)
                    
Conversa con el     Toma conversación +                   Toma todos los reportes
alumno. Al cerrar   perfil actual →                       de una actividad →
genera reporte      reescribe                             genera panorama general
enriquecido.        student_profiles.summary.             para el profesor.

Se dispara:         Se dispara:                           Se dispara:
alumno interactúa   automáticamente después               profesor toca
                    del cierre (background)               "Generar resumen"
```

All three use Opus 4.6.

## 3. Enriched session close (Sócrates)

### submit_session_report — new shape

The custom tool on the Managed Agent gets two new fields:

```json
{
  "session_summary": "string — 2-4 sentences for the student",
  "teacher_report": "string — markdown for the teacher (## Recorrido / ## Ideas clave / ## Observaciones)",
  "extracted_ideas": [
    { "text": "string", "question_that_triggered_it": "string | null" }
  ],
  "comprehension_pct": "number 0-100 — how well the student understood the topic",
  "difficult_topics": ["string — specific topics where the student struggled"]
}
```

### Flow

1. Student clicks "Cerrar actividad"
2. Backend sends close message to Managed Agent
3. Sócrates calls `submit_session_report` with enriched data
4. Backend persists to `activity_sessions`:
   - `status = 'completed'`
   - `session_summary`, `teacher_report`, `extracted_ideas` (existing)
   - `comprehension_pct`, `difficult_topics` (new columns)
5. Backend inserts `student_ideas` rows (existing)
6. Backend responds to frontend immediately with `{ session }`
7. **In background (fire and forget):** Backend calls the profile updater

### Profile updater (background, post-close)

Reutilizes the existing LLM #5 pattern from `teacher-agents.ts` (`POST /api/teacher/students/:id/refresh-summary`). The logic is the same — takes all sessions/ideas/reports for the student and rewrites `student_profiles.summary`. The difference is it's now triggered automatically after every close, not just when the teacher clicks a button.

Implementation: extract the LLM #5 logic into a reusable function `refreshStudentProfile(studentId)` in a new shared module `server/src/profile-updater.ts` (to avoid coupling `student-routes.ts` to `teacher-agents.ts`). Both the student close endpoint and the teacher's manual refresh button call this same function.

**When auto-closing sessions during summary generation** (section 4, step 3), profile updates are **skipped** — they would fire N concurrent updates that conflict and waste tokens. The Analyst already has the session data it needs.

## 4. Class Analyst

A single `messages.create()` call to Opus 4.6 with structured output.

### When it runs

Professor clicks "Generar resumen de clase" on an activity.

### Flow

1. `POST /api/teacher/activities/:id/generate-summary`
2. Backend finds all `activity_sessions` for this activity
3. If any sessions have `status = 'in_progress'`:
   - Close them in parallel: `Promise.all(openSessions.map(s => sendCloseAndCollect(s.managed_session_id)))`
   - Persist each close result to DB
   - Wait for all to finish before proceeding
4. Collect all enriched session reports
5. Call Opus via Messages API using a forced tool call to get structured JSON (same pattern as existing `summarizeActivity`):

```ts
const response = await client.messages.create({
  model: 'claude-opus-4-6',
  max_tokens: 4096,
  system: analystSystemPrompt,
  messages: [{ role: 'user', content: reportsSummaryText }],
  tools: [{
    name: 'submit_class_analysis',
    description: 'Submit the class analysis results',
    input_schema: classAnalysisSchema,
  }],
  tool_choice: { type: 'tool', name: 'submit_class_analysis' },
});
// Extract structured JSON from the tool_use block input
```

This forces Opus to output structured JSON matching the schema. No `output_config` needed — the tool call pattern is supported by the current SDK and is the existing pattern used in `teacher-agents.ts`.

### Input to the Analyst

```
Activity: {title, topic, objective}

Session Reports:
─────────────────
Student ID: sofiam
Student Name: Sofía Martínez
Comprehension: 85%
Difficult topics: ["rol del Cabildo"]
Summary: "Sofía conectó la exclusión política con presión física..."
Ideas: ["La exclusión era permanente — no podían cambiar dónde nacieron"]
Teacher report: "## Recorrido ..."

Student ID: mateol
Student Name: Mateo López
Comprehension: 45%
Difficult topics: ["causas económicas", "rol del Cabildo"]
Summary: "Mateo necesitó varios intentos para distinguir..."
Ideas: [...]
Teacher report: "## Recorrido ..."

(one block per student — student_id is included so the LLM can reference it in struggling_students and suggested_groups)
```

### Output schema (structured)

```ts
interface ClassAnalysis {
  class_comprehension_avg: number;  // 0-100
  difficult_topics: Array<{
    topic: string;
    student_count: number;
    description: string;  // what specifically was hard about this topic
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
    rationale: string;  // why these students should work together
  }>;
  class_summary: string;    // narrative summary of how the class did
  suggested_plan: string;   // suggested class plan addressing what was hard
}
```

### Persistence

The result is stored in `activity_summaries`. The existing `summary` field holds the `class_summary`. The existing `understanding_avg` holds `class_comprehension_avg`. A new `analysis` column (TEXT, default NULL) holds the full structured output as JSON for the frontend to render. The existing `summarizeActivity` function in `teacher-agents.ts` is **replaced** by `runClassAnalyst` — it's the same endpoint, richer output.

**Note on `CloseResult` in `agent.ts`:** The interface must be updated to include the new fields:
```ts
export interface CloseResult {
  session_summary: string;
  teacher_report: string;
  extracted_ideas: ExtractedIdea[];
  comprehension_pct: number | null;   // NEW
  difficult_topics: string[];         // NEW
}
```
The fallback path in `sendCloseAndCollect` (when the tool is not called) must also return defaults: `comprehension_pct: null, difficult_topics: []`.

## 5. Activity creation with file upload

### Flow

1. Professor creates activity with context (text fields) + optionally uploads a file (PDF, doc, etc.)
2. Backend uploads file to Anthropic Files API: `client.beta.files.upload({ file, purpose: 'agent' })`
3. Stores returned `file_id` in `activities.anthropic_file_id`
4. When a student starts a session, if `anthropic_file_id` exists, mount it as a resource:

```ts
const session = await client.beta.sessions.create({
  agent: agentId,
  environment_id: environmentId,
  resources: activity.anthropic_file_id
    ? [{ type: 'file', file_id: activity.anthropic_file_id, mount_path: '/workspace/material.pdf' }]
    : [],
});
```

Sócrates has the file available in the container at `/workspace/material.pdf` and can read it during the conversation when relevant.

**Note:** The `resources` array on `sessions.create` is the documented way to mount files in Managed Agents sessions (verified in the SDK docs and quickstart). The file must first be uploaded via `client.beta.files.upload()` with `purpose: 'agent'`.

### File handling

- Accepted types: PDF, DOC, DOCX, TXT, MD (whatever Anthropic Files API supports)
- Max size: follows Anthropic's limit (500 MB)
- The file is uploaded once per activity, reused across all student sessions
- Frontend: add a file input to the activity creation form
- **Multipart handling:** The activity creation endpoint changes from JSON body to multipart/form-data. Requires `@fastify/multipart` package. The activity fields are sent as form fields, the file as a file part. Alternatively: a separate `POST /api/teacher/upload` endpoint that returns `file_id`, then the activity creation stays JSON and passes the `file_id`. **Recommended: separate upload endpoint** — simpler, keeps activity creation as JSON.

## 6. Schema changes

### activity_sessions — new columns

```sql
comprehension_pct INTEGER,                -- 0-100, from Sócrates close
difficult_topics TEXT DEFAULT '[]'         -- JSON array of strings
```

### activities — new column

```sql
anthropic_file_id TEXT                     -- nullable, Anthropic Files API ID
```

### activity_summaries — new column

```sql
analysis TEXT                              -- JSON, full ClassAnalysis output (nullable, NULL until generated)
```

### contracts.ts changes

```ts
// ActivitySession — add:
comprehension_pct: number | null;
difficult_topics: string[];

// Activity — add:
anthropic_file_id: string | null;

// ActivitySummary — add:
analysis: ClassAnalysis | null;

// NEW interface:
interface ClassAnalysis {
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

## 7. Endpoints — changes

| Endpoint | Change |
|---|---|
| `POST /api/student/sessions/:id/close` | Enriched `submit_session_report` (2 new fields). Fire-and-forget profile update after close. |
| `POST /api/teacher/upload` | **NEW** — accepts file, uploads to Anthropic Files API, returns `{ file_id }`. |
| `POST /api/teacher/activities` | Add optional `anthropic_file_id` field to `CreateActivityRequest`. |
| `POST /api/teacher/activities/:id/generate-summary` | Close open sessions in parallel → collect all reports → call Class Analyst → persist enriched `activity_summaries`. |
| `GET /api/teacher/activities/:id` | Return `analysis` JSON from `activity_summaries` in the response. |
| `POST /api/student/activities/:id/start` | If activity has `anthropic_file_id`, mount file as resource in managed session. |

| Endpoint | No change |
|---|---|
| All other student endpoints | Same |
| `POST /api/teacher/students/:id/refresh-summary` | Same interface, internal logic extracted to reusable function |
| All other teacher endpoints | Same |

## 8. Files — changes

| File | Action | What changes |
|---|---|---|
| `server/src/socratic/agent.ts` | Modify | Update `submit_session_report` tool schema (add `comprehension_pct`, `difficult_topics`). Update `createManagedSession` to accept optional `fileId` for resource mounting. Update `CloseResult` interface. |
| `server/src/socratic/prompts/system-socrates.md` | Modify | Update `<session_close>` section: add `comprehension_pct` ("Rate 0-100 how well the student understood the core objective of the activity — 0 means no understanding, 100 means full mastery") and `difficult_topics` ("List specific sub-topics where the student showed confusion, needed extra scaffolding, or couldn't articulate a clear idea"). |
| `server/src/student-routes.ts` | Modify | Close endpoint persists new fields + fires profile update. Start endpoint passes `anthropic_file_id` to `createManagedSession`. |
| `server/src/teacher-routes.ts` | Modify | Activity creation accepts file upload. Generate-summary closes open sessions + calls Analyst. Activity detail returns analysis. |
| `server/src/profile-updater.ts` | Create | Extracted `refreshStudentProfile(studentId)` — shared by student close + teacher manual refresh. |
| `server/src/teacher-agents.ts` | Modify | Remove inline profile refresh (now in `profile-updater.ts`). Replace `summarizeActivity` with `runClassAnalyst`. |
| `server/src/contracts.ts` | Modify | Add new fields to interfaces, add `ClassAnalysis` interface. |
| `server/src/schema.sql` | Modify | Add new columns. |

## 9. What does NOT change

- `SocraticChat.tsx` — same chat experience for the student
- `StudentActivities.tsx`, `StudentHome.tsx`, `MyPath.tsx`, `Conversations.tsx` — same
- The Managed Agent Sócrates setup (same agent, same environment, same model)
- `db.ts`, `auth.ts`, `server.ts` — same
- The socratic conversation flow — same

## 10. Future work (out of scope for this spec)

- Teacher frontend to display the enriched analytics (new UI for `ClassAnalysis`)
- Activity creation frontend changes (file upload input)
- Student-initiated free conversations (not tied to an activity)
- Suggested plan → automatic class generation flow
