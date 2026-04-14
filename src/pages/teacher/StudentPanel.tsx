import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ListCoursesResponse, CourseDetailResponse } from "@contracts";

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

  // Once courses load, set the selected course if not already set
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
        <p className="text-sm text-destructive font-body">Error al cargar los cursos. Intentá de nuevo.</p>
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

      {/* Course summary */}
      {detailLoading ? (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <p className="text-sm text-muted-foreground font-body">Cargando información del curso...</p>
        </div>
      ) : detailError ? (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <p className="text-sm text-destructive font-body">Error al cargar los datos del curso.</p>
        </div>
      ) : course ? (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h3 className="font-serif text-lg mb-3">{course.name} — Resumen general</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-body">Alumnos inscriptos</p>
              <p className="text-2xl font-serif text-primary">{students.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-body">Nivel / año</p>
              <p className="text-sm font-body mt-1">{course.year_or_level}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Student list */}
      {!detailLoading && !detailError && (
        <div className="space-y-2">
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body">No hay alumnos inscriptos en este curso.</p>
          ) : (
            students.map((student) => (
              <button
                key={student.id}
                onClick={() => navigate(`/profesor/alumnos/${student.id}`)}
                className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-body text-muted-foreground font-medium">
                  {student.avatar_initials ?? student.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-medium group-hover:text-primary transition-colors">{student.name}</p>
                  <p className="text-xs text-muted-foreground font-body">{student.email}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default StudentPanel;
