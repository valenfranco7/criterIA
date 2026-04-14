import type {
  ActivitySummary,
  ClassPlan,
  ProposedActivity,
  StudentProfile,
} from './contracts.js';

export async function planClass(
  _plan: ClassPlan
): Promise<{ planned_content: string; proposed_activity: ProposedActivity }> {
  throw new Error('not_implemented: planClass');
}

export async function summarizeActivity(
  _activityId: string
): Promise<Omit<ActivitySummary, 'id' | 'created_at'>> {
  throw new Error('not_implemented: summarizeActivity');
}

export async function refreshStudentProfile(
  _studentId: string
): Promise<Pick<StudentProfile, 'summary'>> {
  throw new Error('not_implemented: refreshStudentProfile');
}
