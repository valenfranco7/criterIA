import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getUserId } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Play, Eye, Users, Calendar, Loader2, ChevronUp, Square, ArrowRight } from "lucide-react";
import type {
  Activity,
  ListCoursesResponse,
  ClassAnalysis,
} from "@contracts";

type Tab = "pending" | "active" | "finished";

// The API returns Activity + session counts
interface ActivityWithCounts extends Activity {
  completed_count: number;
  total_count: number;
}

interface ActivitiesResponse {
  pending: ActivityWithCounts[];
  active: ActivityWithCounts[];
  finished: ActivityWithCounts[];
}

const TeacherActivities = () => {
  const [tab, setTab] = useState<Tab>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmFinalizeId, setConfirmFinalizeId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: activitiesData,
    isLoading: activitiesLoading,
    isError: activitiesError,
  } = useQuery<ActivitiesResponse>({
    queryKey: ["teacher-activities"],
    queryFn: () => apiFetch<ActivitiesResponse>("/api/teacher/activities"),
  });

  const { data: coursesData } = useQuery<ListCoursesResponse>({
    queryKey: ["teacher-courses"],
    queryFn: () => apiFetch<ListCoursesResponse>("/api/teacher/courses"),
  });

  const courseMap = new Map<string, string>(
    (coursesData?.courses ?? []).map((c) => [c.id, c.name])
  );

  const activateMutation = useMutation({
    mutationFn: (activityId: string) =>
      apiFetch<Activity>(`/api/teacher/activities/${activityId}/activate`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-activities"] });
    },
  });

  const [finalizingId, setFinalizingId] = useState<string | null>(null);
  const [finalizeStep, setFinalizeStep] = useState<string>("");

  const startFinalize = useCallback(async (activityId: string) => {
    setFinalizingId(activityId);
    setFinalizeStep("Starting...");
    setConfirmFinalizeId(null);

    const apiBase = import.meta.env.VITE_API_URL ?? '';
    const uid = getUserId();
    const res = await fetch(`${apiBase}/api/teacher/activities/${activityId}/finalize`, {
      method: 'POST',
      headers: uid ? { 'x-user-id': uid } : {},
    });

    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          setFinalizeStep(data.detail ? `${data.step} (${data.detail})` : data.step);
          if (data.done) {
            setFinalizingId(null);
            setFinalizeStep("");
            queryClient.invalidateQueries({ queryKey: ["teacher-activities"] });
          }
        } catch { /* ignore parse errors */ }
      }
    }
  }, [queryClient]);

  const { data: activityDetail } = useQuery({
    queryKey: ["teacher-activity-detail", expandedId],
    queryFn: () => apiFetch<any>(`/api/teacher/activities/${expandedId}`),
    enabled: !!expandedId,
  });

  const expandedAnalysis: ClassAnalysis | null = activityDetail?.latest_summary?.analysis ?? null;


  if (activitiesLoading) {
    return (
      <div className="animate-fade-in flex items-center gap-2 text-muted-foreground font-body mt-10">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading activities…
      </div>
    );
  }

  if (activitiesError || !activitiesData) {
    return (
      <div className="animate-fade-in text-destructive font-body mt-10">
        Error loading activities. Please try again later.
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: activitiesData.pending.length },
    { key: "active", label: "In progress", count: activitiesData.active.length },
    { key: "finished", label: "Completed", count: activitiesData.finished.length },
  ];

  const items: ActivityWithCounts[] =
    tab === "pending"
      ? activitiesData.pending
      : tab === "active"
      ? activitiesData.active
      : activitiesData.finished;

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-serif mb-6">Activities</h2>

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
            <span className="ml-1.5 text-xs">({t.count})</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground font-body">
            No activities in this section.
          </p>
        )}

        {items.map((act) => {
          const isActivating =
            activateMutation.isPending && activateMutation.variables === act.id;
          const isFinalizing = finalizingId === act.id;

          return (
            <div key={act.id} className="bg-card border border-border rounded-lg p-5 overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-base">{act.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground font-body">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {courseMap.get(act.course_id) ?? act.course_id}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(act.created_at).toLocaleDateString("en-US")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-body mt-2">
                    {act.objective}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-sm font-body text-muted-foreground">
                    {act.completed_count}/{act.total_count} completed
                  </div>

                  {tab === "pending" && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={isActivating}
                        onClick={() => activateMutation.mutate(act.id)}
                      >
                        {isActivating ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Activate now
                      </Button>
                    </div>
                  )}

                  {tab === "active" && (
                    <div className="mt-3 space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setExpandedId(expandedId === act.id ? null : act.id)}
                      >
                        {expandedId === act.id ? (
                          <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {expandedId === act.id ? "Hide" : "View results"}
                      </Button>
                      {confirmFinalizeId === act.id && !isFinalizing ? (
                        <div className="bg-muted/50 border border-border rounded-md p-3 space-y-2">
                          <p className="text-xs font-body text-muted-foreground">
                            All open sessions will be closed and the summary will be generated.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                              onClick={() => setConfirmFinalizeId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => startFinalize(act.id)}
                            >
                              Confirm
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant={isFinalizing ? "default" : "outline"}
                          size="sm"
                          className="w-full"
                          disabled={isFinalizing}
                          onClick={() => setConfirmFinalizeId(act.id)}
                        >
                          {isFinalizing ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Square className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          {isFinalizing ? finalizeStep : "Finalize activity"}
                        </Button>
                      )}
                    </div>
                  )}

                  {tab === "finished" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => setExpandedId(expandedId === act.id ? null : act.id)}
                    >
                      {expandedId === act.id ? (
                        <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {expandedId === act.id ? "Hide" : "View results"}
                    </Button>
                  )}
                </div>
              </div>

              {expandedId === act.id && expandedAnalysis && (
                <div className="mt-4 border-t border-border pt-4 space-y-5 min-w-0">
                  {/* Metrics row */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-2xl p-6 text-center bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-200/50">
                      <p className="text-5xl font-serif font-bold text-white drop-shadow-sm">{Math.round(expandedAnalysis.class_comprehension_avg)}%</p>
                      <p className="text-sm font-body font-semibold text-emerald-100 mt-2 uppercase tracking-widest">Average Comprehension</p>
                    </div>
                    <div className="rounded-2xl p-6 text-center bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-200/50">
                      <p className="text-5xl font-serif font-bold text-white drop-shadow-sm">{expandedAnalysis.difficult_topics?.length ?? 0}</p>
                      <p className="text-sm font-body font-semibold text-amber-100 mt-2 uppercase tracking-widest">Difficult Topics</p>
                    </div>
                    <div className="rounded-2xl p-6 text-center bg-gradient-to-br from-slate-500 to-slate-600 shadow-lg shadow-slate-200/50">
                      <p className="text-5xl font-serif font-bold text-white drop-shadow-sm">{expandedAnalysis.struggling_students?.length ?? 0}</p>
                      <p className="text-sm font-body font-semibold text-slate-200 mt-2 uppercase tracking-widest">Need Support</p>
                    </div>
                  </div>

                  {/* Summary */}
                  {expandedAnalysis.class_summary && (
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
                      <p className="text-sm font-body font-semibold text-slate-600 uppercase tracking-wider mb-2">Class Summary</p>
                      <p className="text-sm font-body text-slate-700 leading-relaxed">{expandedAnalysis.class_summary}</p>
                    </div>
                  )}

                  {/* Difficult topics */}
                  {expandedAnalysis.difficult_topics && expandedAnalysis.difficult_topics.length > 0 && (
                    <div>
                      <p className="text-sm font-body font-semibold text-foreground uppercase tracking-wider mb-3">Difficult Topics</p>
                      <div className="space-y-2">
                        {expandedAnalysis.difficult_topics.map((t: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 bg-amber-50/60 border border-amber-200/40 rounded-lg p-3">
                            <span className="shrink-0 w-6 h-6 rounded-full bg-amber-200/70 text-amber-800 text-xs font-bold flex items-center justify-center mt-0.5">
                              {t.student_count}
                            </span>
                            <div>
                              <p className="text-sm font-body font-medium text-amber-900">{t.topic}</p>
                              {t.description && (
                                <p className="text-xs font-body text-amber-700/70 mt-0.5">{t.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Struggling students */}
                  {expandedAnalysis.struggling_students && expandedAnalysis.struggling_students.length > 0 && (
                    <div>
                      <p className="text-sm font-body font-semibold text-foreground uppercase tracking-wider mb-3">Students Who Need Support</p>
                      <div className="space-y-2">
                        {expandedAnalysis.struggling_students.map((s: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 bg-muted/50 border border-border rounded-lg p-3">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-slate-200/70 text-slate-700 text-sm font-bold flex items-center justify-center">
                              {s.comprehension_pct}%
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-body font-medium text-foreground">{s.name}</p>
                              <p className="text-xs font-body text-muted-foreground truncate">{s.main_difficulty}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested plan */}
                  {expandedAnalysis.suggested_plan && (
                    <div className="bg-gradient-to-br from-sky-50 to-indigo-50/50 border border-sky-200/60 rounded-xl p-4">
                      <p className="text-sm font-body font-semibold text-sky-700 uppercase tracking-wider mb-2">Suggested Plan for Next Class</p>
                      <div className="text-sm font-body text-sky-900 leading-relaxed whitespace-pre-wrap">
                        {expandedAnalysis.suggested_plan}
                      </div>
                    </div>
                  )}

                  {/* Generate class CTA */}
                  <div className="border border-dashed border-primary/30 rounded-xl p-5 text-center bg-primary/[0.02]">
                    <p className="text-base font-serif font-semibold text-foreground mb-1">Want to generate a class from this analysis?</p>
                    <p className="text-sm font-body text-muted-foreground mb-4">Create a new activity based on these results and recommendations.</p>
                    <Button size="lg" onClick={() => {}}>
                      Generate Class
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeacherActivities;
