import type { BaseEntity, TenantScoped } from './common';

export enum InvoiceStatus {
  Draft = 'draft',
  Sent = 'sent',
  Paid = 'paid',
  Overdue = 'overdue',
  Cancelled = 'cancelled',
  Refunded = 'refunded',
}

export enum PaymentMethod {
  Card = 'card',
  Transfer = 'transfer',
  Check = 'check',
  Cash = 'cash',
}

export enum PaymentStatus {
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
  Refunded = 'refunded',
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice extends BaseEntity, TenantScoped {
  number: string;
  parent_id: string;
  student_id: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  due_date: string;
  paid_at: string | null;
  payment_method: PaymentMethod;
  payment_reference: string | null;
  notes: string | null;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  status: PaymentStatus;
  processed_at: string;
  created_at: string;
}
