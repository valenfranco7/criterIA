import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function StudentPanel() {
  const { courseId } = useParams();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Alumnos del curso</h1>
        <p className="text-muted-foreground">Curso: {courseId}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>En construcción</CardTitle>
          <CardDescription>
            GET /api/teacher/courses/:courseId
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Acá va la tabla de alumnos del curso con acceso a cada perfil.
        </CardContent>
      </Card>
    </div>
  );
}
