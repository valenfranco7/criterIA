import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TeacherCourses() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cursos</h1>
        <p className="text-muted-foreground">
          Listado de cursos del docente con cantidad de alumnos.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>En construcción</CardTitle>
          <CardDescription>
            GET /api/teacher/courses · POST /api/teacher/courses
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Acá va el listado de cursos con su cantidad de alumnos.
        </CardContent>
      </Card>
    </div>
  );
}
