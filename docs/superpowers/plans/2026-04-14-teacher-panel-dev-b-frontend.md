# Teacher Panel — Dev B (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renovate the teacher frontend to display enriched analytics: course dashboard with student rankings and groups (StudentPanel), activity analysis with difficult topics and suggested plan (TeacherActivities), and comprehension badges per session (StudentProfile).

**Architecture:** All data comes from existing API endpoints (fixed in Dev A plan to parse JSON). Frontend consumes `CourseAnalytics` from course detail, `ClassAnalysis` from activity detail, and `comprehension_pct` + `difficult_topics` from student sessions.

**Tech Stack:** React/Vite/TypeScript/Tailwind/shadcn · @tanstack/react-query · imports from `@contracts`

**Working directory:** `/Users/valenfranco/Desktop/criterIA`

**Depends on:** Dev A (backend) completing Tasks A1-A3 first — the API must return parsed JSON and include `analytics` in course detail.

---

## File Map

| File | Action | What it does |
|---|---|---|
| `src/pages/teacher/StudentPanel.tsx` | Rewrite | Rich course dashboard with analytics, student rankings, topics, groups |
| `src/pages/teacher/TeacherActivities.tsx` | Modify | Show ClassAnalysis in expandable section for finished activities |
| `src/pages/teacher/StudentProfile.tsx` | Modify | Show comprehension % badge and difficult topics tags per session |

---

### Task B1: StudentPanel — Rich course dashboard

**Files:**
- Modify: `src/pages/teacher/StudentPanel.tsx`

- [ ] **Step 1: Rewrite StudentPanel.tsx**

Replace the entire file with:

```tsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ListCoursesResponse, CourseDetailResponse, CourseAnalytics } from "@contracts";
import { TrendingUp, TrendingDown, Minus, Users } from "lucide-react";

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
  if (trend === "declining") return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function ComprehensionBar({ value }: { value: number }) {
  const color =
    value >= 70 ? "bg-green-500" : value >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

const StudentPanel = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { data: coursesData, isLoading: coursesLoading, isError: coursesError } = useQuery({
    queryKey: ["teacher-courses"],
    queryFn: () => apiFetch<ListCoursesResponse>("/api/teacher/courses"),
  });

  const courses = coursesData?.courses ?? [];

  const [selectedCourse, setSelectedCourse] = useState<string | null>(
    searchParams.get("curso")
  );

  useEffect(() => {
    if (!selectedCourse && courses.length > 0) {
      setSelectedCourse(courses[0].id);
    }
  }, [courses, selectedCourse]);

  const courseId = selectedCourse ?? null;

  const { data: courseDetailData, isLoading: detailLoading, isError: detailError } = useQuery({
    queryKey: ["teacher-course-detail", courseId],
    queryFn: () => apiFetch<CourseDetailResponse>(`/api/teacher/courses/${courseId}`),
    enabled: !!courseId,
  });

  const course = courseDetailData?.course;
  const students = courseDetailData?.students ?? [];
  const analytics: CourseAnalytics | null = (courseDetailData as any)?.analytics ?? null;

  if (coursesLoading) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-2xl font-serif mb-6">Panel de alumnos</h2>
        <p className="text-sm text-muted-foreground font-body">Cargando cursos...</p>
      </div>
    );
  }

  if (coursesError) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-2xl font-serif mb-6">Panel de alumnos</h2>
        <p className="text-sm text-destructive font-body">Error al cargar los cursos.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-serif mb-6">Panel de alumnos</h2>

      <select
        value={selectedCourse ?? ""}
        onChange={(e) => setSelectedCourse(e.target.value)}
        className="px-3 py-2 rounded-md border border-input bg-background text-sm font-body mb-6"
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {detailLoading ? (
        <p className="text-sm text-muted-foreground font-body">Cargando...</p>
      ) : detailError ? (
        <p className="text-sm text-destructive font-body">Error al cargar el curso.</p>
      ) : course ? (
        <div className="space-y-6">
          {/* Course header with analytics */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-lg">{course.name}</h3>
                <p className="text-sm text-muted-foreground font-body">{course.year_or_level} · {students.length} alumnos</p>
              </div>
              {analytics && (
                <div className="text-right">
                  <p className="text-3xl font-serif text-primary">{Math.round(analytics.course_comprehension_avg)}%</p>
                  <p className="text-xs text-muted-foreground font-body">comprensión promedio</p>
                </div>
              )}
            </div>
            {analytics?.course_summary && (
              <p className="text-sm font-body text-muted-foreground leading-relaxed">{analytics.course_summary}</p>
            )}
          </div>

          {/* Student rankings */}
          <div>
            <h4 className="font-serif text-base mb-3">Alumnos</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {analytics?.student_rankings ? (
                analytics.student_rankings
                  .sort((a, b) => b.comprehension_avg - a.comprehension_avg)
                  .map((ranking) => (
                    <button
                      key={ranking.student_id}
                      onClick={() => navigate(`/profesor/alumnos/${ranking.student_id}`)}
                      className="bg-card border border-border rounded-lg p-4 text-left hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-body font-medium text-muted-foreground">
                            {ranking.name.slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-sm font-body font-medium">{ranking.name}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-body font-medium">{Math.round(ranking.comprehension_avg)}%</span>
                          <TrendIcon trend={ranking.trend} />
                        </div>
                      </div>
                      <ComprehensionBar value={ranking.comprehension_avg} />
                      <div className="mt-2 space-y-1">
                        {ranking.main_strengths && (
                          <p className="text-xs text-muted-foreground font-body">
                            <span className="text-green-600">+</span> {ranking.main_strengths}
                          </p>
                        )}
                        {ranking.main_difficulties && (
                          <p className="text-xs text-muted-foreground font-body">
                            <span className="text-red-500">−</span> {ranking.main_difficulties}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
              ) : (
                students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => navigate(`/profesor/alumnos/${student.id}`)}
                    className="bg-card border border-border rounded-lg p-4 text-left hover:border-primary/30 transition-all flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-body font-medium text-muted-foreground">
                      {student.avatar_initials ?? student.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-body font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground font-body">{student.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Difficult topics */}
          {analytics?.accumulated_difficult_topics && analytics.accumulated_difficult_topics.length > 0 && (
            <div>
              <h4 className="font-serif text-base mb-3">Temas difíciles del curso</h4>
              <div className="space-y-2">
                {analytics.accumulated_difficult_topics.map((topic, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-body font-medium">{topic.topic}</p>
                      <span className="text-xs text-muted-foreground font-body bg-muted px-2 py-0.5 rounded">
                        {topic.frequency} {topic.frequency === 1 ? "actividad" : "actividades"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-body">{topic.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested groups */}
          {analytics?.suggested_groups && analytics.suggested_groups.length > 0 && (
            <div>
              <h4 className="font-serif text-base mb-3">Grupos sugeridos</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analytics.suggested_groups.map((group, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-primary" />
                      <p className="text-sm font-body font-medium">{group.group_name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground font-body mb-2">
                      Tema: {group.topic}
                    </p>
                    <p className="text-xs text-muted-foreground font-body mb-2">
                      {group.rationale}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {group.student_ids.map((sid) => {
                        const student = students.find((s) => s.id === sid);
                        return (
                          <span key={sid} className="text-xs bg-muted px-2 py-0.5 rounded font-body">
                            {student?.name ?? sid}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No analytics yet */}
          {!analytics && (
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground font-body">
                Todavía no hay análisis del curso. Se genera automáticamente después de cada resumen de actividad.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default StudentPanel;
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/valenfranco/Desktop/criterIA && npx tsc -p tsconfig.app.json --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/teacher/StudentPanel.tsx && git commit -m "feat: renovate StudentPanel with course analytics dashboard"
```

---

### Task B2: TeacherActivities — Show ClassAnalysis

**Files:**
- Modify: `src/pages/teacher/TeacherActivities.tsx`

- [ ] **Step 1: Add expandable analysis section**

The finished activities already have a "Generar resumen" button. After the summary is generated, the response includes `analysis` (ClassAnalysis). We need:

1. Add state for expanded activity: `const [expandedId, setExpandedId] = useState<string | null>(null);`
2. Add a query for activity detail when expanded
3. Show analysis inline when expanded

Add these imports at the top:

```ts
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ClassAnalysis } from "@contracts";
```

Add state after existing state:

```ts
const [expandedId, setExpandedId] = useState<string | null>(null);
```

Add a query for the expanded activity detail:

```ts
const { data: activityDetail } = useQuery({
  queryKey: ["teacher-activity-detail", expandedId],
  queryFn: () => apiFetch<any>(`/api/teacher/activities/${expandedId}`),
  enabled: !!expandedId,
});

const expandedAnalysis: ClassAnalysis | null = activityDetail?.latest_summary?.analysis ?? null;
```

In the finished tab's "Ver resultados" button, make it toggle the expanded section:

```tsx
<Button
  variant="outline"
  size="sm"
  className="w-full"
  onClick={() => setExpandedId(expandedId === act.id ? null : act.id)}
>
  {expandedId === act.id ? (
    <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
  ) : (
    <Eye className="h-3.5 w-3.5 mr-1.5" />
  )}
  {expandedId === act.id ? "Ocultar" : "Ver resultados"}
</Button>
```

