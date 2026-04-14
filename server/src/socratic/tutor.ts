import type { Phase } from '../contracts.js';
import type { AnalyzerOutput } from './analyzer.js';

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

export async function runTutor(_input: TutorInput): Promise<string> {
  throw new Error('not_implemented: runTutor');
}
