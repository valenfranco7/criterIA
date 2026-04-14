import type { ActivitySession, Phase } from '../contracts.js';

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
  _session: ActivitySession,
  _studentMessage: string
): Promise<{
  assistant_content: string;
  analyzer_json: string;
  next_phase: Phase;
  next_phase_turn_count: number;
}> {
  throw new Error('not_implemented: runTurn');
}
