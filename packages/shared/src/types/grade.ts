import type { BaseEntity, TenantScoped } from './common';

export enum ReportCardStatus {
  Draft = 'draft',
  Approved = 'approved',
  Published = 'published',
}

export interface GradeCategory extends BaseEntity, TenantScoped {
  subject_id: string;
  group_id: string;
  term_id: string;
  name: string;
  weight: number;
}

export interface Assessment extends BaseEntity, TenantScoped {
  subject_id: string;
  group_id: string;
  term_id: string;
  category_id: string;
  teacher_id: string;
  title: string;
  description: string;
  date: string;
  max_score: number;
  coefficient: number;
  is_published: boolean;
}

export interface Grade extends BaseEntity {
  assessment_id: string;
  student_id: string;
  score: number | null;
  is_absent: boolean;
  is_exempt: boolean;
  comment: string | null;
}

export interface ReportCard extends BaseEntity, TenantScoped {
  student_id: string;
  term_id: string;
  academic_year_id: string;
  group_id: string;
  general_average: number;
  class_average: number;
  rank: number | null;
  council_comment: string | null;
  principal_comment: string | null;
  status: ReportCardStatus;
  published_at: string | null;
}

export interface ReportCardSubject extends BaseEntity {
  report_card_id: string;
  subject_id: string;
  teacher_id: string;
  average: number;
  class_average: number;
  min_grade: number;
  max_grade: number;
  coefficient: number;
  teacher_comment: string;
}
