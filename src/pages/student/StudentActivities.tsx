import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import type { ListStudentActivitiesResponse, Activity, ActivitySession } from "@contracts";

type Tab = "pending" | "active" | "completed";

type Item = { activity: Activity; session: ActivitySession | null };

const StudentActivities = () => {
  const [tab, setTab] = useState<Tab>("pending");
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ListStudentActivitiesResponse>('/api/student/activities')
      .then((data) => setAllItems(data.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending", label: "Pendientes" },
    { key: "active", label: "En curso" },
    { key: "completed", label: "Completadas" },
  ];

  const filtered = allItems.filter(({ session }) => {
    if (tab === "pending") return !session || session.status === "not_started";
    if (tab === "active") return session?.status === "in_progress";
    return session?.status === "completed";
  });

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

      {loading ? (
        <p className="text-sm text-muted-foreground font-body">Cargando...</p>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground font-body">No hay actividades en esta categoría.</p>
          )}
          {filtered.map(({ activity, session }) => (
            <button
              key={activity.id}
              onClick={() => navigate(`/estudiante/actividad/${activity.id}`)}
              className="w-full text-left bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all"
            >
              <p className="text-sm font-body font-medium">{activity.title}</p>
              <p className="text-xs text-muted-foreground font-body mt-1">{activity.topic}</p>
              {session?.status === "in_progress" && (
                <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-body">
                  En curso
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentActivities;
