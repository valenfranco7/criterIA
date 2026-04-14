import { Link, Outlet } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { UserSwitcher } from '@/components/UserSwitcher';

export default function StudentLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold tracking-tight">
              criteria
            </Link>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Alumno
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink to="/student/home">Inicio</NavLink>
            <NavLink to="/student/activities">Actividades</NavLink>
            <NavLink to="/student/my-path">Mi camino</NavLink>
            <NavLink to="/student/conversations">Conversaciones</NavLink>
          </nav>
          <UserSwitcher />
        </div>
      </header>
      <main className="container flex-1 py-10">
        <Outlet />
      </main>
    </div>
  );
}
