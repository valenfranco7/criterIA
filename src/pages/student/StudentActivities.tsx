import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function StudentActivities() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mis actividades</h1>
        <p className="text-muted-foreground">
          Actividades activas de tus cursos.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>En construcción</CardTitle>
          <CardDescription>
            GET /api/student/activities · POST /api/student/activities/:id/start
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Acá van las actividades del alumno agrupadas por estado.
        </CardContent>
      </Card>
    </div>
  );
}
