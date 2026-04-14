import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface StudentIdea {
  id: string;
  text: string;
  course_id: string;
  activity_id: string | null;
  question_that_triggered_it: string | null;
  connections: string[];
  created_at: string;
}

interface IdeasResponse {
  ideas: StudentIdea[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const MyPath = () => {
  const [selectedIdea, setSelectedIdea] = useState<StudentIdea | null>(null);

  const { data, isLoading, isError } = useQuery<IdeasResponse>({
    queryKey: ["student-ideas"],
    queryFn: () => apiFetch("/api/student/ideas"),
  });

  const ideas = data?.ideas ?? [];

  // Visual layout positions (cycles if more than positions defined)
  const basePositions = [
    { x: 15, y: 10 },
    { x: 55, y: 15 },
    { x: 30, y: 35 },
    { x: 70, y: 40 },
    { x: 45, y: 60 },
    { x: 20, y: 62 },
    { x: 75, y: 65 },
    { x: 50, y: 80 },
  ];

  const positions = ideas.map((_, i) => basePositions[i % basePositions.length]);

  if (isLoading) {
    return (
      <div className="p-8 animate-fade-in">
        <p className="text-sm text-muted-foreground font-body">Cargando tu recorrido...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 animate-fade-in">
        <p className="text-sm text-destructive font-body">No se pudo cargar tu recorrido.</p>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-3xl">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-1">
          Tu recorrido
        </p>
        <h2 className="text-2xl font-serif mb-1">
          {ideas.length === 0
            ? "Todavía no construiste ideas"
            : `Descubriste ${ideas.length} idea${ideas.length !== 1 ? "s" : ""}`}
        </h2>
        <p className="text-sm text-muted-foreground font-body italic mb-8">
          {ideas.length > 0 ? "Esto es tuyo. Lo pensaste vos." : "Completá una actividad para empezar."}
        </p>
      </div>

      {ideas.length > 0 && (
        <>
          {/* Visual map */}
          <div
            className="relative bg-card border border-border rounded-lg overflow-hidden"
            style={{ height: "500px" }}
          >
            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {ideas.map((idea, fromIdx) =>
                idea.connections.map((connId) => {
                  const toIdx = ideas.findIndex(i => i.id === connId);
                  if (toIdx === -1 || fromIdx >= positions.length || toIdx >= positions.length)
                    return null;
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
            {ideas.map((idea, i) => {
              if (i >= positions.length) return null;
              return (
                <button
                  key={idea.id}
                  onClick={() => setSelectedIdea(idea)}
                  className="absolute transform -translate-x-1/2 max-w-[200px] p-3 rounded-lg bg-background border border-border shadow-sm hover:border-primary/40 hover:shadow-md transition-all text-left group"
                  style={{ left: `${positions[i].x}%`, top: `${positions[i].y}%` }}
                >
                  <p className="text-xs font-body leading-relaxed group-hover:text-primary transition-colors line-clamp-3">
                    {idea.text}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-body mt-1.5">
                    {idea.course_id} · {formatDate(idea.created_at)}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Idea detail modal */}
          {selectedIdea && (
            <div
              className="fixed inset-0 bg-foreground/20 flex items-center justify-center z-50"
              onClick={() => setSelectedIdea(null)}
            >
              <div
                className="bg-background border border-border rounded-lg p-6 max-w-md mx-4 animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-serif text-lg leading-snug pr-4">{selectedIdea.text}</h3>
                  <button
                    onClick={() => setSelectedIdea(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3 text-sm font-body">
                  {selectedIdea.question_that_triggered_it && (
                    <div>
                      <p className="text-muted-foreground text-xs">Pregunta que la disparó</p>
                      <p className="italic mt-0.5">{selectedIdea.question_that_triggered_it}</p>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <div>
                      <p className="text-muted-foreground text-xs">Curso</p>
                      <p className="mt-0.5">{selectedIdea.course_id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Fecha</p>
                      <p className="mt-0.5">{formatDate(selectedIdea.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyPath;
