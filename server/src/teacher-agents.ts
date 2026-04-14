import type {
  ClassPlan,
  ProposedActivity,
} from './contracts.js';
import { jsonParse } from './db.js';
import { requireAnthropic, MODEL_TUTOR } from './anthropic.js';

/** Strip optional ```json ... ``` markdown fences from an LLM response. */
function stripJsonFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
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
