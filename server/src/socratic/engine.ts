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
  // Analyze student's current state
  const analyzerOutput = await runAnalyzer({
    current_phase: session.current_phase,
    recent_history: recentHistory,
    student_message: studentMessage,
  });

  // Determine phase transition
  let next_phase = session.current_phase;
  let next_phase_turn_count = session.phase_turn_count + 1;

  const atHardCap = session.phase_turn_count >= PHASE_HARD_CAP;

  if (analyzerOutput.phase_action === 'advance' || atHardCap) {
    const advanced = nextPhase(session.current_phase);
    if (advanced !== session.current_phase) {
      next_phase = advanced;
      next_phase_turn_count = 0;
    }
  } else if (
    analyzerOutput.phase_action === 'retreat' &&
    session.phase_turn_count >= 2
  ) {
    const retreated = previousPhase(session.current_phase);
    if (retreated !== session.current_phase) {
      next_phase = retreated;
      next_phase_turn_count = 0;
    }
  }

  // Generate tutor response using the target phase
  const assistantContent = await runTutor({
    current_phase: next_phase,
    recent_history: recentHistory,
    student_message: studentMessage,
    analyzer_notes: analyzerOutput,
    activity_config: activityConfig,
  });

  return {
    assistant_content: assistantContent,
    analyzer_json: JSON.stringify(analyzerOutput),
    next_phase,
    next_phase_turn_count,
  };
}
