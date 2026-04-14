import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function StudentProfile() {
  const { studentId } = useParams();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Perfil del alumno</h1>
        <p className="text-muted-foreground">ID: {studentId}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>En construcción</CardTitle>
          <CardDescription>
            GET /api/teacher/students/:id · POST /api/teacher/students/:id/refresh-summary
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Acá va el resumen del alumno junto con su historial de sesiones.
        </CardContent>
      </Card>
    </div>
  );
}
