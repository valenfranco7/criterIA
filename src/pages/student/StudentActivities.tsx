import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type Tab = "pending" | "active" | "completed";

interface Activity {
  id: string;
  title: string;
  course_id: string;
  topic: string;
  estimated_duration_minutes: number;
  created_at: string;
}

interface ActivitySession {
  id: string;
  status: "not_started" | "in_progress" | "completed";
  started_at: string | null;
}

interface ActivityItem {
  activity: Activity;
  session: ActivitySession | null;
}

interface ActivitiesResponse {
  items: ActivityItem[];
}

const StudentActivities = () => {
  const [tab, setTab] = useState<Tab>("pending");
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery<ActivitiesResponse>({
    queryKey: ["student-activities"],
    queryFn: () => apiFetch("/api/student/activities"),
  });

  const allItems = data?.items ?? [];
  const pending = allItems.filter(i => !i.session || i.session.status === "not_started");
  const active = allItems.filter(i => i.session?.status === "in_progress");
  const completed = allItems.filter(i => i.session?.status === "completed");

  const shown = tab === "pending" ? pending : tab === "active" ? active : completed;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: "Pendientes", count: pending.length },
    { key: "active", label: "En curso", count: active.length },
    { key: "completed", label: "Completadas", count: completed.length },
  ];

  return (
    <div className="p-8 animate-fade-in">
      <h2 className="text-2xl font-serif mb-6">Mis actividades</h2>

      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-body transition-colors ${
              tab === t.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground font-body">Cargando actividades...</p>
      ) : isError ? (
        <p className="text-sm text-destructive font-body">No se pudieron cargar las actividades.</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted-foreground font-body italic">
          {tab === "pending" && "No tenés actividades pendientes."}
          {tab === "active" && "No tenés actividades en curso."}
          {tab === "completed" && "No completaste ninguna actividad todavía."}
        </p>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {shown.map(({ activity, session }) => (
            <button
              key={activity.id}
              onClick={() =>
                tab !== "completed"
                  ? navigate(`/estudiante/actividad/${activity.id}`)
                  : undefined
              }
              disabled={tab === "completed"}
              className="w-full text-left bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-all disabled:opacity-60 disabled:cursor-default"
            >
              <h3 className="font-serif text-base">{activity.title}</h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground font-body">
                <span>{activity.topic}</span>
                <span>{activity.estimated_duration_minutes} min</span>
                {session?.status === "in_progress" && (
                  <span className="text-primary font-medium">En curso</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentActivities;
