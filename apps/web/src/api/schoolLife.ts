import client from './client';

export interface Incident {
  id: string;
  tenant_id: string;
  student_id: string;
  reported_by: string;
  incident_type: string;
  severity: string;
  description: string;
  action_taken: string | null;
  status: string;
  created_at: string;
}

export interface IncidentCreate {
  student_id: string;
  incident_type?: string;
  severity?: string;
  description: string;
  action_taken?: string;
}

export function getIncidents(params: { student_id?: string; status?: string } = {}) {
  return client.get<Incident[]>('/v1/school-life/incidents', { params });
}

export function createIncident(data: IncidentCreate) {
  return client.post<Incident>('/v1/school-life/incidents', data);
}

export function updateIncident(id: string, data: { action_taken?: string; status?: string; severity?: string }) {
  return client.patch<Incident>(`/v1/school-life/incidents/${id}`, data);
}
