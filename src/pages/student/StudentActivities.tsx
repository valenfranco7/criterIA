import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { activities } from "@/data/mockData";

type Tab = "pending" | "active" | "completed";

const StudentActivities = () => {
  const [tab, setTab] = useState<Tab>("pending");
  const navigate = useNavigate();

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending", label: "Pendientes" },
    { key: "active", label: "En curso" },
    { key: "completed", label: "Completadas" },
  ];

  const items = tab === "pending" ? activities.pending : tab === "active" ? activities.active : activities.finished;

  return (
    <div className="p-8 animate-fade-in">
      <h2 className="text-2xl font-serif mb-6">Mis actividades</h2>

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
          </button>
        ))}
      </div>

      <div className="space-y-3 max-w-2xl">
        {items.map((act) => (
          <button
            key={act.id}
            onClick={() => tab !== "completed" ? navigate(`/estudiante/actividad/${act.id}`) : undefined}
            className="w-full text-left bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-all"
          >
            <h3 className="font-serif text-base">{act.title}</h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground font-body">
              <span>{act.course}</span>
              <span>{act.datePlanned}</span>
              <span>{act.duration}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StudentActivities;
