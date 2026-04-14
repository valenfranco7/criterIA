import type { Phase } from '../contracts.js';
import type { AnalyzerOutput } from './analyzer.js';
import { requireAnthropic, MODEL_TUTOR } from '../anthropic.js';

export interface TutorInput {
  current_phase: Phase;
  recent_history: Array<{ role: 'student' | 'assistant'; content: string }>;
  student_message: string;
  analyzer_notes: AnalyzerOutput;
  activity_config: {
    initial_question?: string;
    success_criteria?: string;
    agent_tone?: string;
    reference_material?: string;
  };
}

const PHASE_INSTRUCTIONS: Record<Phase, string> = {
  anchoring: `Estás en la fase de ANCLAJE.
Objetivo: conectar el tema con las experiencias personales del estudiante.
- Hacé UNA pregunta que conecte el tema abstracto con su vida cotidiana o algo que conoce
- Usá analogías con situaciones que el estudiante pueda haber vivido
- No expliques el contenido todavía, solo buscá el punto de contacto personal
- Si el estudiante ya conectó el tema con su experiencia, reforzá esa conexión`,

  exploration: `Estás en la fase de EXPLORACIÓN.
Objetivo: abrir el pensamiento del estudiante sobre el tema.
- Hacé preguntas abiertas que inviten a explorar múltiples ángulos
- Cuando el estudiante diga algo interesante, profundizá en eso
- Invitalo a considerar perspectivas que no mencionó
- Ayudalo a articular mejor lo que ya intuyó`,

  tension: `Estás en la fase de TENSIÓN.
Objetivo: introducir contradicciones productivas para profundizar el pensamiento.
- Señalá tensiones o contradicciones en lo que dijo el estudiante
- Presentá casos o perspectivas que desafíen sus conclusiones previas
- Ayudalo a ver la complejidad del tema
- No resuelvas la tensión vos, dejá que el estudiante la trabaje`,

  consolidation: `Estás en la fase de CONSOLIDACIÓN.
Objetivo: ayudar al estudiante a formular sus propias conclusiones.
- Ayudalo a sintetizar lo que aprendió con sus propias palabras
- Preguntale cómo conectaría esto con otras cosas que sabe
- Invitalo a formular una idea propia que se lleve
- Celebrá las ideas propias que formuló durante la conversación`,
};

export async function runTutor(input: TutorInput): Promise<string> {
  const client = requireAnthropic();

  const phaseInstruction = PHASE_INSTRUCTIONS[input.current_phase];
  const tone = input.activity_config.agent_tone ?? 'socrático, cercano, sin dar respuestas';
  const criteria = input.activity_config.success_criteria ?? '';

  const systemPrompt = `Sos un tutor socrático para estudiantes de secundaria argentina. Tu estilo: ${tone}.

${phaseInstruction}

Criterio de éxito de la actividad: ${criteria || '(no especificado)'}

REGLAS ABSOLUTAS:
- NUNCA des la respuesta directa ni expliques el contenido
- Hacé UNA sola pregunta por vez, al final de tu respuesta
- Usá el lenguaje del estudiante, no el académico formal
- Respondé en 2-4 oraciones máximo
- Si el estudiante está resistente (nivel ${input.analyzer_notes.resistance_level}/3), usá una pregunta más concreta y cercana a su experiencia
- Si está bloqueado (nivel ${input.analyzer_notes.blockage_level}/3), descomponé en algo aún más simple antes de preguntar
- Nunca uses frases condescendientes como "¡Muy bien!" o "¡Excelente respuesta!"`;

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...input.recent_history.map(m => ({
      role: (m.role === 'student' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: input.student_message },
  ];

  const response = await client.messages.create({
    model: MODEL_TUTOR,
    max_tokens: 512,
    system: systemPrompt,
    messages,
  });

  return response.content[0].type === 'text' ? response.content[0].text.trim() : '';
}
