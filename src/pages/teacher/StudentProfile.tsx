import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronUp, RefreshCw, Loader2 } from "lucide-react";

const StudentProfile = () => {
  const navigate = useNavigate();
  const { studentId } = useParams<{ studentId: string }>();
  const queryClient = useQueryClient();

  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "chat">("summary");

  // Main data query
  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-student", studentId],
    queryFn: () => apiFetch(`/api/teacher/students/${studentId}`),
    enabled: !!studentId,
  });

  // Session messages query — only fetches when a session is expanded and "chat" tab is active
  const { data: sessionData, isLoading: isSessionLoading } = useQuery({
    queryKey: ["teacher-session", expandedSession],
    queryFn: () => apiFetch(`/api/teacher/sessions/${expandedSession}`),
    enabled: !!expandedSession && activeTab === "chat",
  });

  // Refresh summary mutation
  const refreshMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/teacher/students/${studentId}/refresh-summary`, {
        method: "POST",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["teacher-student", studentId] }),
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-fade-in max-w-3xl flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (isError || !data) {
    return (
      <div className="animate-fade-in max-w-3xl">
        <button
          onClick={() => navigate("/profesor/alumnos")}
          className="flex items-center gap-2 text-sm text-muted-foreground font-body hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al panel
        </button>
        <p className="text-sm font-body text-muted-foreground">
          No se pudo cargar el perfil del alumno. Intentá de nuevo más tarde.
        </p>
      </div>
    );
  }

  const { student, profile, sessions } = data;

  // Only show completed sessions
  const completedSessions = (sessions ?? []).filter(
    (s: any) => s.status === "completed"
  );

  return (
    <div className="animate-fade-in max-w-3xl">
      <button
        onClick={() => navigate("/profesor/alumnos")}
        className="flex items-center gap-2 text-sm text-muted-foreground font-body hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al panel
      </button>

      {/* Avatar + name */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-lg font-body text-muted-foreground font-medium">
          {student.avatar_initials ?? student.name?.slice(0, 2).toUpperCase()}
        </div>
        <h2 className="text-2xl font-serif">{student.name}</h2>
      </div>

      {/* AI Summary card */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-serif text-sm text-muted-foreground">Resumen del alumno</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="h-7 gap-1.5 text-xs text-muted-foreground"
          >
            {refreshMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Actualizar resumen
          </Button>
        </div>
        {profile?.summary ? (
          <p className="text-sm font-body leading-relaxed">{profile.summary}</p>
        ) : (
          <p className="text-sm font-body leading-relaxed text-muted-foreground italic">
            Todavía no hay un resumen generado para este alumno. Hacé clic en "Actualizar resumen" para generarlo.
          </p>
        )}
      </div>

      {/* Activity history */}
      <h3 className="font-serif text-lg mb-4">Historial de actividades</h3>
      {completedSessions.length === 0 ? (
        <p className="text-sm font-body text-muted-foreground">
          Este alumno aún no completó ninguna actividad.
        </p>
      ) : (
        <div className="space-y-3">
          {completedSessions.map((sess: any) => {
            const isExpanded = expandedSession === sess.id;
            return (
              <div key={sess.id} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedSession(null);
                    } else {
                      setExpandedSession(sess.id);
                      setActiveTab("summary");
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-body font-medium">{sess.activity_title}</p>
                    <p className="text-xs text-muted-foreground font-body">
                      {sess.completed_at
                        ? new Date(sess.completed_at).toLocaleDateString("es-AR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "Fecha desconocida"}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-border animate-fade-in">
                    {/* Tabs */}
                    <div className="flex border-b border-border">
                      <button
                        onClick={() => setActiveTab("summary")}
                        className={`px-4 py-2 text-sm font-body transition-colors ${
                          activeTab === "summary"
                            ? "border-b-2 border-primary text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        Resumen
                      </button>
                      <button
                        onClick={() => setActiveTab("chat")}
                        className={`px-4 py-2 text-sm font-body transition-colors ${
                          activeTab === "chat"
                            ? "border-b-2 border-primary text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        Conversación completa
                      </button>
                    </div>

                    <div className="p-4">
                      {activeTab === "summary" ? (
                        <p className="text-sm font-body leading-relaxed text-muted-foreground">
                          {sess.teacher_report || sess.session_summary || (
                            <span className="italic">No hay resumen disponible para esta sesión.</span>
                          )}
                        </p>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-auto">
                          {isSessionLoading ? (
                            <div className="flex justify-center py-6">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : sessionData?.messages?.length > 0 ? (
                            sessionData.messages
                              .filter((msg: any) => msg.role !== "system")
                              .map((msg: any) => (
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
                              ))
                          ) : (
                            <p className="text-sm font-body text-muted-foreground italic">
                              No hay mensajes registrados para esta sesión.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
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

export default StudentProfile;
