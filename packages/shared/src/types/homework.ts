import type { BaseEntity, TenantScoped } from './common';

export enum SubmissionType {
  File = 'file',
  Text = 'text',
  Both = 'both',
}

export enum SubmissionStatus {
  Submitted = 'submitted',
  Late = 'late',
  Graded = 'graded',
  Returned = 'returned',
}

export interface SessionContent extends BaseEntity {
  session_id: string;
  teacher_id: string;
  date: string;
  content: string;
  attachments: string[];
}

export interface Homework extends BaseEntity, TenantScoped {
  subject_id: string;
  group_id: string;
  teacher_id: string;
  title: string;
  description: string;
  assigned_date: string;
  due_date: string;
  due_session_id: string | null;
  attachments: string[];
  allow_submission: boolean;
  submission_type: SubmissionType;
}

export interface Submission extends BaseEntity {
  homework_id: string;
  student_id: string;
  submitted_at: string;
  content: string | null;
  attachments: string[];
  status: SubmissionStatus;
  grade: number | null;
  teacher_feedback: string | null;
  feedback_attachments: string[];
  graded_at: string | null;
}
