import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserSwitcher } from '@/components/UserSwitcher';

export default function Index() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="text-xl font-semibold tracking-tight">criteria</div>
          <UserSwitcher />
        </div>
      </header>
      <main className="container flex-1 py-12">
        <h1 className="text-3xl font-semibold mb-2">Elegí tu espacio</h1>
        <p className="text-muted-foreground mb-8">
          Una plataforma socrática para acompañar el pensamiento del alumno.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <Link to="/teacher">
            <Card className="transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle>Docente</CardTitle>
                <CardDescription>
                  Planificá clases con IA, creá actividades y leé los reportes de sesión.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Ir al panel →
              </CardContent>
            </Card>
          </Link>
          <Link to="/student">
            <Card className="transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle>Alumno</CardTitle>
                <CardDescription>
                  Abrí tus actividades y conversá con el tutor socrático.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Ir a mis actividades →
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
