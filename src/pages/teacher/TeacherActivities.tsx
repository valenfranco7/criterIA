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
    setFinalizeStep("Iniciando...");
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
        Cargando actividades…
      </div>
    );
  }

  if (activitiesError || !activitiesData) {
    return (
      <div className="animate-fade-in text-destructive font-body mt-10">
        Error al cargar las actividades. Intente de nuevo más tarde.
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: "Pendientes", count: activitiesData.pending.length },
    { key: "active", label: "En curso", count: activitiesData.active.length },
    { key: "finished", label: "Finalizadas", count: activitiesData.finished.length },
  ];

  const items: ActivityWithCounts[] =
    tab === "pending"
      ? activitiesData.pending
      : tab === "active"
      ? activitiesData.active
      : activitiesData.finished;

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-serif mb-6">Actividades</h2>

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
            No hay actividades en esta sección.
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
                      {new Date(act.created_at).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-body mt-2">
                    {act.objective}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-sm font-body text-muted-foreground">
                    {act.completed_count}/{act.total_count} completaron
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
                        Activar ahora
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
                        {expandedId === act.id ? "Ocultar" : "Ver resultados"}
                      </Button>
                      {confirmFinalizeId === act.id && !isFinalizing ? (
                        <div className="bg-muted/50 border border-border rounded-md p-3 space-y-2">
                          <p className="text-xs font-body text-muted-foreground">
                            Se cerrarán todas las sesiones abiertas y se generará el resumen.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                              onClick={() => setConfirmFinalizeId(null)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => startFinalize(act.id)}
                            >
                              Confirmar
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
                          {isFinalizing ? finalizeStep : "Finalizar actividad"}
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
                      {expandedId === act.id ? "Ocultar" : "Ver resultados"}
                    </Button>
                  )}
                </div>
              </div>

              {expandedId === act.id && expandedAnalysis && (
                <div className="mt-4 border-t border-border pt-4 space-y-5 min-w-0">
                  {/* Metrics row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl p-4 text-center bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/60">
                      <p className="text-3xl font-serif font-semibold text-emerald-700">{Math.round(expandedAnalysis.class_comprehension_avg)}%</p>
                      <p className="text-xs text-emerald-600/80 font-body mt-1">comprensión promedio</p>
                    </div>
                    <div className="rounded-xl p-4 text-center bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60">
                      <p className="text-3xl font-serif font-semibold text-amber-700">{expandedAnalysis.difficult_topics?.length ?? 0}</p>
                      <p className="text-xs text-amber-600/80 font-body mt-1">temas difíciles</p>
                    </div>
                    <div className="rounded-xl p-4 text-center bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200/60">
                      <p className="text-3xl font-serif font-semibold text-rose-700">{expandedAnalysis.struggling_students?.length ?? 0}</p>
                      <p className="text-xs text-rose-600/80 font-body mt-1">necesitan apoyo</p>
                    </div>
                  </div>

                  {/* Summary */}
                  {expandedAnalysis.class_summary && (
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
                      <p className="text-xs font-body text-slate-500 uppercase tracking-wider mb-2">Resumen de la clase</p>
                      <p className="text-sm font-body text-slate-700 leading-relaxed">{expandedAnalysis.class_summary}</p>
                    </div>
                  )}

                  {/* Difficult topics */}
                  {expandedAnalysis.difficult_topics && expandedAnalysis.difficult_topics.length > 0 && (
                    <div>
                      <p className="text-xs font-body text-muted-foreground uppercase tracking-wider mb-3">Temas difíciles</p>
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
                      <p className="text-xs font-body text-muted-foreground uppercase tracking-wider mb-3">Estudiantes que necesitan apoyo</p>
                      <div className="space-y-2">
                        {expandedAnalysis.struggling_students.map((s: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 bg-rose-50/60 border border-rose-200/40 rounded-lg p-3">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-rose-200/70 text-rose-800 text-sm font-bold flex items-center justify-center">
                              {s.comprehension_pct}%
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-body font-medium text-rose-900">{s.name}</p>
                              <p className="text-xs font-body text-rose-700/70 truncate">{s.main_difficulty}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested groups */}
                  {expandedAnalysis.suggested_groups && expandedAnalysis.suggested_groups.length > 0 && (
                    <div>
                      <p className="text-xs font-body text-muted-foreground uppercase tracking-wider mb-3">Grupos sugeridos</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {expandedAnalysis.suggested_groups.map((g: any, i: number) => (
                          <div key={i} className="bg-violet-50/60 border border-violet-200/40 rounded-lg p-3">
                            <p className="text-sm font-body font-medium text-violet-900">{g.group_name}</p>
                            <p className="text-xs font-body text-violet-600 mt-0.5">{g.topic}</p>
                            <p className="text-xs font-body text-violet-700/60 mt-1">{g.rationale}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested plan */}
                  {expandedAnalysis.suggested_plan && (
                    <div className="bg-gradient-to-br from-sky-50 to-indigo-50/50 border border-sky-200/60 rounded-xl p-4">
                      <p className="text-xs font-body text-sky-600 uppercase tracking-wider mb-2">Plan sugerido para la próxima clase</p>
                      <div className="text-sm font-body text-sky-900 leading-relaxed whitespace-pre-wrap">
                        {expandedAnalysis.suggested_plan}
                      </div>
                    </div>
                  )}

                  {/* Generate class CTA */}
                  <div className="border border-dashed border-primary/30 rounded-xl p-5 text-center bg-primary/[0.02]">
                    <p className="text-sm font-body text-muted-foreground mb-3">¿Querés generar una clase a partir de este análisis?</p>
                    <Button onClick={() => {}}>
                      Generar clase
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
