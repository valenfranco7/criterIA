import type { Phase } from '../contracts.js';
import { requireAnthropic, MODEL_ANALYZER } from '../anthropic.js';

export interface AnalyzerOutput {
  resistance_level: 0 | 1 | 2 | 3;
  blockage_level: 0 | 1 | 2 | 3;
  phase_action: 'stay' | 'advance' | 'retreat';
}

export interface AnalyzerInput {
  current_phase: Phase;
  recent_history: Array<{ role: 'student' | 'assistant'; content: string }>;
  student_message: string;
}

export async function runAnalyzer(input: AnalyzerInput): Promise<AnalyzerOutput> {
  const client = requireAnthropic();

  const history = input.recent_history
    .map(m => `${m.role === 'student' ? 'Estudiante' : 'Tutor'}: ${m.content}`)
    .join('\n');

  const prompt = `Sos un analizador de conversaciones socráticamente guiadas para educación secundaria argentina.

Fase actual: ${input.current_phase}
Orden de fases: anchoring → exploration → tension → consolidation

Historial reciente:
${history || '(sin historial previo)'}

Último mensaje del estudiante: "${input.student_message}"

Evaluá y respondé SOLO con JSON sin explicación adicional:
- resistance_level (0-3): qué tan resistente está el estudiante a avanzar/profundizar (0=muy receptivo, 3=muy resistente/evasivo)
- blockage_level (0-3): qué tan bloqueado conceptualmente está (0=fluido y comprende bien, 3=completamente perdido)
- phase_action: "stay" (continuar en la misma fase), "advance" (avanzar a la siguiente fase), "retreat" (retroceder a la fase anterior)

Criterio advance: el estudiante demostró comprensión sólida de la fase actual
Criterio retreat: el estudiante está muy bloqueado (blockage_level >= 3) y necesita anclar conceptos previos
Criterio stay: situación normal, seguir trabajando la fase

JSON exacto (sin markdown, sin texto extra):`;

  const response = await client.messages.create({
    model: MODEL_ANALYZER,
    max_tokens: 128,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';

  try {
    const parsed = JSON.parse(raw) as Partial<AnalyzerOutput>;
    const resistance = Number(parsed.resistance_level ?? 1);
    const blockage = Number(parsed.blockage_level ?? 1);
    const action = parsed.phase_action;
    return {
      resistance_level: (Math.min(3, Math.max(0, resistance)) as 0 | 1 | 2 | 3),
      blockage_level: (Math.min(3, Math.max(0, blockage)) as 0 | 1 | 2 | 3),
      phase_action: action === 'advance' || action === 'retreat' ? action : 'stay',
    };
  } catch {
    return { resistance_level: 1, blockage_level: 1, phase_action: 'stay' };
  }
}
