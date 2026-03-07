import client from './client';

export type JustificationReason = 'illness' | 'family' | 'transport' | 'other';
export type JustificationStatus = 'pending' | 'accepted' | 'rejected';

export interface JustificationData {
  id: string;
  student_id: string;
  submitted_by: string | null;
  absence_date: string;
  reason: JustificationReason;
  description: string | null;
  document_url: string | null;
  status: JustificationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export function listJustifications(params?: { student_id?: string; status?: string }) {
  return client.get<JustificationData[]>('/v1/justifications', { params });
}

export function submitJustification(data: {
  student_id: string;
  absence_date: string;
  reason: string;
  description?: string;
}) {
  return client.post<JustificationData>('/v1/justifications', data);
}

export function reviewJustification(id: string, status: 'accepted' | 'rejected') {
  return client.patch<JustificationData>(`/v1/justifications/${id}/review`, { status });
}
