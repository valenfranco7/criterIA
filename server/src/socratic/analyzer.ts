import type { Phase } from '../contracts.js';

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

export async function runAnalyzer(_input: AnalyzerInput): Promise<AnalyzerOutput> {
  throw new Error('not_implemented: runAnalyzer');
}
