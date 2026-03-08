import client from './client';

export interface LineItem {
  description: string;
  qty: number;
  unit_price_cents: number;
  total_cents: number;
}

export interface PaymentScheduleEntry {
  date: string;
  amount_cents: number;
}

export interface InvoiceData {
  id: string;
  tenant_id: string;
  invoice_number: string;
  created_by: string;
  student_id: string;
  student_name: string;
  student_class: string | null;
  parent_name: string | null;
  parent_address: Record<string, string> | null;
  academic_year: string;
  issue_date: string;
  status: string;
  line_items: LineItem[];
  subtotal_cents: number;
  previous_balance_cents: number;
  total_due_cents: number;
  payment_schedule: PaymentScheduleEntry[];
  payment_method: string | null;
  payment_reference: string | null;
  bank_account: string | null;
  contact_info: string | null;
  notes: string | null;
  paid_cents: number;
  enrollment_request_id: string | null;
}

export interface InvoiceCreate {
  student_id: string;
  student_name: string;
  student_class?: string;
  parent_name?: string;
  parent_address?: { line1?: string; line2?: string; postal_code?: string; city?: string };
  academic_year: string;
  issue_date?: string;
  line_items: LineItem[];
  previous_balance_cents?: number;
  payment_schedule?: PaymentScheduleEntry[];
  payment_method?: string;
  payment_reference?: string;
  bank_account?: string;
  contact_info?: string;
  notes?: string;
}

export const getInvoices = (params?: { student_id?: string; status?: string }) =>
  client.get<InvoiceData[]>('/v1/billing/invoices', { params });

export const createInvoice = (data: InvoiceCreate) =>
  client.post<InvoiceData>('/v1/billing/invoices', data);

export const updateInvoice = (id: string, data: { status?: string; notes?: string }) =>
  client.patch<InvoiceData>(`/v1/billing/invoices/${id}`, data);

export const fetchInvoicePdf = (id: string) =>
  client.get<Blob>(`/v1/billing/invoices/${id}/pdf`, { responseType: 'blob' });

export const payFromWallet = (id: string, amount_cents: number) =>
  client.post<InvoiceData>(`/v1/billing/invoices/${id}/pay-from-wallet`, { amount_cents });
