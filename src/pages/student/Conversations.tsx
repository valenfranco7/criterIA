import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Message {
  id: string;
  role: "student" | "assistant" | "system";
  content: string;
}

interface ActivitySession {
  id: string;
  status: "not_started" | "in_progress" | "completed";
  started_at: string | null;
  completed_at: string | null;
  session_summary: string | null;
}

interface Activity {
  id: string;
  title: string;
  course_id: string;
}

interface ConversationItem {
  session: ActivitySession;
  activity: Activity;
}

interface ConversationsResponse {
  items: ConversationItem[];
}

interface SessionDetail {
  session: ActivitySession;
  activity: Activity;
  messages: Message[];
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const Conversations = () => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Record<string, Message[]>>({});
  const [loadingSession, setLoadingSession] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<ConversationsResponse>({
    queryKey: ["student-conversations"],
    queryFn: () => apiFetch("/api/student/conversations"),
  });

  const toggleExpand = async (sessionId: string) => {
    if (expanded === sessionId) {
      setExpanded(null);
      return;
    }
    setExpanded(sessionId);

    if (!sessionMessages[sessionId]) {
      setLoadingSession(sessionId);
      try {
        const detail = await apiFetch<SessionDetail>(`/api/student/sessions/${sessionId}`);
        setSessionMessages(prev => ({ ...prev, [sessionId]: detail.messages }));
      } catch {
        // ignore
      } finally {
        setLoadingSession(null);
      }
    }
  };

  const items = data?.items ?? [];

  return (
    <div className="p-8 animate-fade-in max-w-3xl">
      <h2 className="text-2xl font-serif mb-6">Conversaciones</h2>

      {isLoading ? (
        <p className="text-sm text-muted-foreground font-body">Cargando conversaciones...</p>
      ) : isError ? (
        <p className="text-sm text-destructive font-body">No se pudieron cargar las conversaciones.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground font-body italic">
          Todavía no participaste en ninguna conversación.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map(({ session, activity }) => {
            const msgs = sessionMessages[session.id] ?? [];
            const isOpen = expanded === session.id;
            const isLoadingThis = loadingSession === session.id;
            const messageCount = msgs.filter(m => m.role !== "system").length;

            return (
              <div key={session.id} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleExpand(session.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-body font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground font-body">
                      {activity.course_id}
                      {session.started_at && ` · ${formatDate(session.started_at)}`}
                      {isOpen && messageCount > 0 && ` · ${messageCount} mensajes`}
                      {session.status === "completed" && " · Completada"}
                      {session.status === "in_progress" && " · En curso"}
                    </p>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-border p-4 animate-fade-in">
                    {session.session_summary && (
                      <p className="text-xs text-muted-foreground font-body italic mb-4 pb-4 border-b border-border">
                        {session.session_summary}
                      </p>
                    )}
                    {isLoadingThis ? (
                      <p className="text-xs text-muted-foreground font-body">
                        Cargando mensajes...
                      </p>
                    ) : msgs.filter(m => m.role !== "system").length === 0 ? (
                      <p className="text-xs text-muted-foreground font-body italic">
                        Sin mensajes.
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-auto">
                        {msgs
                          .filter(m => m.role !== "system")
                          .map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${
                                msg.role === "student" ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[80%] px-4 py-2.5 rounded-lg text-sm font-body ${
                                  msg.role === "student"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-foreground"
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Conversations;
