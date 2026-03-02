import client from './client';

export interface HomeworkData {
  id: string;
  tenant_id: string;
  subject_id: string;
  group_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  assigned_date: string;
  due_date: string;
  allow_submission: boolean;
  submission_type: string;
  created_at: string;
}

export interface SubmissionData {
  id: string;
  homework_id: string;
  student_id: string;
  submitted_at: string;
  content: string | null;
  status: string;
  grade: number | null;
  teacher_feedback: string | null;
  graded_at: string | null;
  created_at: string;
}

export function getHomework(params: { group_id?: string; subject_id?: string; due_from?: string; due_until?: string } = {}) {
  return client.get<HomeworkData[]>('/v1/homework', { params });
}

export function createHomework(data: {
  subject_id: string;
  group_id: string;
  title: string;
  description?: string;
  assigned_date: string;
  due_date: string;
  allow_submission?: boolean;
  submission_type?: string;
}) {
  return client.post<HomeworkData>('/v1/homework', data);
}

export function getSubmissions(homeworkId: string) {
  return client.get<SubmissionData[]>(`/v1/homework/${homeworkId}/submissions`);
}

export function submitHomework(homeworkId: string, data: { content?: string }) {
  return client.post<SubmissionData>(`/v1/homework/${homeworkId}/submit`, data);
}
