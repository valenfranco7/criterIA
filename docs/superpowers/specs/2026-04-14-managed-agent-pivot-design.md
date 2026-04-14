# Managed Agent Pivot — Design Spec

**Date**: 2026-04-14
**Status**: Approved in brainstorming

## 1. Context

The original student-side architecture used a two-agent pipeline per chat turn: Haiku analyzer (cold classification) → Sonnet tutor (warm generation), with hard-coded phase transitions (anchoring → exploration → tension → consolidation) managed by backend logic.

This pivot replaces the entire pipeline with a single **Claude Managed Agent (Opus 4.6)** that acts as each student's personal Socrates. No phases, no analyzer, no artificial constraints. The agent uses its full capability to read the student and guide the conversation.

The key differentiator: each student's **profile** (`student_profiles.summary`) and **previous session summaries** are injected as context, so the agent genuinely knows the student — how they think, what works for them, what doesn't.

## 2. Architecture

```
Frontend (unchanged)
    ↕ REST API (same endpoints, same shapes)
Our Fastify Backend
    ↕ Managed Agents API (SSE events)
Anthropic Infrastructure (Opus 4.6 agent + container)
```

The frontend does not change. Our backend acts as a proxy: it translates REST requests into Managed Agent events and collects responses.

### Components

| Component | What it does |
|---|---|
| `server/src/socratic/agent.ts` | Creates/manages the Managed Agent and Environment (one-time setup), creates sessions, sends events, collects responses |
| `server/src/socratic/prompts/system-socrates.md` | System prompt: socratic methodology, how to use student context, tone, rules |
| `server/src/student-routes.ts` | Same endpoints, new internal implementation that delegates to `agent.ts` |

### Deleted files

| File | Reason |
|---|---|
| `server/src/socratic/analyzer.ts` | Replaced by Opus's own judgment |
| `server/src/socratic/tutor.ts` | Replaced by Managed Agent |
| `server/src/socratic/engine.ts` | No more phase orchestration |
| `server/src/socratic/closer.ts` | Replaced by custom tool on the agent |
| `server/src/socratic/prompts/analyzer.md` | No more analyzer |
| `server/src/socratic/prompts/closer.md` | Closing logic is in system-socrates.md |
| `server/src/socratic/prompts/system-tutor.md` | Replaced by system-socrates.md |

### Minor frontend change

- `src/pages/student/SocraticChat.tsx` — remove the `current_phase` subtitle (line ~178). Replace with activity topic or remove entirely. This is the only frontend change.

### Unchanged files

- All other frontend pages (`StudentActivities.tsx`, `StudentHome.tsx`, `MyPath.tsx`, `Conversations.tsx`)
- `server/src/contracts.ts` (one new field added: `managed_session_id`)
- `server/src/db.ts`, `server/src/auth.ts`, `server/src/server.ts`
- `server/src/schema.sql` (one ALTER ADD COLUMN)
- `server/src/teacher-routes.ts`, `server/src/teacher-agents.ts`

## 3. Managed Agent Setup (one-time)

### Agent

Created once via `client.beta.agents.create()`. The agent ID is stored in an env var or config.

```ts
const agent = await client.beta.agents.create({
  name: "Socrates",
  model: "claude-opus-4-6",
  system: systemPrompt, // from system-socrates.md
  tools: [
    {
      type: "custom",
      name: "submit_session_report",
      description: "Called when the student ends the session. Submits a structured close report with summary for the student, detailed report for the teacher, and extracted ideas the student produced during the conversation.",
      input_schema: {
        type: "object",
        properties: {
          session_summary: {
            type: "string",
            description: "2-4 sentence summary of the session, written for the student"
          },
          teacher_report: {
            type: "string",
            description: "Structured markdown report for the teacher with ## headers: Recorrido / Ideas clave / Observaciones"
          },
          extracted_ideas: {
            type: "array",
            description: "Ideas the student produced during the conversation, in their own words",
            items: {
              type: "object",
              properties: {
                text: { type: "string", description: "The idea, in the student's words" },
                question_that_triggered_it: { type: "string", description: "The question that led to this idea" }
              },
              required: ["text"]
            }
          }
        },
        required: ["session_summary", "teacher_report", "extracted_ideas"]
      }
    }
  ]
});
```

