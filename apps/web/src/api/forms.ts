import client from './client';

export interface FormField {
  id: string;
  form_id: string;
  label: string;
  field_type: string;
  required: boolean;
  options: string[];
  position: number;
}

export interface FormData {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  target_roles: string[];
  deadline: string | null;
  created_by: string;
  created_at: string;
  response_count: number;
  fields?: FormField[];
}

export interface FormResponseRecord {
  id: string;
  form_id: string;
  user_id: string;
  submitted_at: string;
  data: Record<string, unknown>;
}

export interface FormStats {
  field_id: string;
  label: string;
  field_type: string;
  summary: Record<string, unknown>;
}

export interface FormFieldCreate {
  label: string;
  field_type: string;
  required: boolean;
  options: string[];
  position: number;
}

export interface FormCreate {
  title: string;
  description?: string;
  type: string;
  target_roles: string[];
  deadline?: string;
  fields: FormFieldCreate[];
}

export function getForms(params: { status?: string; target_role?: string } = {}) {
  return client.get<FormData[]>('/v1/forms', { params });
}

export function getForm(id: string) {
  return client.get<FormData>(`/v1/forms/${id}`);
}

export function createForm(data: FormCreate) {
  return client.post<FormData>('/v1/forms', data);
}

export function updateForm(id: string, data: { title?: string; description?: string; status?: string; deadline?: string }) {
  return client.patch<FormData>(`/v1/forms/${id}`, data);
}

export function submitResponse(formId: string, data: Record<string, unknown>) {
  return client.post<FormResponseRecord>(`/v1/forms/${formId}/responses`, { data });
}

export function getResponses(formId: string) {
  return client.get<FormResponseRecord[]>(`/v1/forms/${formId}/responses`);
}

export function getFormStats(formId: string) {
  return client.get<FormStats[]>(`/v1/forms/${formId}/stats`);
}
