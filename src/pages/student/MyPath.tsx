import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { X } from "lucide-react";
import type {
  ListStudentCoursesResponse,
  ListStudentIdeasResponse,
  StudentIdea,
  Course,
} from "@contracts";

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
