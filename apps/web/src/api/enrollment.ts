import client from './client';

export type EnrollmentStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';

export interface EnrollmentData {
  id: string;
  tenant_id: string;
  parent_first_name: string;
  parent_last_name: string;
  parent_email: string;
  parent_phone: string | null;
  child_first_name: string;
  child_last_name: string;
  child_date_of_birth: string | null;
  child_gender: string | null;
  requested_group_id: string | null;
  status: EnrollmentStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  documents: string[];
  student_user_id: string | null;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrollmentCreatePayload {
  parent_first_name: string;
  parent_last_name: string;
  parent_email: string;
  parent_phone?: string;
  child_first_name: string;
  child_last_name: string;
  child_date_of_birth?: string;
  child_gender?: string;
  requested_group_id?: string;
  documents?: string[];
}

export interface EnrollmentReviewPayload {
  status: 'reviewing' | 'approved' | 'rejected';
  admin_notes?: string;
}

export function listEnrollments(status?: EnrollmentStatus) {
  return client.get<EnrollmentData[]>('/v1/enrollment', { params: status ? { status } : {} });
}

export function getMyEnrollments() {
  return client.get<EnrollmentData[]>('/v1/enrollment/my');
}

export function submitEnrollment(data: EnrollmentCreatePayload) {
  return client.post<EnrollmentData>('/v1/enrollment', data);
}

export function reviewEnrollment(id: string, data: EnrollmentReviewPayload) {
  return client.patch<EnrollmentData>(`/v1/enrollment/${id}/review`, data);
}
