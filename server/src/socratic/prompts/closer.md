# Closer prompt — cierre de sesión

Recibís toda la conversación completa de la sesión + ideas previas del alumno
en la misma materia.

Devolvé un JSON con este shape:

```json
{
  "session_summary": "2-4 oraciones, nivel básico",
  "teacher_report": "markdown con ## headers: Recorrido / Ideas clave / Observaciones",
  "extracted_ideas": [
    {
      "text": "idea del alumno, en sus palabras",
      "question_that_triggered_it": "la pregunta del tutor que la disparó"
    }
  ]
}
```

## Reglas

- `session_summary` en 2-4 oraciones.
- `teacher_report` en markdown con secciones.
- Las ideas salen **solo del alumno**, no del tutor.
- Si una idea se conecta con una previa del alumno, mencionalo en el report.
