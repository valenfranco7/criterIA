import type { ActivitySession, ExtractedIdea } from '../contracts.js';

export interface CloseResult {
  session_summary: string;
  teacher_report: string;
  extracted_ideas: ExtractedIdea[];
}

export async function closeSession(
  _session: ActivitySession
): Promise<CloseResult> {
  throw new Error('not_implemented: closeSession');
}
