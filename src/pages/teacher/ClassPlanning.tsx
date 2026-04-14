import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClassPlanning() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Planificar clase</h1>
        <p className="text-muted-foreground">
          Pedile a la IA un plan de clase y una actividad socrática.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>En construcción</CardTitle>
          <CardDescription>
            POST /api/teacher/class-plans · POST /api/teacher/class-plans/:id/plan · POST /api/teacher/activities
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Formulario para pedir un plan de clase a la IA y revisar la
            actividad sugerida antes de guardarla.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
