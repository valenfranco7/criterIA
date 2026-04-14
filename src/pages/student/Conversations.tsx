import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Conversations() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mis conversaciones</h1>
        <p className="text-muted-foreground">
          Historial de sesiones en curso y completadas.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>En construcción</CardTitle>
          <CardDescription>GET /api/student/conversations</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Listado de sesiones con fecha y actividad, con link para reabrirlas.
        </CardContent>
      </Card>
    </div>
  );
}
