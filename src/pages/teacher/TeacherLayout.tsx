import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { BookOpen, FileText, Activity, Users, LogOut } from "lucide-react";

const navItems = [
  { label: "Mis cursos", path: "/profesor/cursos", icon: BookOpen },
  { label: "Planificación de clase", path: "/profesor/planificacion-clase", icon: FileText },
  { label: "Actividades", path: "/profesor/actividades", icon: Activity },
  { label: "Panel de alumnos", path: "/profesor/alumnos", icon: Users },
];

const TeacherLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border">
          <h2
            className="font-serif text-lg cursor-pointer hover:text-primary transition-colors"
            onClick={() => navigate("/")}
          >
            criteria
          </h2>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === "/profesor/cursos" && location.pathname === "/profesor");
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-body transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground font-body transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="px-8 py-5 border-b border-border">
          <h1 className="text-xl font-serif">Panel del docente</h1>
          <p className="text-sm text-muted-foreground font-body capitalize">{today}</p>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default TeacherLayout;
