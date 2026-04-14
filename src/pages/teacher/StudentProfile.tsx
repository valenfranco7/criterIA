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
          Back to panel
        </button>
        <p className="text-sm font-body text-muted-foreground">
          Could not load the student profile. Please try again later.
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
        Back to panel
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
          <h3 className="font-serif text-sm text-muted-foreground">Student summary</h3>
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
            Refresh summary
          </Button>
        </div>
        {profile?.summary ? (
          <p className="text-sm font-body leading-relaxed">{profile.summary}</p>
        ) : (
          <p className="text-sm font-body leading-relaxed text-muted-foreground italic">
            No summary has been generated for this student yet. Click "Refresh summary" to generate one.
          </p>
        )}
      </div>

      {/* Activity history */}
      <h3 className="font-serif text-lg mb-4">Activity history</h3>
      {completedSessions.length === 0 ? (
        <p className="text-sm font-body text-muted-foreground">
          This student has not completed any activities yet.
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
                        ? new Date(sess.completed_at).toLocaleDateString("en-US", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "Unknown date"}
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
                    {/* Comprehension & difficult topics */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap px-4 pt-3">
                      {(sess as any).comprehension_pct != null && (
                        <span className={`text-xs px-2 py-0.5 rounded font-body font-medium ${
                          (sess as any).comprehension_pct >= 70
                            ? "bg-green-50 text-green-700"
                            : (sess as any).comprehension_pct >= 40
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {(sess as any).comprehension_pct}% comprehension
                        </span>
                      )}
                      {Array.isArray((sess as any).difficult_topics) && (sess as any).difficult_topics.length > 0 && (
                        <>
                          {((sess as any).difficult_topics as string[]).map((topic: string, i: number) => (
                            <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded font-body text-muted-foreground">
                              {topic}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
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
                        Summary
                      </button>
                      <button
                        onClick={() => setActiveTab("chat")}
                        className={`px-4 py-2 text-sm font-body transition-colors ${
                          activeTab === "chat"
                            ? "border-b-2 border-primary text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        Full conversation
                      </button>
                    </div>

                    <div className="p-4">
                      {activeTab === "summary" ? (
                        <p className="text-sm font-body leading-relaxed text-muted-foreground">
                          {sess.teacher_report || sess.session_summary || (
                            <span className="italic">No summary available for this session.</span>
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
                              No messages recorded for this session.
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