After the card's closing `</div>` (but inside the `.map()`), add the expandable analysis section:

```tsx
{expandedId === act.id && expandedAnalysis && (
  <div className="mt-3 border-t border-border pt-4 space-y-4">
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-muted/50 rounded-lg p-3 text-center">
        <p className="text-2xl font-serif text-primary">{Math.round(expandedAnalysis.class_comprehension_avg)}%</p>
        <p className="text-xs text-muted-foreground font-body">comprensión</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 text-center">
        <p className="text-2xl font-serif">{expandedAnalysis.difficult_topics?.length ?? 0}</p>
        <p className="text-xs text-muted-foreground font-body">temas difíciles</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 text-center">
        <p className="text-2xl font-serif">{expandedAnalysis.struggling_students?.length ?? 0}</p>
        <p className="text-xs text-muted-foreground font-body">necesitan ayuda</p>
      </div>
    </div>

    {expandedAnalysis.class_summary && (
      <p className="text-sm font-body text-muted-foreground leading-relaxed">{expandedAnalysis.class_summary}</p>
    )}

    {expandedAnalysis.difficult_topics && expandedAnalysis.difficult_topics.length > 0 && (
      <div>
        <p className="text-xs font-body text-muted-foreground uppercase tracking-wider mb-2">Temas difíciles</p>
        <div className="flex flex-wrap gap-2">
          {expandedAnalysis.difficult_topics.map((t, i) => (
            <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded font-body">
              {t.topic} ({t.student_count})
            </span>
          ))}
        </div>
      </div>
    )}

    {expandedAnalysis.suggested_plan && (
      <div>
        <p className="text-xs font-body text-muted-foreground uppercase tracking-wider mb-2">Plan sugerido</p>
        <div className="bg-muted/50 rounded-lg p-4 text-sm font-body text-foreground leading-relaxed whitespace-pre-wrap">
          {expandedAnalysis.suggested_plan}
        </div>
      </div>
    )}
  </div>
)}
```

Also do the same for the "active" tab's "Ver resultados" button — same toggle pattern.

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/valenfranco/Desktop/criterIA && npx tsc -p tsconfig.app.json --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/teacher/TeacherActivities.tsx && git commit -m "feat: show ClassAnalysis in expandable section for finished activities"
```

---

### Task B3: StudentProfile — Comprehension badges and topics

**Files:**
- Modify: `src/pages/teacher/StudentProfile.tsx`

- [ ] **Step 1: Add comprehension badge and difficult topics to session cards**

In StudentProfile.tsx, find where session cards are rendered in the activity history. Each session card shows summary text and a button to expand. Add comprehension and topics display.

Find the session card rendering (inside the sessions map). After the session summary text, add:

```tsx
{/* Comprehension & difficult topics */}
<div className="flex items-center gap-3 mt-2">
  {(session as any).comprehension_pct != null && (
    <span className={`text-xs px-2 py-0.5 rounded font-body font-medium ${
      (session as any).comprehension_pct >= 70
        ? "bg-green-50 text-green-700"
        : (session as any).comprehension_pct >= 40
        ? "bg-yellow-50 text-yellow-700"
        : "bg-red-50 text-red-700"
    }`}>
      {(session as any).comprehension_pct}% comprensión
    </span>
  )}
  {Array.isArray((session as any).difficult_topics) && (session as any).difficult_topics.length > 0 && (
    <div className="flex flex-wrap gap-1">
      {((session as any).difficult_topics as string[]).map((topic, i) => (
        <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded font-body text-muted-foreground">
          {topic}
        </span>
      ))}
    </div>
  )}
</div>
```

The `(session as any)` cast is needed because the current query doesn't type sessions — it uses `apiFetch` without a generic type for the full response.

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/valenfranco/Desktop/criterIA && npx tsc -p tsconfig.app.json --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/teacher/StudentProfile.tsx && git commit -m "feat: show comprehension badges and difficult topics in student profile"
```

---

## End-to-End Test

After both Dev A and Dev B complete:

1. Reset DB: `cd server && npm run db:reset && npm run dev`
2. Clear agent IDs in `.env` if needed
3. As sofiam: chat with Sócrates → close session
4. As yairp: go to TeacherActivities → click "Generar resumen" on the activity
5. Expand activity → should see ClassAnalysis (comprehension %, topics, plan)
6. Go to StudentPanel → select course → should see CourseAnalytics (rankings with trends, groups, topics)
7. Click a student → StudentProfile → sessions show comprehension badges
