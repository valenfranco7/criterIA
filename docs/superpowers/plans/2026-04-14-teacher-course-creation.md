# Teacher Course Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar creación de cursos para docentes: 3 endpoints en el backend + reemplazar mock data en `TeacherCourses.tsx` con fetch real + modal "Nuevo curso" con buscador de alumnos.

**Architecture:** Backend en `server/src/teacher-routes.ts` implementa los 3 handlers (listar cursos, listar alumnos, crear curso) con queries directas a SQLite via `better-sqlite3`. El frontend reemplaza el import de `mockData` por `useQuery` de React Query y agrega un `Dialog` de shadcn con formulario de creación. Auth via header `x-user-id` ya manejado por `requireRole`.

**Tech Stack:** Fastify 5, better-sqlite3, React 18, React Query v5, shadcn/ui Dialog + Input + Badge, TypeScript.

---

## Archivo a tocar

| Archivo | Acción |
|---|---|
| `server/src/teacher-routes.ts` | Implementar 3 handlers (actualmente devuelven 501) |
| `src/pages/teacher/TeacherCourses.tsx` | Reescribir: eliminar mock, agregar useQuery + modal |

No se toca `contracts.ts`, `api.ts`, `mockData.ts`, ni ningún otro archivo.

---

## Task 1: Backend — `GET /api/teacher/courses`

**Files:**
- Modify: `server/src/teacher-routes.ts:6-10`

- [ ] **Step 1: Arrancar el servidor y verificar que el endpoint devuelve 501**

Primero asegurate de tener la DB con datos. Si no corriste el seed, ejecutá desde `server/`:
```bash
npm run db:seed
```
Luego arrancá el servidor desde `server/`:
```bash
npm run dev
```
Verificá con curl (reemplazá `yairp` por el id de teacher en tu seed):
```bash
curl -s -H "x-user-id: yairp" http://localhost:3001/api/teacher/courses
```
Resultado esperado: `{"error":"not_implemented"}` con status 501.

- [ ] **Step 2: Implementar el handler `GET /courses`**

En `server/src/teacher-routes.ts`, reemplazá el handler de `GET /courses` (líneas 6-10):

```typescript
app.get('/courses', async (req, reply) => {
  const user = await requireRole(req, reply, 'teacher');
  if (!user) return;

  const rows = db
    .prepare(
      `SELECT c.*,
              COUNT(cs.student_id) AS student_count
       FROM courses c
       LEFT JOIN course_students cs ON cs.course_id = c.id
       WHERE c.teacher_id = ?
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    )
    .all(user.id) as Array<Record<string, unknown>>;

  return { courses: rows };
});
```

Agregá el import de `db` al inicio del archivo (si no está):
```typescript
import { db } from './db.js';
```

- [ ] **Step 3: Verificar el endpoint con curl**

```bash
curl -s -H "x-user-id: yairp" http://localhost:3001/api/teacher/courses | npx --yes json
```
Resultado esperado: objeto con `courses` array con los cursos de yairp (hist-3a, ciud-4b) y `student_count` en cada uno.

```bash
curl -s -H "x-user-id: rosariom" http://localhost:3001/api/teacher/courses | npx --yes json
```
Resultado esperado: cursos de rosariom (hist-2c, ciud-3a).

- [ ] **Step 4: Commit**

```bash
cd server
git add src/teacher-routes.ts
git commit -m "feat: implement GET /api/teacher/courses"
```

---

## Task 2: Backend — `GET /api/teacher/students`

**Files:**
- Modify: `server/src/teacher-routes.ts` (agregar nuevo route antes de `/students/:id`)

- [ ] **Step 1: Verificar que no existe el endpoint**

```bash
curl -s -H "x-user-id: yairp" http://localhost:3001/api/teacher/students
```
Resultado esperado: algún error (route no encontrada o 501 del `:id` matcher).

- [ ] **Step 2: Agregar el handler `GET /students`**

En `server/src/teacher-routes.ts`, agregá este nuevo handler **antes** del handler `GET /students/:id` existente (actualmente línea 76):

```typescript
// GET /api/teacher/students → { students: User[] }
app.get('/students', async (req, reply) => {
  const user = await requireRole(req, reply, 'teacher');
  if (!user) return;

  const students = db
    .prepare(`SELECT * FROM users WHERE role = 'student' ORDER BY name ASC`)
    .all() as User[];

  return { students };
});
```

Asegurate que el import de `User` desde contracts esté en el archivo:
```typescript
import type { User } from './contracts.js';
```

- [ ] **Step 3: Verificar el endpoint con curl**

```bash
curl -s -H "x-user-id: yairp" http://localhost:3001/api/teacher/students | npx --yes json
```
Resultado esperado: `{ students: [...] }` con los 6 alumnos del seed (sofiam, mateol, valentinag, thiagor, camilaf, benjamind).

- [ ] **Step 4: Commit**

```bash
git add server/src/teacher-routes.ts
git commit -m "feat: implement GET /api/teacher/students"
```

---

## Task 3: Backend — `POST /api/teacher/courses`

**Files:**
- Modify: `server/src/teacher-routes.ts:13-17`

- [ ] **Step 1: Verificar que el endpoint devuelve 501**

```bash
curl -s -X POST \
  -H "x-user-id: yairp" \
  -H "content-type: application/json" \
  -d '{"name":"Test","year_or_level":"1ro A","student_usernames":[]}' \
  http://localhost:3001/api/teacher/courses
