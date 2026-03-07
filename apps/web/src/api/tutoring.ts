import client from './client';

export interface TutoringSessionData {
  id: string;
  tutor_id: string;
  student_id: string;
  subject_id: string | null;
  session_date: string;
  duration_minutes: number;
  rate_cents: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  homework_given: string | null;
  package_id: string | null;
  invoiced: boolean;
  created_at: string;
}

export interface TutoringPackageData {
  id: string;
  tutor_id: string;
  student_id: string;
  name: string;
  sessions_total: number;
  sessions_used: number;
  price_cents: number;
  status: 'active' | 'completed' | 'cancelled';
  paid: boolean;
  notes: string | null;
}

export interface TutoringInvoiceData {
  id: string;
  invoice_number: string;
  student_id: string;
  period_label: string | null;
  line_items: Array<{ description: string; total_cents: number }>;
  total_cents: number;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
}

export interface MyStudent {
  student_id: string;
  session_count: number;
  last_session: string | null;
}

export function getMyStudents() { return client.get<MyStudent[]>('/v1/tutoring/my-students'); }
export function listSessions(params?: { student_id?: string }) { return client.get<TutoringSessionData[]>('/v1/tutoring/sessions', { params }); }
export function createSession(data: Partial<TutoringSessionData>) { return client.post<TutoringSessionData>('/v1/tutoring/sessions', data); }
export function updateSession(id: string, data: Partial<TutoringSessionData>) { return client.patch<TutoringSessionData>(`/v1/tutoring/sessions/${id}`, data); }
export function listPackages(params?: { student_id?: string }) { return client.get<TutoringPackageData[]>('/v1/tutoring/packages', { params }); }
export function createPackage(data: Partial<TutoringPackageData>) { return client.post<TutoringPackageData>('/v1/tutoring/packages', data); }
export function generateInvoice(data: { student_id: string; period_label?: string; notes?: string }) { return client.post<TutoringInvoiceData>('/v1/tutoring/invoices/generate', data); }
export function listInvoices() { return client.get<TutoringInvoiceData[]>('/v1/tutoring/invoices'); }
export function downloadInvoicePdf(invoiceId: string): string { return `/api/v1/tutoring/invoices/${invoiceId}/pdf`; }
