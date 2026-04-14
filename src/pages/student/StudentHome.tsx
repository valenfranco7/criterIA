import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type {
  MeResponse,
  ListStudentActivitiesResponse,
  ListStudentCoursesResponse,
} from "@contracts";

interface ActivityCard {
  id: string;
  title: string;
  topic: string;
  inProgress: boolean;
}

const StudentHome = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [activities, setActivities] = useState<ActivityCard[]>([]);
  const [totalIdeas, setTotalIdeas] = useState<number>(0);

  useEffect(() => {
    async function load() {
      try {
        const [me, actData, courses] = await Promise.all([
          apiFetch<MeResponse>('/api/me'),
          apiFetch<ListStudentActivitiesResponse>('/api/student/activities'),
          apiFetch<ListStudentCoursesResponse>('/api/student/courses'),
        ]);

        setUserName(me.user.name.split(' ')[0]);

        // Collect in-progress first, then pending
        const cards: ActivityCard[] = [];

        for (const item of actData.items) {
          if (item.session?.status === 'in_progress') {
            cards.push({ id: item.activity.id, title: item.activity.title, topic: item.activity.topic, inProgress: true });
          }
        }
        for (const item of actData.items) {
          if (!item.session || item.session.status === 'not_started') {
            cards.push({ id: item.activity.id, title: item.activity.title, topic: item.activity.topic, inProgress: false });
          }
        }

        setActivities(cards);

        const total = courses.courses.reduce((sum, c) => sum + c.idea_count, 0);
        setTotalIdeas(total);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  return (
    <div className="p-8 max-w-2xl animate-fade-in">
      <h1 className="text-3xl font-serif mb-2">Hola, {userName || "..."}</h1>
      <p className="text-muted-foreground font-body mb-10">Bienvenida de vuelta.</p>

      {activities.length > 0 && (
        <div className="space-y-3 mb-8">
          {activities.map((act) => (
            <div key={act.id} className="bg-card border border-border rounded-lg p-6">
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-2">
                {act.inProgress ? "Actividad en curso" : "Actividad pendiente"}
              </p>
              <h2 className="font-serif text-xl mb-1">{act.title}</h2>
              <p className="text-sm text-muted-foreground font-body mb-4">{act.topic}</p>
              <Button onClick={() => navigate(`/estudiante/actividad/${act.id}`)}>
                {act.inProgress ? "Continuar" : "Empezar"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate("/estudiante/mi-camino")}
        className="text-left w-full bg-card border border-border rounded-lg p-6 hover:border-primary/30 transition-all group"
      >
        <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-1">Tu recorrido</p>
        <p className="font-serif text-lg group-hover:text-primary transition-colors">
          {totalIdeas > 0 ? `Descubriste ${totalIdeas} idea${totalIdeas !== 1 ? 's' : ''}` : "Todavía no hay ideas registradas"}
        </p>
        <p className="text-sm text-muted-foreground font-body mt-1">Ver mi camino →</p>
      </button>
    </div>
  );
};

export default StudentHome;
