import { useNavigate } from "react-router-dom";
import { studentName } from "@/data/mockData";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const StudentHome = () => {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-2xl animate-fade-in">
      <h1 className="text-3xl font-serif mb-2">Hola, {studentName}</h1>
      <p className="text-muted-foreground font-body mb-10">Bienvenida de vuelta.</p>

      {/* Pending activity highlight */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-2">Actividad pendiente</p>
        <h2 className="font-serif text-xl mb-1">La Revolución de Mayo desde tu mirada</h2>
        <p className="text-sm text-muted-foreground font-body mb-4">
          Tu profe de Historia te dejó una actividad
        </p>
        <Button onClick={() => navigate("/estudiante/actividad/a1")}>
          Empezar
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Quick access */}
      <button
        onClick={() => navigate("/estudiante/mi-camino")}
        className="text-left w-full bg-card border border-border rounded-lg p-6 hover:border-primary/30 transition-all group"
      >
        <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-1">Tu recorrido</p>
        <p className="font-serif text-lg group-hover:text-primary transition-colors">Descubriste 47 ideas en 3 meses</p>
        <p className="text-sm text-muted-foreground font-body mt-1">Ver mi camino →</p>
      </button>
    </div>
  );
};

export default StudentHome;
