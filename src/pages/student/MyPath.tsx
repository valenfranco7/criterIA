import { useState } from "react";
import { studentIdeas } from "@/data/mockData";
import { X } from "lucide-react";

const MyPath = () => {
  const [selectedIdea, setSelectedIdea] = useState<typeof studentIdeas[0] | null>(null);

  // Position ideas in a visual layout
  const positions = [
    { x: 15, y: 10 },
    { x: 55, y: 15 },
    { x: 30, y: 35 },
    { x: 70, y: 40 },
    { x: 45, y: 60 },
  ];

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-3xl">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-1">Tu recorrido</p>
        <h2 className="text-2xl font-serif mb-1">Descubriste 47 ideas en 3 meses</h2>
        <p className="text-sm text-muted-foreground font-body italic mb-8">Esto es tuyo. Lo pensaste vos.</p>
      </div>

      {/* Visual map */}
      <div className="relative bg-card border border-border rounded-lg overflow-hidden" style={{ height: "500px" }}>
        {/* Connection lines - SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {studentIdeas.map((idea) =>
            idea.connections.map((connId) => {
              const fromIdx = studentIdeas.findIndex((i) => i.id === idea.id);
              const toIdx = studentIdeas.findIndex((i) => i.id === connId);
              if (fromIdx === -1 || toIdx === -1 || fromIdx >= positions.length || toIdx >= positions.length) return null;
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
        {studentIdeas.map((idea, i) => {
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
              <p className="text-[10px] text-muted-foreground font-body mt-1.5">{idea.course} · {idea.date}</p>
            </button>
          );
        })}
      </div>

      {/* Idea modal */}
      {selectedIdea && (
        <div className="fixed inset-0 bg-foreground/20 flex items-center justify-center z-50" onClick={() => setSelectedIdea(null)}>
          <div className="bg-background border border-border rounded-lg p-6 max-w-md mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-serif text-lg leading-snug pr-4">{selectedIdea.text}</h3>
              <button onClick={() => setSelectedIdea(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm font-body">
              <div>
                <p className="text-muted-foreground text-xs">Pregunta que la disparó</p>
                <p className="italic mt-0.5">{selectedIdea.question}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Actividad</p>
                <p className="mt-0.5">{selectedIdea.activity}</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">Curso</p>
                  <p className="mt-0.5">{selectedIdea.course}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fecha</p>
                  <p className="mt-0.5">{selectedIdea.date}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPath;
