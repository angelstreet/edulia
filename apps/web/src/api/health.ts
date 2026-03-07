import client from './client';

export interface HealthRecordData {
  allergies: string | null;
  medical_conditions: string | null;
  medications: string | null;
  doctor_name: string | null;
  doctor_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  blood_type: string | null;
  notes: string | null;
}

export function getHealthRecord(studentId: string) {
  return client.get<HealthRecordData>(`/v1/health/students/${studentId}`);
}

export function updateHealthRecord(studentId: string, data: Partial<HealthRecordData>) {
  return client.put<HealthRecordData>(`/v1/health/students/${studentId}`, data);
}
