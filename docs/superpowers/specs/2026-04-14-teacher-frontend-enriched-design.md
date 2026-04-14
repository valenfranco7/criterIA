# Teacher Frontend — Enriched Panel & Course Analytics

**Date**: 2026-04-14
**Status**: Approved in brainstorming

## 1. Context

The backend now generates rich analytics per activity (ClassAnalysis) and auto-updates student profiles. The teacher frontend needs to display this data. Additionally, a new **Course Analyst** generates cross-activity analytics per course, updated automatically after each activity summary generation.

This spec covers:
1. **Course Analyst** — new Opus call that crosses all activities of a course
2. **course_analytics table** — stores the result per course
3. **StudentPanel renovation** — rich dashboard with course analytics, student rankings, difficult topics, suggested groups
4. **TeacherActivities update** — show ClassAnalysis after generating summary
5. **StudentProfile update** — show comprehension % and difficult topics per session in history

## 2. Course Analyst (Messages API, Opus, forced tool call)

### When it runs

Automatically after `POST /api/teacher/activities/:id/generate-summary` succeeds. Fire-and-forget — the teacher doesn't wait for it.

### Input

All `activity_summaries` for the course (each has a `ClassAnalysis` in the `analysis` column) + all student profiles for students in the course.

```
Course: Historia 3ro A
Students: 6

Activity Summaries:
─────────────────
Activity: "La Revolución de Mayo"
Class comprehension: 68%
Difficult topics: [{topic: "rol del Cabildo", student_count: 4}]
Struggling students: [{student_id: "mateol", comprehension: 45%}]

Activity: "Causas económicas de la independencia"
Class comprehension: 72%
...

Student Profiles:
─────────────────
sofiam — Sofía Martínez: Sofía uses spatial and visual analogies...
mateol — Mateo López: Mateo needs more structure...
```

### Output (forced tool call → structured JSON)

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
```

### Persistence

One row per course in `course_analytics`. Updated (not inserted) after each activity summary. If no row exists, create one.

## 3. Schema changes

### New table: course_analytics

```sql
CREATE TABLE course_analytics (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL UNIQUE REFERENCES courses(id),
  analysis TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

`UNIQUE` on `course_id` — one analytics row per course. Use INSERT OR REPLACE.

### contracts.ts additions

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

## 4. Backend changes

### New file: `server/src/course-analyst.ts`

`runCourseAnalyst(courseId)` — Messages API, Opus, forced tool call. Loads all activity_summaries for the course + student profiles. Returns `CourseAnalytics`.

### Modified: `server/src/teacher-routes.ts`

1. After `generate-summary` succeeds, fire-and-forget `runCourseAnalyst(courseId)` to update course analytics.
2. New endpoint: `GET /api/teacher/courses/:courseId/analytics` — returns the latest `course_analytics` row for the course.

### Modified: `server/src/teacher-routes.ts` (existing endpoint)

`GET /api/teacher/courses/:courseId` — already returns course + students. Add `analytics: CourseAnalytics | null` to the response.

## 5. Frontend changes

### StudentPanel.tsx — full renovation

Currently: course selector + simple student list.

New layout when a course is selected:

```
┌─────────────────────────────────────────────────┐
│ Historia 3ro A                          72% avg │
│ "En general el curso entendió las tensiones..." │
├─────────────────────────────────────────────────┤
│ Alumnos                                         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ SM  85%  │ │ ML  45%  │ │ VG  92%  │        │
│ │ Sofía ↑  │ │ Mateo ↓  │ │ Vale ↑   │        │
│ │ Fortal.. │ │ Dificul..│ │ Fortal.. │        │
│ └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────┤
│ Temas difíciles del curso                       │
│ • Rol del Cabildo (3 actividades)               │
│ • Causas económicas (2 actividades)             │
├─────────────────────────────────────────────────┤
│ Grupos sugeridos                                │
│ ┌─────────────────────────────────────┐        │
│ │ Grupo "Cabildo": Mateo, Thiago     │        │
│ │ Tema: rol del Cabildo              │        │
│ │ Ambos confunden Cabildo Abierto... │        │
│ └─────────────────────────────────────┘        │
└─────────────────────────────────────────────────┘
```

Data source: `GET /api/teacher/courses/:courseId` (with analytics) or `GET /api/teacher/courses/:courseId/analytics`.

Student cards are clickable → navigate to StudentProfile.

### TeacherActivities.tsx — show ClassAnalysis

When an activity has a summary with `analysis`, show it inline or in an expandable section:

- Comprensión promedio de la actividad
- Temas difíciles (list)
- Alumnos complicados (list with comprehension %)
- Grupos sugeridos (cards)
- Plan sugerido (markdown rendered)

Data source: `GET /api/teacher/activities/:id` → `latest_summary.analysis`

### StudentProfile.tsx — enrich session history

In the activity history, each session card shows:
- Comprehension % (colored badge)
- Difficult topics (tags)
- These come from `activity_sessions.comprehension_pct` and `difficult_topics`

Data source: already in the `sessions` array from `GET /api/teacher/students/:id`

## 6. Endpoints — summary

| Endpoint | Change |
|---|---|
| `GET /api/teacher/courses/:courseId` | Add `analytics: CourseAnalytics \| null` to response |
| `GET /api/teacher/courses/:courseId/analytics` | NEW — returns course analytics |
| `POST /api/teacher/activities/:id/generate-summary` | After success, fire-and-forget `runCourseAnalyst` |
| `GET /api/teacher/activities/:id` | Already returns `latest_summary` with `analysis` — no change needed |
| `GET /api/teacher/students/:id` | Already returns sessions — frontend reads `comprehension_pct` and `difficult_topics` from there |

## 7. Files — summary

| File | Action |
|---|---|
| `server/src/schema.sql` | Add `course_analytics` table |
| `server/src/contracts.ts` | Add `CourseAnalytics`, `CourseAnalyticsRow` |
| `server/src/course-analyst.ts` | Create — `runCourseAnalyst(courseId)` |
| `server/src/teacher-routes.ts` | Fire-and-forget course analyst after summary, add analytics endpoint, enrich course detail response |
| `src/pages/teacher/StudentPanel.tsx` | Full renovation — course dashboard with rankings, topics, groups |
| `src/pages/teacher/TeacherActivities.tsx` | Show ClassAnalysis when summary exists |
| `src/pages/teacher/StudentProfile.tsx` | Show comprehension % and difficult topics per session |

## 8. What does NOT change

- Student side (all pages, all endpoints)
- SocraticChat, MyPath, Conversations, StudentHome, StudentActivities
- The Managed Agent, agent.ts, system prompt
- ClassPlanning, TeacherCourses (for now)
- TeacherLayout
