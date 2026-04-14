import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TeacherActivities() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Actividades</h1>
        <p className="text-muted-foreground">
          Pendientes, activas y finalizadas. Acá se activa cada actividad.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>En construcción</CardTitle>
          <CardDescription>
            GET /api/teacher/activities · POST /api/teacher/activities/:id/activate
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Acá van las actividades pendientes, activas y finalizadas del docente.
        </CardContent>
      </Card>
    </div>
  );
}
