import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pause, PanelRightOpen, PanelRightClose, ArrowLeft, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Message {
  id: string;
  role: "student" | "assistant" | "system";
  content: string;
  phase_at_turn: string | null;
}

interface ActivitySession {
  id: string;
  status: "not_started" | "in_progress" | "completed";
  current_phase: string;
  extracted_ideas: Array<{ text: string; question_that_triggered_it: string | null }>;
}

interface Activity {
  id: string;
  title: string;
  course_id: string;
  topic: string;
}

interface SessionDetail {
  session: ActivitySession;
  activity: Activity;
  messages: Message[];
}

interface TurnResponse {
  user_message: Message;
  assistant_message: Message;
  session: ActivitySession;
}

interface CloseResponse {
  session: ActivitySession;
}

const SocraticChat = () => {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();

  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showIdeas, setShowIdeas] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Start or resume session on mount
  useEffect(() => {
    if (!activityId) return;

    apiFetch<SessionDetail>(`/api/student/activities/${activityId}/start`, { method: "POST" })
      .then(detail => {
        setSessionDetail(detail);
        setMessages(detail.messages);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : "No se pudo iniciar la actividad.");
      })
      .finally(() => setLoading(false));
  }, [activityId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !sessionDetail || sending) return;

    const sessionId = sessionDetail.session.id;
    const content = input.trim();
    setInput("");
    setSending(true);
    setError(null);

    try {
      const result = await apiFetch<TurnResponse>(
        `/api/student/sessions/${sessionId}/messages`,
        { method: "POST", body: { content } }
      );
      setMessages(prev => [...prev, result.user_message, result.assistant_message]);
      setSessionDetail(prev =>
        prev ? { ...prev, session: result.session } : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el mensaje.");
      // Restore input so they can retry
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!sessionDetail || closing) return;
    setClosing(true);
    setError(null);

    try {
      const result = await apiFetch<CloseResponse>(
        `/api/student/sessions/${sessionDetail.session.id}/close`,
        { method: "POST" }
      );
      setSessionDetail(prev => prev ? { ...prev, session: result.session } : prev);
      navigate("/estudiante/actividades");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cerrar la actividad.");
      setClosing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const extractedIdeas = sessionDetail?.session.extracted_ideas ?? [];
  const isClosed = sessionDetail?.session.status === "completed";

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sessionDetail && error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 text-center p-8">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => navigate("/estudiante/actividades")}>
          Volver a actividades
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/estudiante/actividades")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-sm font-body font-medium">
              {sessionDetail?.activity.title ?? "Cargando..."}
            </p>
            <p className="text-xs text-muted-foreground font-body capitalize">
              {sessionDetail?.session.current_phase ?? ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!isClosed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={closing}
            >
              {closing ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Pause className="h-3.5 w-3.5 mr-1.5" />
              )}
              {closing ? "Cerrando..." : "Cerrar actividad"}
            </Button>
          )}
          <button
            onClick={() => setShowIdeas(!showIdeas)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {showIdeas ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto p-6 space-y-4">
            {messages
              .filter(m => m.role !== "system")
              .map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-3 rounded-lg text-sm font-body leading-relaxed ${
                      msg.role === "student"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-lg px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {error && (
            <p className="text-xs text-destructive text-center px-4 pb-1">{error}</p>
          )}

          {!isClosed && (
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribí tu respuesta..."
                  disabled={sending || closing}
                  className="flex-1 px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
                <Button onClick={handleSend} disabled={sending || closing || !input.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
                </Button>
              </div>
            </div>
          )}

          {isClosed && (
            <div className="p-4 border-t border-border text-center">
              <p className="text-sm text-muted-foreground font-body mb-2">Actividad completada.</p>
              <Button variant="outline" onClick={() => navigate("/estudiante/actividades")}>
                Volver a actividades
              </Button>
            </div>
          )}
        </div>

        {/* Ideas panel */}
        {showIdeas && (
          <div className="w-72 border-l border-border bg-card p-5 overflow-auto animate-fade-in">
            <h3 className="font-serif text-sm text-muted-foreground mb-4">
              Ideas que vas construyendo
            </h3>
            {extractedIdeas.length === 0 ? (
              <p className="text-xs text-muted-foreground font-body italic">
                Tus ideas aparecerán acá al cerrar la actividad.
              </p>
            ) : (
              <div className="space-y-3">
                {extractedIdeas.map((idea, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-md bg-muted text-sm font-body leading-relaxed"
                  >
                    {idea.text}
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground font-body mt-6 italic">
              Estas son tus ideas, formuladas con tus palabras.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocraticChat;
