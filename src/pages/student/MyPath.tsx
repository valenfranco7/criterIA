import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MyPath() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mi camino</h1>
        <p className="text-muted-foreground">
          Las ideas que fuiste construyendo, agrupadas por materia.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>En construcción</CardTitle>
          <CardDescription>
            GET /api/student/courses · GET /api/student/ideas?course_id=X
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Mapa visual con tabs por materia y conexiones entre ideas.
        </CardContent>
      </Card>
    </div>
  );
}
