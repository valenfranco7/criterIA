import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function StudentHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hola 👋</h1>
        <p className="text-muted-foreground">
          Tus actividades pendientes y tu recorrido reciente.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>En construcción</CardTitle>
          <CardDescription>
            GET /api/student/activities · GET /api/student/courses
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Acá va la próxima actividad del alumno y un acceso a su recorrido reciente.
        </CardContent>
      </Card>
    </div>
  );
}
