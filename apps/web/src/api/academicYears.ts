import client from './client';

export interface TermData {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  order: number;
}

export interface AcademicYearData {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  terms: TermData[];
  created_at: string;
}

export function getAcademicYears() {
  return client.get<{ data: AcademicYearData[] }>('/v1/academic-years');
}

export function createAcademicYear(data: { name: string; start_date: string; end_date: string }) {
  return client.post<AcademicYearData>('/v1/academic-years', data);
}

export function updateAcademicYear(id: string, data: Partial<{ name: string; start_date: string; end_date: string; is_current: boolean }>) {
  return client.patch<AcademicYearData>(`/v1/academic-years/${id}`, data);
}

export function createTerm(yearId: string, data: { name: string; start_date: string; end_date: string; order: number }) {
  return client.post<TermData>(`/v1/academic-years/${yearId}/terms`, data);
}

export function updateTerm(yearId: string, termId: string, data: Partial<{ name: string; start_date: string; end_date: string }>) {
  return client.patch<TermData>(`/v1/academic-years/${yearId}/terms/${termId}`, data);
}
