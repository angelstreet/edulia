import type { BaseEntity, TenantScoped } from './common';

export enum EnrollmentFormType {
  Inscription = 'inscription',
  Reinscription = 'reinscription',
}

export enum EnrollmentFormStatus {
  Draft = 'draft',
  Open = 'open',
  Closed = 'closed',
}

export enum EnrollmentSubmissionStatus {
  Submitted = 'submitted',
  UnderReview = 'under_review',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Waitlisted = 'waitlisted',
}

export enum EnrollmentPaymentMethod {
  Card = 'card',
  Transfer = 'transfer',
  Check = 'check',
  Cash = 'cash',
}

export interface EnrollmentForm extends BaseEntity, TenantScoped {
  academic_year_id: string;
  type: EnrollmentFormType;
  title: string;
  fields: Record<string, unknown>;
  required_documents: string[];
  status: EnrollmentFormStatus;
  opens_at: string;
  closes_at: string;
}

export interface EnrollmentSubmission extends BaseEntity {
  form_id: string;
  parent_id: string;
  student_id: string;
  data: Record<string, unknown>;
  documents: string[];
  e_signature: boolean;
  payment_method: EnrollmentPaymentMethod;
  status: EnrollmentSubmissionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
}
