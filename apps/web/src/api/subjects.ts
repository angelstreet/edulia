import client from './client';

export interface SubjectData {
  id: string;
  code: string;
  name: string;
  color: string;
  description: string;
  created_at: string;
}

export function getSubjects() {
  return client.get<{ data: SubjectData[] }>('/v1/subjects');
}

export function createSubject(data: { code: string; name: string; color: string; description?: string }) {
  return client.post<SubjectData>('/v1/subjects', data);
}

export function updateSubject(id: string, data: Partial<{ code: string; name: string; color: string; description: string }>) {
  return client.patch<SubjectData>(`/v1/subjects/${id}`, data);
}

export function deleteSubject(id: string) {
  return client.delete(`/v1/subjects/${id}`);
}
