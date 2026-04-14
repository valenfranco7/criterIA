import type {
  ActivitySummary,
  ClassPlan,
  ProposedActivity,
  StudentProfile,
} from './contracts.js';
import { db, jsonParse } from './db.js';
import { requireAnthropic, MODEL_TUTOR } from './anthropic.js';

/** Strip optional ```json ... ``` markdown fences from an LLM response. */
function stripJsonFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

export async function summarizeActivity(
  activityId: string
): Promise<Omit<ActivitySummary, 'id' | 'created_at'>> {
  const activity = db
    .prepare('SELECT * FROM activities WHERE id = ?')
    .get(activityId) as any;

  if (!activity) {
    throw new Error('activity_not_found');
  }

  const sessions = db
    .prepare(
      `SELECT s.session_summary, s.teacher_report, u.name AS student_name
       FROM activity_sessions s
       JOIN users u ON u.id = s.student_id
       WHERE s.activity_id = ? AND s.status = 'completed'`
    )
    .all(activityId) as any[];

  if (sessions.length === 0) {
    throw new Error('no_completed_sessions');
  }

  const sessionLines = sessions
    .map(
      (s, i) =>
        `Alumno ${i + 1}: ${s.student_name}\n` +
        `  Resumen de sesión: ${s.session_summary ?? '(sin resumen)'}\n` +
        `  Reporte docente: ${s.teacher_report ?? '(sin reporte)'}`
    )
    .join('\n\n');

  const context =
    `Actividad: ${activity.title}\n` +
    `Tema: ${activity.topic}\n` +
    `Objetivo: ${activity.objective}\n\n` +
    `Sesiones completadas (${sessions.length}):\n\n` +
    sessionLines;

  const client = requireAnthropic();

  const message = await client.messages.create({
    model: MODEL_TUTOR,
    max_tokens: 1024,
    system:
      'Sos un analista pedagógico. Te doy una actividad educativa y los resúmenes de las sesiones de varios alumnos. ' +
      'Generá: 1) Un resumen agregado del nivel de comprensión del grupo (3-5 oraciones). Mencioná patrones comunes, ' +
      'fortalezas del grupo, y áreas que necesitan refuerzo. 2) Un número de 0 a 100 que represente el nivel de ' +
      'comprensión promedio. Respondé EXACTAMENTE en JSON: {"summary": "...", "understanding_avg": N}. ' +
      'No agregues texto fuera del JSON.',
    messages: [{ role: 'user', content: context }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '';
  const parsed = jsonParse<{ summary: string; understanding_avg: number }>(
    stripJsonFences(raw),
    { summary: '', understanding_avg: 0 }
  );

  return {
    activity_id: activityId,
    course_id: activity.course_id,
    summary: parsed.summary,
    understanding_avg: parsed.understanding_avg,
  };
}

export async function refreshStudentProfile(
  studentId: string
): Promise<Pick<StudentProfile, 'summary'>> {
  const student = db
    .prepare("SELECT * FROM users WHERE id = ? AND role = 'student'")
    .get(studentId) as any;

  if (!student) {
    throw new Error('student_not_found');
  }

  const sessions = db
    .prepare(
      `SELECT s.session_summary, s.teacher_report, a.title AS activity_title, a.topic AS activity_topic
       FROM activity_sessions s
       JOIN activities a ON a.id = s.activity_id
       WHERE s.student_id = ? AND s.status = 'completed'
       ORDER BY s.completed_at DESC
       LIMIT 10`
    )
    .all(studentId) as any[];

  const ideas = db
    .prepare(
      `SELECT text, question_that_triggered_it
       FROM student_ideas
       WHERE student_id = ?
       ORDER BY created_at DESC
       LIMIT 20`
    )
    .all(studentId) as any[];

  const sessionLines =
    sessions.length > 0
      ? sessions
          .map(
            (s, i) =>
              `Sesión ${i + 1} — ${s.activity_title} (${s.activity_topic})\n` +
              `  Resumen: ${s.session_summary ?? '(sin resumen)'}\n` +
              `  Reporte: ${s.teacher_report ?? '(sin reporte)'}`
          )
          .join('\n\n')
      : '(sin sesiones completadas)';

  const ideaLines =
    ideas.length > 0
      ? ideas
          .map(
            (idea, i) =>
              `Idea ${i + 1}: ${idea.text}` +
              (idea.question_that_triggered_it
                ? ` (pregunta disparadora: ${idea.question_that_triggered_it})`
                : '')
          )
          .join('\n')
      : '(sin ideas registradas)';

  const context =
    `Alumno: ${student.name}\n\n` +
    `Sesiones recientes:\n${sessionLines}\n\n` +
    `Ideas generadas:\n${ideaLines}`;

  const client = requireAnthropic();

  const message = await client.messages.create({
    model: MODEL_TUTOR,
    max_tokens: 1024,
    system:
      'Sos un analista pedagógico experto. Te doy el historial de un alumno: sus sesiones socráticas, reportes e ideas generadas. ' +
      'Escribí un perfil cognitivo del alumno en 4-6 oraciones. Incluí: cómo piensa (visual, abstracto, concreto, analógico), ' +
      'qué patrones muestra (resistencia, velocidad, profundidad), dónde se traba y qué lo/la desbloquea, qué estrategias ' +
      'pedagógicas le funcionan mejor. Escribí en tercera persona, en español rioplatense, tono profesional pero cálido. ' +
      'No uses bullet points — párrafo corrido.',
    messages: [{ role: 'user', content: context }],
  });

  const summary =
    message.content[0].type === 'text' ? message.content[0].text.trim() : '';

  return { summary };
}

export async function planClass(
  plan: ClassPlan
): Promise<{ planned_content: string; proposed_activity: ProposedActivity }> {
  const context =
    `Edad de los alumnos: ${plan.student_age} años\n` +
    `Temas a cubrir: ${plan.topics}\n` +
    (plan.additional_material
      ? `Material adicional: ${plan.additional_material}\n`
      : '');

  const client = requireAnthropic();

  const message = await client.messages.create({
    model: MODEL_TUTOR,
    max_tokens: 2048,
    system:
      'Sos un experto en diseño pedagógico. Te doy información sobre una clase y debés generar: ' +
      '1) Un plan de clase detallado en formato markdown con tres secciones: Inicio (15 min), Desarrollo (45 min) y Cierre (20 min). ' +
      '2) Una actividad socrática propuesta con título, objetivo, tema, duración estimada en minutos, y configuración con ' +
      'pregunta inicial, criterios de éxito y tono del agente. ' +
      'Respondé EXACTAMENTE en JSON con este formato: ' +
      '{"planned_content": "# Plan de clase\\n...", "proposed_activity": {"title": "...", "objective": "...", ' +
      '"topic": "...", "estimated_duration_minutes": N, "config": {"initial_question": "...", ' +
      '"success_criteria": "...", "agent_tone": "..."}}}. No agregues texto fuera del JSON.',
    messages: [{ role: 'user', content: context }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '';
  const parsed = jsonParse<{
    planned_content: string;
    proposed_activity: ProposedActivity;
  }>(stripJsonFences(raw), {
    planned_content: '',
    proposed_activity: {
      title: '',
      objective: '',
      topic: '',
      estimated_duration_minutes: 30,
      config: {},
    },
  });

  return {
    planned_content: parsed.planned_content,
    proposed_activity: parsed.proposed_activity,
  };
}
