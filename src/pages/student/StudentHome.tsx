import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

interface User {
  id: string;
  name: string;
  role: string;
}

interface MeResponse {
  user: User;
}

interface Activity {
  id: string;
  title: string;
  course_id: string;
}

interface ActivityItem {
  activity: Activity;
  session: { status: string } | null;
}

interface ActivitiesResponse {
  items: ActivityItem[];
}

const StudentHome = () => {
  const navigate = useNavigate();

  const { data: meData } = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: () => apiFetch("/api/me"),
  });

  const { data: activitiesData } = useQuery<ActivitiesResponse>({
    queryKey: ["student-activities"],
    queryFn: () => apiFetch("/api/student/activities"),
  });

  const firstName = meData?.user.name.split(" ")[0] ?? "Hola";

  const pendingActivity = activitiesData?.items.find(
    i => !i.session || i.session.status === "not_started"
  );

  const inProgressActivity = activitiesData?.items.find(
    i => i.session?.status === "in_progress"
  );

  const highlighted = inProgressActivity ?? pendingActivity;

  return (
    <div className="p-8 max-w-2xl animate-fade-in">
      <h1 className="text-3xl font-serif mb-2">Hola, {firstName}</h1>
      <p className="text-muted-foreground font-body mb-10">Bienvenida de vuelta.</p>

      {highlighted ? (
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-2">
            {inProgressActivity ? "Actividad en curso" : "Actividad pendiente"}
          </p>
          <h2 className="font-serif text-xl mb-1">{highlighted.activity.title}</h2>
          <p className="text-sm text-muted-foreground font-body mb-4">
            {highlighted.activity.course_id}
          </p>
          <Button onClick={() => navigate(`/estudiante/actividad/${highlighted.activity.id}`)}>
            {inProgressActivity ? "Continuar" : "Empezar"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      ) : activitiesData ? (
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <p className="text-sm text-muted-foreground font-body">
            No tenés actividades pendientes por ahora.
          </p>
        </div>
      ) : null}

      <button
        onClick={() => navigate("/estudiante/mi-camino")}
        className="text-left w-full bg-card border border-border rounded-lg p-6 hover:border-primary/30 transition-all group"
      >
        <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-1">
          Tu recorrido
        </p>
        <p className="font-serif text-lg group-hover:text-primary transition-colors">
          Ver mis ideas y conversaciones
        </p>
        <p className="text-sm text-muted-foreground font-body mt-1">Mi camino →</p>
      </button>
    </div>
  );
};

export default StudentHome;