```
Resultado esperado: `{"error":"not_implemented"}`.

- [ ] **Step 2: Implementar el handler `POST /courses`**

Reemplazá el handler `POST /courses` (líneas 13-17) con:

```typescript
app.post('/courses', async (req, reply) => {
  const user = await requireRole(req, reply, 'teacher');
  if (!user) return;

  const body = req.body as {
    name?: string;
    year_or_level?: string;
    student_usernames?: string[];
  };

  if (!body.name?.trim() || !body.year_or_level?.trim()) {
    return reply.code(400).send({ error: 'name and year_or_level are required' });
  }

  const { nanoid } = await import('nanoid');

  // Generar slug: "Historia 3ro A" + "3ro A" → "historia-3ro-a"
  const slugBase = (body.name + '-' + body.year_or_level)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Garantizar unicidad
  let id = slugBase;
  const exists = db.prepare('SELECT id FROM courses WHERE id = ?').get(id);
  if (exists) {
    id = `${slugBase}-${nanoid(4)}`;
  }

  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO courses (id, teacher_id, name, year_or_level, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, user.id, body.name.trim(), body.year_or_level.trim(), now);

  // Insertar alumnos (ignorar usernames que no existan)
  const insertStudent = db.prepare(
    `INSERT OR IGNORE INTO course_students (course_id, student_id) VALUES (?, ?)`
  );
  for (const username of body.student_usernames ?? []) {
    const student = db
      .prepare(`SELECT id FROM users WHERE id = ? AND role = 'student'`)
      .get(username) as { id: string } | undefined;
    if (student) {
      insertStudent.run(id, student.id);
    }
  }

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  reply.code(201).send({ course });
});
```

- [ ] **Step 3: Verificar creación exitosa**

```bash
curl -s -X POST \
  -H "x-user-id: yairp" \
  -H "content-type: application/json" \
  -d '{"name":"Geografía","year_or_level":"2do B","student_usernames":["sofiam","mateol"]}' \
  http://localhost:3001/api/teacher/courses | npx --yes json
```
Resultado esperado: `{ "course": { "id": "geografia-2do-b", "name": "Geografía", ... } }` con status 201.

Verificá que aparece en la lista:
```bash
curl -s -H "x-user-id: yairp" http://localhost:3001/api/teacher/courses | npx --yes json
```
Resultado esperado: 3 cursos para yairp, incluyendo el nuevo.

- [ ] **Step 4: Verificar validación de campos vacíos**

```bash
curl -s -X POST \
  -H "x-user-id: yairp" \
  -H "content-type: application/json" \
  -d '{"name":"","year_or_level":"","student_usernames":[]}' \
  http://localhost:3001/api/teacher/courses
