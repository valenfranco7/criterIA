import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Play, Eye, Users, Calendar, Loader2, FileText, ChevronUp } from "lucide-react";
import type {
  Activity,
  ListCoursesResponse,
  ActivitySummary,
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

  const { data: activityDetail } = useQuery({
    queryKey: ["teacher-activity-detail", expandedId],
    queryFn: () => apiFetch<any>(`/api/teacher/activities/${expandedId}`),
    enabled: !!expandedId,
  });

  const expandedAnalysis: ClassAnalysis | null = activityDetail?.latest_summary?.analysis ?? null;

  const summarizeMutation = useMutation({
    mutationFn: (activityId: string) =>
      apiFetch<ActivitySummary>(
        `/api/teacher/activities/${activityId}/generate-summary`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-activities"] });
    },
  });

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
          const isSummarizing =
            summarizeMutation.isPending && summarizeMutation.variables === act.id;

          return (
            <div key={act.id} className="bg-card border border-border rounded-lg p-5">
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

                  {tab === "finished" && (
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={isSummarizing}
                        onClick={() => summarizeMutation.mutate(act.id)}
                      >
                        {isSummarizing ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Generar resumen
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {expandedId === act.id && expandedAnalysis && (
                <div className="mt-4 border-t border-border pt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-serif text-primary">{Math.round(expandedAnalysis.class_comprehension_avg)}%</p>
                      <p className="text-xs text-muted-foreground font-body">comprensión</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-serif">{expandedAnalysis.difficult_topics?.length ?? 0}</p>
                      <p className="text-xs text-muted-foreground font-body">temas difíciles</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-serif">{expandedAnalysis.struggling_students?.length ?? 0}</p>
                      <p className="text-xs text-muted-foreground font-body">necesitan ayuda</p>
                    </div>
                  </div>

                  {expandedAnalysis.class_summary && (
                    <p className="text-sm font-body text-muted-foreground leading-relaxed">{expandedAnalysis.class_summary}</p>
                  )}

                  {expandedAnalysis.difficult_topics && expandedAnalysis.difficult_topics.length > 0 && (
                    <div>
                      <p className="text-xs font-body text-muted-foreground uppercase tracking-wider mb-2">Temas difíciles</p>
                      <div className="flex flex-wrap gap-2">
                        {expandedAnalysis.difficult_topics.map((t: any, i: number) => (
                          <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded font-body">
                            {t.topic} ({t.student_count})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {expandedAnalysis.suggested_plan && (
                    <div>
                      <p className="text-xs font-body text-muted-foreground uppercase tracking-wider mb-2">Plan sugerido</p>
                      <div className="bg-muted/50 rounded-lg p-4 text-sm font-body text-foreground leading-relaxed whitespace-pre-wrap">
                        {expandedAnalysis.suggested_plan}
                      </div>
                    </div>
                  )}
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
