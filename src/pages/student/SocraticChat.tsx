import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type {
  ListStudentActivitiesResponse,
  StudentSessionDetail,
  SessionTurnResponse,
  CloseSessionResponse,
  Message,
  Activity,
  ActivitySession,
} from "@contracts";

const SocraticChat = () => {
  const navigate = useNavigate();
  const { activityId } = useParams<{ activityId: string }>();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [session, setSession] = useState<ActivitySession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  // On mount: load or start session
  useEffect(() => {
    if (!activityId) return;
    let cancelled = false;

    async function init() {
      try {
        // Find the activity + existing session
        const list = await apiFetch<ListStudentActivitiesResponse>('/api/student/activities');
        if (cancelled) return;
        const item = list.items.find((i) => i.activity.id === activityId);

        if (!item) {
          setError("Activity not found.");
          setLoading(false);
          return;
        }

        setActivity(item.activity);

        if (item.session && item.session.status !== 'not_started') {
          // Load existing session with messages
          const detail = await apiFetch<StudentSessionDetail>(
            `/api/student/sessions/${item.session.id}`
          );
          if (cancelled) return;
          setSession(detail.session);
          setMessages(detail.messages.filter((m) => m.role !== 'system'));
        } else {
          // Start a new session
          const started = await apiFetch<{ session: ActivitySession }>(
            `/api/student/activities/${activityId}/start`,
            { method: 'POST' }
          );
          if (cancelled) return;
          setSession(started.session);
          // Fetch messages after start
          const detail = await apiFetch<StudentSessionDetail>(
            `/api/student/sessions/${started.session.id}`
          );
          if (cancelled) return;
          setMessages(detail.messages.filter((m) => m.role !== 'system'));
        }
      } catch (e) {
        if (cancelled) return;
        setError("Error loading the activity.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [activityId]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const handleSend = async () => {
    if (!input.trim() || thinking || !session) return;

    const text = input.trim();
    setInput("");
    setThinking(true);

    // Optimistically add student message to UI
    const tempStudentMsg: Message = {
      id: `temp-${Date.now()}`,
      session_id: session.id,
      turn_index: messages.length,
      role: "student",
      content: text,
      phase_at_turn: session.current_phase,
      analyzer_json: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempStudentMsg]);

    try {
      const result = await apiFetch<SessionTurnResponse>(
        `/api/student/sessions/${session.id}/messages`,
        { method: 'POST', body: { content: text } }
      );
      // Replace temp message with real ones from server
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempStudentMsg.id),
        result.user_message,
        result.assistant_message,
      ]);
      setSession(result.session);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempStudentMsg.id));
      setError("Error sending message. Please try again.");
    } finally {
      setThinking(false);
    }
  };

  const handleClose = async () => {
    if (!session || closing) return;
    setClosing(true);
    try {
      await apiFetch<CloseSessionResponse>(
        `/api/student/sessions/${session.id}/close`,
        { method: 'POST' }
      );
      navigate("/estudiante/conversaciones");
    } catch {
      setError("Error closing the session.");
      setClosing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground font-body">Loading...</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-sm text-destructive font-body">{error}</p>
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
              {activity?.title ?? "Activity"}
            </p>
            <p className="text-xs text-muted-foreground font-body">
              {activity?.topic ?? ""}
            </p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {messages.map((msg) => (
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

          {thinking && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-lg bg-card border border-border text-sm font-body text-muted-foreground">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce [animation-delay:0ms]">·</span>
                  <span className="animate-bounce [animation-delay:150ms]">·</span>
                  <span className="animate-bounce [animation-delay:300ms]">·</span>
                </span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive text-center font-body">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your answer..."
              disabled={thinking || session?.status === 'completed'}
              className="flex-1 px-4 py-2.5 rounded-md border border-input bg-background text-sm font-body focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <Button onClick={handleSend} disabled={thinking || !input.trim() || session?.status === 'completed'}>
              Send
            </Button>
          </div>
          {session?.status !== 'completed' && (
            <div className="flex justify-center mt-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleClose}
                disabled={closing || thinking}
              >
                {closing ? "Closing..." : "Close activity"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocraticChat;
