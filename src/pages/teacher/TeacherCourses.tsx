import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";

interface Course {
  id: string;
  teacher_id: string;
  name: string;
  year_or_level: string;
  created_at: string;
  student_count: number;
}

interface Student {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar_initials: string | null;
  created_at: string;
}

interface CoursesResponse {
  courses: Course[];
}

interface StudentsResponse {
  students: Student[];
}

const TeacherCourses = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<CoursesResponse>({
    queryKey: ["teacher-courses"],
    queryFn: () => apiFetch("/api/teacher/courses"),
  });

  const { data: studentsData, isLoading: studentsLoading } = useQuery<StudentsResponse>({
    queryKey: ["all-students"],
    queryFn: () => apiFetch("/api/teacher/students"),
    enabled: open,
  });

  const normalize = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filteredStudents = (studentsData?.students ?? []).filter((s: Student) => {
    if (selectedStudents.some((sel) => sel.id === s.id)) return false;
    if (!studentSearch.trim()) return true;
    const q = normalize(studentSearch);
    return normalize(s.name).includes(q) || s.id.toLowerCase().includes(q);
  });

  const addStudent = (student: Student) => {
    setSelectedStudents((prev) => [...prev, student]);
    setStudentSearch("");
  };

  const removeStudent = (id: string) => {
    setSelectedStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const resetForm = () => {
    setName("");
    setYearLevel("");
    setStudentSearch("");
    setSelectedStudents([]);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !yearLevel.trim()) {
      setFormError("Completá el nombre y el año/nivel.");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/teacher/courses", {
        method: "POST",
        body: {
          name: name.trim(),
          year_or_level: yearLevel.trim(),
          student_usernames: selectedStudents.map((s) => s.id),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["teacher-courses"] });
      setOpen(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al crear el curso.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-serif">Mis cursos</h2>
        <Dialog
          open={open}
          onOpenChange={(val) => {
            setOpen(val);
            if (!val) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo curso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear nuevo curso</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label htmlFor="course-name">Nombre de la materia</Label>
                <Input
                  id="course-name"
                  placeholder="ej: Historia"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="year-level">Año / Nivel</Label>
                <Input
                  id="year-level"
                  placeholder="ej: 3ro A"
                  value={yearLevel}
                  onChange={(e) => setYearLevel(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Alumnos</Label>
                {selectedStudents.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedStudents.map((s) => (
                      <Badge
                        key={s.id}
                        variant="secondary"
                        className="gap-1 cursor-pointer"
                        onClick={() => removeStudent(s.id)}
                      >
                        {s.name}
                        <span className="text-muted-foreground">×</span>
                      </Badge>
                    ))}
                  </div>
                )}
                <Input
                  placeholder="Buscar alumno..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                {studentSearch.trim() && (
                  <div className="border border-border rounded-md max-h-40 overflow-y-auto">
                    {studentsLoading ? (
                      <p className="text-sm text-muted-foreground px-3 py-2">Cargando...</p>
                    ) : filteredStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground px-3 py-2">
                        Sin resultados
                      </p>
                    ) : (
                      filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                          onClick={() => addStudent(s)}
                        >
                          <span className="font-medium">{s.name}</span>
                          <span className="text-muted-foreground ml-1">
                            @{s.id}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creando..." : "Crear curso"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando cursos...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar los cursos. Intentá de nuevo.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.courses ?? []).map((course) => (
            <button
              key={course.id}
              onClick={() => navigate(`/profesor/alumnos?curso=${course.id}`)}
              className="text-left bg-card border border-border rounded-lg p-6 hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <h3 className="font-serif text-lg group-hover:text-primary transition-colors">
                {course.name}
              </h3>
              <p className="text-sm text-muted-foreground font-body mt-1">
                {course.year_or_level}
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground font-body">
                <Users className="h-3.5 w-3.5" />
                {course.student_count}{" "}
                {course.student_count === 1 ? "alumno" : "alumnos"}
              </div>
            </button>
          ))}
          {(data?.courses ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground col-span-2">
              No tenés cursos aún. Creá uno con el botón "Nuevo curso".
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherCourses;
