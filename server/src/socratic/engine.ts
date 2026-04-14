import type { ActivitySession, Phase, ActivityConfig } from '../contracts.js';
import { runAnalyzer } from './analyzer.js';
import { runTutor } from './tutor.js';

export const PHASE_ORDER: Phase[] = [
  'anchoring',
  'exploration',
  'tension',
  'consolidation',
];

export const PHASE_HARD_CAP = 8;

export function nextPhase(current: Phase): Phase {
  const i = PHASE_ORDER.indexOf(current);
  return PHASE_ORDER[Math.min(i + 1, PHASE_ORDER.length - 1)];
}

export function previousPhase(current: Phase): Phase {
  const i = PHASE_ORDER.indexOf(current);
  return PHASE_ORDER[Math.max(i - 1, 0)];
}

export async function runTurn(
  session: ActivitySession,
  studentMessage: string,
  recentHistory: Array<{ role: 'student' | 'assistant'; content: string }>,
  activityConfig: ActivityConfig
): Promise<{
  assistant_content: string;
  analyzer_json: string;
  next_phase: Phase;
  next_phase_turn_count: number;
}> {
  // 1. Analyzer: classify pedagogical state
  const analyzerOutput = await runAnalyzer({
    current_phase: session.current_phase,
    recent_history: recentHistory,
    student_message: studentMessage,
  });

  // 2. Tutor: generate socratic response
  const assistantContent = await runTutor({
    current_phase: session.current_phase,
    recent_history: recentHistory,
    student_message: studentMessage,
    analyzer_notes: analyzerOutput,
    activity_config: activityConfig,
  });

  // 3. Phase transition logic
  let nextPhaseValue = session.current_phase;
  let nextPhaseTurnCount = session.phase_turn_count + 1;

  const forcedAdvance = session.phase_turn_count >= PHASE_HARD_CAP;
  const action = forcedAdvance ? 'advance' : analyzerOutput.phase_action;

  if (action === 'advance') {
    nextPhaseValue = nextPhase(session.current_phase);
    nextPhaseTurnCount = 0;
  } else if (action === 'retreat') {
    nextPhaseValue = previousPhase(session.current_phase);
    nextPhaseTurnCount = 0;
  }
  // 'stay' → keep current phase, increment turn count (already done above)

  return {
    assistant_content: assistantContent,
    analyzer_json: JSON.stringify(analyzerOutput),
    next_phase: nextPhaseValue,
    next_phase_turn_count: nextPhaseTurnCount,
  };
}
