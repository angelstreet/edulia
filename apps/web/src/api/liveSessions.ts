import client from './client';

export interface LiveSession {
  id: string;
  tenant_id: string;
  activity_id: string;
  teacher_id: string;
  join_code: string;
  state: 'lobby' | 'active' | 'reveal' | 'finished';
  current_question_index: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  replay_open?: boolean;
  replay_deadline?: string | null;
}

export interface ReplayAnswer {
  question_index: number;
  selected_ids: string[];
}

export interface ReplayQuestionResult {
  question_index: number;
  is_correct: boolean;
  points_earned: number;
  correct_choice_ids: string[];
  selected_ids: string[];
}

export interface ReplayAttemptResult {
  id: string;
  score: number | null;
  max_score: number | null;
  question_results?: ReplayQuestionResult[];
}

export function createLiveSession(activity_id: string) {
  return client.post<LiveSession>('/v1/sessions', { activity_id });
}

export function getLiveSession(join_code: string) {
  return client.get<LiveSession>(`/v1/sessions/${join_code}`);
}

export function finishLiveSession(join_code: string) {
  return client.post<LiveSession>(`/v1/sessions/${join_code}/finish`);
}

export function enableReplay(joinCode: string, replayDeadline: string | null) {
  return client.post<LiveSession>(`/v1/sessions/${joinCode}/replay`, {
    replay_deadline: replayDeadline,
  });
}

export function submitReplayAttempt(joinCode: string, answers: ReplayAnswer[]) {
  return client.post<ReplayAttemptResult>(`/v1/sessions/${joinCode}/replay/submit`, { answers });
}

export function getReplayAttempt(joinCode: string) {
  return client.get<ReplayAttemptResult>(`/v1/sessions/${joinCode}/replay/my`);
}