No `agent_toolset_20260401` — the agent is purely conversational. It doesn't need bash, file ops, or web search. Only the custom tool for session close.

### Environment

Created once. Minimal config since the agent doesn't use the container for anything beyond what's required.

```ts
const environment = await client.beta.environments.create({
  name: "criteria-env",
  config: {
    type: "cloud",
    networking: { type: "unrestricted" }
  }
});
```

Both IDs (`AGENT_ID`, `ENVIRONMENT_ID`) are stored as env vars in `server/.env`.

### Prerequisites

- **Upgrade `@anthropic-ai/sdk` to latest** (`npm install @anthropic-ai/sdk@latest`). The current version (0.30.1) does not include Managed Agents API (`client.beta.agents`, `client.beta.sessions`, `client.beta.environments`). Requires `>=0.85.0`.

## 4. System Prompt (`system-socrates.md`)

The system prompt defines who Socrates is. It does NOT contain student-specific context — that goes in the first `user.message` per session.

Content of the system prompt:

- **Identity**: You are Socrates, a personal tutor. You guide through questions, never give answers directly.
- **Methodology**: Ask one question at a time. Listen deeply. If the student is stuck, lower abstraction — don't push. If there's resistance, absorb it. If there's flow, go deeper.
- **Tone**: Warm, curious, respectful. Like a mentor who genuinely cares. Speak in the student's language (Spanish, informal "vos").
- **Rules**: Never give the answer. Never lecture. One question per turn. Match the student's pace. If they arrive at an insight, celebrate it briefly and build on it.
- **On using student context**: You'll receive the student's profile and previous session summaries. Use them to adapt your approach — reference past insights, build on what they already understand, avoid patterns that didn't work before. Don't mention the profile explicitly ("according to your profile..."). Just know them.
- **On the close tool**: When told the student is ending the session, call `submit_session_report` with a summary, teacher report, and extracted ideas. Ideas must be the student's own words and thoughts, not yours.

## 5. Per-Session Context Injection

When a session starts, the first `user.message` contains the student's context. This is NOT visible to the student — it's injected by the backend before the student's first actual message.

```
[System message via user.message]:

## Student Profile
Name: Sofía Martínez
Profile: Sofía uses spatial and visual analogies to build understanding.
She responds well to concrete examples and metaphors. When blocked,
lowering abstraction with a physical analogy helps her re-engage...

## Previous Session Summaries
- "La Revolución de Mayo" (2026-04-10): Sofía connected the concept of
  political exclusion with physical pressure — "when the system has no
  valve, it explodes." She arrived at her own criterion for revolution...

## Current Activity
Title: La Revolución de Mayo desde tu mirada
Topic: Semana de Mayo — causas, protagonistas, rol del Cabildo
Objective: Que el alumno construya su propio criterio sobre qué hace
que una revolución sea inevitable.
Teacher notes: (from ActivityConfig if present)

---
Begin the conversation with the student. Your first message should
engage them with the topic in a way that connects to what you know
about how they think.
```

The agent then generates the first message — already personalized for this specific student.

## 6. Endpoint Flows

**Critical rule from Managed Agents docs: always open the stream BEFORE sending events.** The stream only delivers events that occur after it opens. If you send first, early events are missed.

### `POST /api/student/activities/:id/start`

