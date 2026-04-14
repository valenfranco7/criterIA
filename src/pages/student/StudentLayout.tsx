import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Home, BookOpen, Map, MessageSquare, LogOut } from "lucide-react";
import { UserSwitcher } from "@/components/UserSwitcher";

const navItems = [
  { label: "Inicio", path: "/estudiante", icon: Home, exact: true },
  { label: "Mis actividades", path: "/estudiante/actividades", icon: BookOpen },
  { label: "Mi camino", path: "/estudiante/mi-camino", icon: Map },
  { label: "Conversaciones", path: "/estudiante/conversaciones", icon: MessageSquare },
];

const StudentLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
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
          <UserSwitcher />
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground font-body transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default StudentLayout;