```
Resultado esperado: `{"error":"name and year_or_level are required"}` con status 400.

- [ ] **Step 5: Commit**

```bash
git add server/src/teacher-routes.ts
git commit -m "feat: implement POST /api/teacher/courses"
```

---

## Task 4: Frontend — Conectar lista de cursos a la API

**Files:**
- Modify: `src/pages/teacher/TeacherCourses.tsx` (reescritura completa)

- [ ] **Step 1: Asegurate que el frontend puede hablar con el backend**

El frontend corre en `localhost:5173` y el backend en `localhost:3001`. El `apiFetch` en `src/lib/api.ts` usa `VITE_API_URL` env var. Verificá si existe `.env` en la raíz del frontend:

```bash
cat .env 2>/dev/null || echo "no .env"
```

Si no existe, creá `.env` en `C:/Users/juanp/Desktop/criterIA/`:
```
VITE_API_URL=http://localhost:3001
```

Reiniciá el servidor de Vite después de crear el `.env`.

- [ ] **Step 2: Asegurate que hay un usuario seteado en localStorage**

Abrí la consola del browser en `http://localhost:5173` y ejecutá:
```js
localStorage.setItem('criteria:user_id', 'yairp')
```
Esto simula el login del docente Yair Perez.

- [ ] **Step 3: Reescribir `TeacherCourses.tsx` — solo la lista, sin modal aún**

Reemplazá el contenido completo de `src/pages/teacher/TeacherCourses.tsx`:

```tsx
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

  const { data, isLoading } = useQuery<CoursesResponse>({
    queryKey: ["teacher-courses"],
    queryFn: () => apiFetch("/api/teacher/courses"),
  });

  const { data: studentsData } = useQuery<StudentsResponse>({
    queryKey: ["all-students"],
    queryFn: () => apiFetch("/api/teacher/students"),
    enabled: open,
  });

  const filteredStudents = (studentsData?.students ?? []).filter((s: Student) => {
    if (selectedStudents.some((sel) => sel.id === s.id)) return false;
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
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
      resetForm();
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

              {/* Selector de alumnos */}
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
                    {filteredStudents.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.courses ?? []).map((course) => (
            <button
              key={course.id}
              onClick={() =>
                navigate(`/profesor/alumnos?curso=${course.id}`)
              }
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
          {(data?.courses ?? []).length === 0 && !isLoading && (
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
```

- [ ] **Step 4: Verificar en el browser**

En `http://localhost:5173/profesor/cursos`:
- Debe mostrar los cursos reales de yairp (Historia 3ro A, Ciudadanía 4to B) con su conteo de alumnos
- No deben aparecer los cursos hardcodeados del mock
- Debe aparecer el botón "Nuevo curso" arriba a la derecha

- [ ] **Step 5: Commit**

```bash
git add src/pages/teacher/TeacherCourses.tsx
git commit -m "feat: connect TeacherCourses to real API, remove mock data"
```

---

## Task 5: Verificar flujo completo de creación

- [ ] **Step 1: Probar el modal en el browser**

En `http://localhost:5173/profesor/cursos`:
1. Click en "Nuevo curso" → debe abrirse el dialog
2. Escribir "Matemática" en nombre, "4to B" en año/nivel
3. Escribir "sof" en el buscador → debe mostrar "Sofía Martínez @sofiam"
4. Click en Sofía → debe aparecer como chip sobre el buscador, desaparecer de resultados
5. Buscar "mat" → debe mostrar "Mateo López @mateol"
6. Click en Mateo → segundo chip
7. Click en chip de Sofía con "×" → debe removerse
8. Click "Crear curso" → debe cerrarse el modal, la lista debe mostrar el nuevo curso "Matemática — 4to B"

- [ ] **Step 2: Probar validación**

1. Abrir el modal y dejar nombre vacío, click "Crear curso"
2. Debe mostrar "Completá el nombre y el año/nivel." en rojo, sin cerrar el modal

- [ ] **Step 3: Probar estado vacío**

En localhost setear un user que no tenga cursos:
```js
// En la consola del browser
localStorage.setItem('criteria:user_id', 'sofiam') // alumno, no teacher
```
Ir a `/profesor/cursos` → debe mostrar error 403 en la network tab (el endpoint requiere role=teacher).

Volver a yairp:
```js
localStorage.setItem('criteria:user_id', 'yairp')
```

- [ ] **Step 4: Commit final**

```bash
git add .
git commit -m "feat: complete teacher course creation with student selector"
```
