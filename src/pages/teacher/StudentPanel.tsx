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