1. Validate: activity exists, is active, student belongs to course, no existing session
2. Create `activity_session` in DB (status: `in_progress`, `managed_session_id`: null)
3. Create Managed Agent session: `client.beta.sessions.create({ agent: AGENT_ID, environment_id: ENVIRONMENT_ID })`
4. Store `managed_session_id` in DB
5. **Stream-first**: Open stream `client.beta.sessions.events.stream(managedSessionId)`
6. **Then send**: `client.beta.sessions.events.send(managedSessionId, { events: [{ type: "user.message", content: [{ type: "text", text: contextMessage }] }] })`
7. Collect `agent.message` events until `session.status_idle` (break on idle with `stop_reason.type !== 'requires_action'`)
8. Concatenate all `agent.message` text blocks → first assistant message
9. Persist the assistant message in our `messages` table
10. Return `{ session }`

### `POST /api/student/sessions/:id/messages`

1. Validate: session exists, belongs to student, is `in_progress`
2. Load `managed_session_id` from DB
3. Persist student message in our `messages` table
4. **Stream-first**: Open stream
5. **Then send**: `user.message` with the student's text
6. Collect `agent.message` events until `session.status_idle`
7. Concatenate all `agent.message` text blocks → assistant response
8. Persist assistant message in our `messages` table
9. Return `{ user_message, assistant_message, session }`

### `POST /api/student/sessions/:id/close`

1. Validate: session exists, belongs to student, is `in_progress`
2. Load `managed_session_id` from DB
3. **Stream-first**: Open stream
4. **Then send**: `user.message`: "El alumno decidió cerrar la sesión. Generá el reporte de cierre usando la herramienta submit_session_report."
5. Collect events until either:
   - `agent.custom_tool_use` with name `submit_session_report` → extract the structured input
   - `session.status_idle` without tool call → fallback (shouldn't happen)
6. Send `user.custom_tool_result` confirming receipt
7. Wait for `session.status_idle`
8. Persist in DB (in a transaction):
   - Update session: status=completed, session_summary, teacher_report, extracted_ideas
   - Insert each extracted idea into `student_ideas`
9. Archive the Managed Agent session
10. Return `{ session }`

## 7. Schema Change

Add `managed_session_id` to the `CREATE TABLE activity_sessions` in `schema.sql` (no ALTER — the DB is recreated from scratch with `npm run db:reset`):

```sql
managed_session_id TEXT   -- Anthropic Managed Agent session ID (sesn_...)
```

In `contracts.ts`, add to `ActivitySession`:
```ts
managed_session_id: string | null;
```

### Orphaned columns

The following columns remain in the schema but are no longer actively used by the new architecture. They stay for backwards compatibility with seed data and teacher-side reads:

- `activity_sessions.current_phase` — set to `'anchoring'` on create, never updated. The frontend subtitle in SocraticChat that showed the phase should be removed or replaced with the activity topic.
- `activity_sessions.phase_turn_count` — stays at 0.
- `messages.phase_at_turn` — set to null for new messages.
- `messages.analyzer_json` — set to null for new messages.

## 8. Environment Variables

Add to `server/.env`:

```
ANTHROPIC_AGENT_ID=agent_xxx      # set after first agent.create()
ANTHROPIC_ENVIRONMENT_ID=env_xxx  # set after first environment.create()
```

`agent.ts` exports a setup function that creates these if they don't exist yet (first-run bootstrap), and reads from env vars on subsequent runs.

## 9. Error Handling

- If `sessions.create()` fails → return 503 to frontend
- If stream drops mid-conversation → the Managed Agent session is still alive. On next request, we can reconnect (sessions persist server-side)
- If the close tool isn't called by the agent → fallback: extract whatever `agent.message` text was returned, use it as session_summary, leave teacher_report empty
- If `sessions.events.send()` fails → retry once, then return 502

## 10. What This Does NOT Change

- The frontend REST API contract (same endpoints, same response shapes). One minor UI tweak: SocraticChat removes the phase subtitle.
- The teacher side. Teacher routes, teacher agents (LLM #1, #4, #5) are completely separate.
- MyPath, Conversations, StudentActivities, StudentHome — all work the same.
- The seed data. Same students, courses, activities.
- The `contracts.ts` types (except adding `managed_session_id`).
