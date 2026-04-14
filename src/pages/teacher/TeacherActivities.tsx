import { useState } from "react";
import { activities, courses } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Play, Eye, Users, Calendar } from "lucide-react";

type Tab = "pending" | "active" | "finished";

const TeacherActivities = () => {
  const [tab, setTab] = useState<Tab>("pending");

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: "Pendientes", count: activities.pending.length },
    { key: "active", label: "En curso", count: activities.active.length },
    { key: "finished", label: "Finalizadas", count: activities.finished.length },
  ];

  const items = tab === "pending" ? activities.pending : tab === "active" ? activities.active : activities.finished;

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-serif mb-6">Actividades</h2>

      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-body transition-colors ${
              tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs">({t.count})</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((act) => (
          <div key={act.id} className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-base">{act.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground font-body">
                  <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{act.course}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{act.datePlanned}</span>
                </div>
                <p className="text-sm text-muted-foreground font-body mt-2">{act.objective}</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-body text-muted-foreground">
                  {act.completed}/{act.total} completaron
                </div>
                {tab === "pending" && (
                  <div className="mt-3 space-y-2">
                    <select className="w-full px-2 py-1 rounded border border-input bg-background text-xs font-body">
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <Button size="sm" className="w-full">
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      Activar ahora
                    </Button>
                  </div>
                )}
                {tab === "finished" && (
                  <Button variant="outline" size="sm" className="mt-3">
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    Ver resultados
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherActivities;
