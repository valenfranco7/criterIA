# Teacher Course Creation — Design

**Fecha**: 2026-04-14  
**Feature**: Creación de cursos desde la vista del docente  
**Status**: Aprobado

---

## 1. Contexto

El frontend actual (`TeacherCourses.tsx`) muestra cursos hardcodeados desde `mockData.ts`. El servidor tiene los endpoints definidos pero devuelven 501. Esta feature conecta ambos lados: implementa los endpoints reales y reemplaza el mock por fetch al backend.

---

## 2. Scope

- Backend: 3 endpoints nuevos (listar cursos, crear curso, listar alumnos)
- Frontend: `TeacherCourses.tsx` — eliminar mock, agregar `useQuery` + modal de creación
- Eliminar cursos hardcodeados del frontend

**Fuera de scope**: editar/eliminar cursos, agregar/quitar alumnos de un curso existente.

---

## 3. Backend

### 3.1 Endpoints

#### `GET /api/teacher/courses`
- Auth: requiere `role = 'teacher'`
- Query: join `courses` + `course_students`, agrupa por curso, devuelve conteo de alumnos
- Response: `{ courses: Course[] }` donde cada `Course` incluye `student_count: number`

#### `POST /api/teacher/courses`
- Auth: requiere `role = 'teacher'`
- Body: `{ name: string, year_or_level: string, student_ids: string[] }`
- Lógica:
  1. Genera `id` como slug desde nombre + nivel (ej: `hist-3a`), garantiza unicidad con nanoid si hay colisión
  2. Inserta en `courses` con `teacher_id` del usuario autenticado
  3. Inserta filas en `course_students` (una por alumno)
- Response: `{ course: Course }`
- Error: 400 si `name` o `year_or_level` están vacíos

#### `GET /api/teacher/students`
- Auth: requiere `role = 'teacher'`
- Query: `SELECT * FROM users WHERE role = 'student'`
- Response: `{ students: User[] }`
- Propósito: alimentar el selector de alumnos en el modal

### 3.2 Archivo a modificar
- `server/src/teacher-routes.ts` — implementar los 3 handlers (actualmente devuelven 501)

---

## 4. Frontend

### 4.1 `TeacherCourses.tsx`

**Cambios:**
- Eliminar import de `mockData` y array hardcodeado de cursos
- Agregar `useQuery(['teacher-courses'], () => apiFetch('/api/teacher/courses'))` 
- Mostrar loading state mientras carga
- Agregar botón **"Nuevo curso"** en el header de la página

**Comportamiento de la lista:**
- Cada card de curso muestra: nombre, año/nivel, cantidad de alumnos
- Click en card navega a `/profesor/alumnos?curso={courseId}` (comportamiento existente)

### 4.2 Modal "Nuevo curso"

Componente `<Dialog>` de shadcn dentro de `TeacherCourses.tsx`.

**Campos del formulario:**
1. **Nombre de la materia** — `<Input>` requerido
2. **Año / Nivel** — `<Input>` requerido (ej: "3ro A")
3. **Alumnos** — selector filtrable:
   - Fetch único a `GET /api/teacher/students` al montar el modal
   - `<Input>` "Buscar alumno..." filtra por nombre o username en tiempo real (filtrado client-side)
   - Lista de resultados: muestra nombre + username, click agrega al alumno
   - Alumnos seleccionados aparecen como chips con botón `×` para remover
   - Un alumno ya seleccionado no aparece en la lista de resultados

**Submit:**
- Llama `POST /api/teacher/courses` con `{ name, year_or_level, student_ids }`
- Mientras espera: botón "Crear curso" deshabilitado con texto "Creando..."
- Éxito: cierra modal, invalida query `teacher-courses` para refrescar lista
- Error: muestra mensaje inline bajo el botón

---

## 5. Data flow

```
[TeacherCourses.tsx]
  → useQuery GET /api/teacher/courses
  → Renderiza lista de cursos reales

[Botón "Nuevo curso"]
  → Abre Dialog
  → useQuery GET /api/teacher/students (fetch al montar)
  → Usuario completa nombre, nivel, selecciona alumnos
  → Submit → POST /api/teacher/courses
  → Cierre + invalidate query → lista se actualiza
```

---

## 6. Archivos a tocar

| Archivo | Cambio |
|---|---|
| `server/src/teacher-routes.ts` | Implementar 3 handlers (GET courses, POST courses, GET students) |
| `src/pages/teacher/TeacherCourses.tsx` | Reemplazar mock por fetch + agregar modal |

**No se toca**: `contracts.ts`, otros pages, shadcn components, `api.ts`, `mockData.ts` (queda como referencia).
