import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { ListConversationsResponse, Activity, ActivitySession } from "@contracts";

type Item = { session: ActivitySession; activity: Activity };

const Conversations = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ListConversationsResponse>('/api/student/conversations')
      .then((data) => setItems(data.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 animate-fade-in max-w-3xl">
      <h2 className="text-2xl font-serif mb-6">Conversaciones</h2>

      {loading && (
        <p className="text-sm text-muted-foreground font-body">Cargando...</p>
      )}

      {!loading && items.length === 0 && (
        <p className="text-sm text-muted-foreground font-body">
          Todavía no hay conversaciones. Completá una actividad para que aparezca acá.
        </p>
      )}

      <div className="space-y-3">
        {items.map(({ session, activity }) => (
          <div key={session.id} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === session.id ? null : session.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="text-sm font-body font-medium">{activity.title}</p>
                <p className="text-xs text-muted-foreground font-body">
                  {activity.topic} ·{" "}
                  {session.completed_at
                    ? new Date(session.completed_at).toLocaleDateString("es-AR")
                    : session.started_at
                    ? new Date(session.started_at).toLocaleDateString("es-AR")
                    : ""}
                  {" · "}
                  {session.status === "completed"
                    ? "Completada"
                    : session.status === "in_progress"
                    ? "En curso"
                    : "Pendiente"}
                </p>
              </div>
              {expanded === session.id ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {expanded === session.id && (
              <div className="border-t border-border p-4 animate-fade-in space-y-3">
                {session.session_summary && (
                  <p className="text-sm font-body leading-relaxed text-muted-foreground">
                    {session.session_summary}
                  </p>
                )}
                {session.status === "in_progress" && (
                  <button
                    onClick={() => navigate(`/estudiante/actividad/${activity.id}`)}
                    className="text-xs text-primary font-body hover:underline"
                  >
                    Continuar conversación →
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Conversations;
