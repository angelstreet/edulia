import client from './client';

export interface WalletData {
  id: string;
  user_id: string;
  balance_cents: number;
  currency: string;
  last_topped_up: string | null;
  recent_transactions: TransactionData[];
}

export interface TransactionData {
  id: string;
  wallet_id: string;
  amount_cents: number;
  type: string;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
  stripe_payment_intent_id?: string | null;
}

export interface PaymentIntentData {
  client_secret: string;
  payment_intent_id: string;
}

export interface ServiceData {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  unit_price_cents: number;
  billing_period: string;
  active: boolean;
  created_at: string;
}

export interface SubscriptionData {
  id: string;
  student_id: string;
  service_id: string;
  start_date: string;
  end_date: string | null;
  days_of_week: number[];
  status: string;
  created_at: string;
}

export function getWallet() {
  return client.get<WalletData>('/v1/wallet');
}

export function topupWallet(amount_cents: number, description?: string) {
  return client.post<TransactionData>('/v1/wallet/topup', { amount_cents, description: description ?? 'Top-up' });
}

export function getTransactions(page = 1) {
  return client.get<TransactionData[]>('/v1/wallet/transactions', { params: { page } });
}

export function debitWallet(amount_cents: number, description: string) {
  return client.post<TransactionData>('/v1/wallet/debit', { amount_cents, description });
}

export function getServices() {
  return client.get<ServiceData[]>('/v1/services');
}

export function createService(data: { name: string; category: string; unit_price_cents: number; billing_period: string }) {
  return client.post<ServiceData>('/v1/services', data);
}

export function subscribeService(serviceId: string, studentId: string, daysOfWeek: number[] = []) {
  return client.post<SubscriptionData>(`/v1/services/${serviceId}/subscribe`, {
    student_id: studentId,
    days_of_week: daysOfWeek,
  });
}

export function getSubscriptions(studentId?: string) {
  return client.get<SubscriptionData[]>('/v1/wallet/subscriptions', {
    params: studentId ? { student_id: studentId } : {},
  });
}

export function cancelSubscription(subscriptionId: string) {
  return client.delete<SubscriptionData>(`/v1/wallet/subscriptions/${subscriptionId}`);
}

export function createPaymentIntent(amount_cents: number) {
  return client.post<PaymentIntentData>('/v1/wallet/create-payment-intent', { amount_cents });
}
