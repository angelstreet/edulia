import client from './client';

export interface Certificate {
  id: string; title: string; issuer: string; issued_date?: string;
  expiry_date?: string; credential_id?: string; verification_url?: string;
  skills?: string; created_at: string;
}

export const getMyCertificates = () => client.get<Certificate[]>('/v1/certificates');
export const createCertificate = (data: Partial<Certificate>) => client.post<Certificate>('/v1/certificates', data);
export const deleteCertificate = (id: string) => client.delete(`/v1/certificates/${id}`);
