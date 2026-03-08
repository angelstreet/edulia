import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import {
  getInvoices, createInvoice, updateInvoice, downloadInvoicePdf, payFromWallet,
  type InvoiceData, type LineItem, type PaymentScheduleEntry,
} from '../../../api/billing';
import { getWallet, type WalletData } from '../../../api/wallet';
import { getDirectory, type DirectoryUser } from '../../../api/community';
import { getSettings } from '../../../api/tenant';

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  draft: 'default', sent: 'warning', paid: 'success', cancelled: 'danger',
};

function formatCents(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function currentAcademicYear() {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
}

const EMPTY_ITEM = (): LineItem => ({ description: '', qty: 1, unit_price_cents: 0, total_cents: 0 });
const EMPTY_SCHED = (): PaymentScheduleEntry => ({ date: '', amount_cents: 0 });

export function BillingPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const canManage = user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'tutor';
  const isParent = user?.role === 'parent';

  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Pay from wallet modal
  const [payingInvoice, setPayingInvoice] = useState<InvoiceData | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);

  // Create invoice form
  const [showCreate, setShowCreate] = useState(false);
  const [students, setStudents] = useState<DirectoryUser[]>([]);
  const [studentId, setStudentId] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentLine1, setParentLine1] = useState('');
  const [parentLine2, setParentLine2] = useState('');
  const [parentPostal, setParentPostal] = useState('');
  const [parentCity, setParentCity] = useState('');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [lineItems, setLineItems] = useState<LineItem[]>([EMPTY_ITEM()]);
  const [prevBalance, setPrevBalance] = useState('0');
  const [schedule, setSchedule] = useState<PaymentScheduleEntry[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, walRes] = await Promise.allSettled([
        getInvoices(statusFilter ? { status: statusFilter } : undefined),
        getWallet(),
      ]);
      if (invRes.status === 'fulfilled') setInvoices(invRes.value.data);
      if (walRes.status === 'fulfilled') setWallet(walRes.value.data);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!showCreate || !canManage) return;
    getDirectory({ role: 'student' }).then(r => setStudents(r.data || [])).catch(() => {});
    getSettings().then(r => {
      if (r.data.default_bank_account) setBankAccount(r.data.default_bank_account);
      if (r.data.default_contact_info) setContactInfo(r.data.default_contact_info);
    }).catch(() => {});
  }, [showCreate, canManage]);

  function updateItem(index: number, field: keyof LineItem, raw: string) {
    setLineItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === 'description') { item.description = raw; }
      else {
        const num = parseFloat(raw) || 0;
        (item as any)[field] = (field === 'unit_price_cents' || field === 'total_cents') ? Math.round(num * 100) : num;
        item.total_cents = Math.round(item.qty * item.unit_price_cents);
      }
      updated[index] = item;
      return updated;
    });
  }

  const subtotal = lineItems.reduce((s, i) => s + i.total_cents, 0);
  const prevBalanceCents = Math.round((parseFloat(prevBalance) || 0) * 100);
  const totalDue = subtotal + prevBalanceCents;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const selected = students.find(s => s.id === studentId);
    if (!selected) return;
    setSubmitting(true);
    try {
      await createInvoice({
        student_id: studentId,
        student_name: selected.display_name,
        student_class: studentClass || undefined,
        parent_name: parentName || undefined,
        parent_address: { line1: parentLine1, line2: parentLine2, postal_code: parentPostal, city: parentCity },
        academic_year: academicYear, issue_date: issueDate,
        line_items: lineItems, previous_balance_cents: prevBalanceCents,
        payment_schedule: schedule.filter(s => s.date),
        payment_method: paymentMethod || undefined, payment_reference: paymentRef || undefined,
        bank_account: bankAccount || undefined, contact_info: contactInfo || undefined,
      });
      setShowCreate(false); resetForm(); fetchAll();
    } catch { /**/ }
    setSubmitting(false);
  }

  function resetForm() {
    setStudentId(''); setStudentClass(''); setParentName('');
    setParentLine1(''); setParentLine2(''); setParentPostal(''); setParentCity('');
    setAcademicYear(currentAcademicYear()); setIssueDate(new Date().toISOString().slice(0, 10));
    setLineItems([EMPTY_ITEM()]); setPrevBalance('0'); setSchedule([]);
    setPaymentMethod(''); setPaymentRef(''); setBankAccount(''); setContactInfo('');
  }

  function openPay(inv: InvoiceData) {
    setPayingInvoice(inv);
    setPayAmount(((inv.total_due_cents - inv.paid_cents) / 100).toFixed(2));
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!payingInvoice) return;
    const cents = Math.round(parseFloat(payAmount) * 100);
    if (!cents || cents <= 0) return;
    setPaying(true);
    try {
      await payFromWallet(payingInvoice.id, cents);
      setPayingInvoice(null);
      fetchAll();
    } catch { /**/ }
    setPaying(false);
  }

  const remaining = payingInvoice ? payingInvoice.total_due_cents - payingInvoice.paid_cents : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('billing', 'Billing')}</h1>
        {canManage && (
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            + {t('newInvoice', 'New Invoice')}
          </Button>
        )}
      </div>

      {/* Wallet balance — shown to all (parents top up here) */}
      {wallet && (
        <div className="bg-slate-800 text-white rounded-xl p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300 mb-0.5">{t('walletBalance', 'Wallet balance')}</p>
            <p className="text-3xl font-bold">{formatCents(wallet.balance_cents)}</p>
            <p className="text-xs text-slate-400 mt-1">{t('useWalletToPay', 'Use this balance to pay invoices below')}</p>
          </div>
          <a href="/wallet" className="text-sm px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            + {t('topUp', 'Top Up')}
          </a>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['', 'draft', 'sent', 'paid', 'cancelled'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${statusFilter === s ? 'bg-slate-800 text-white border-slate-800' : 'border-border text-muted-foreground hover:border-foreground'}`}>
            {s === '' ? t('all', 'All') : t(s, s.charAt(0).toUpperCase() + s.slice(1))}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : invoices.length === 0 ? (
        <EmptyState title={t('noInvoices', 'No invoices')} description={isParent ? t('noInvoicesParent', 'Invoices from the school will appear here.') : t('noInvoicesAdmin', 'Create invoices to send to parents.')} />
      ) : (
        <div className="flex flex-col gap-2">
          {invoices.map(inv => {
            const paidPct = inv.total_due_cents > 0 ? Math.min(100, Math.round((inv.paid_cents / inv.total_due_cents) * 100)) : 0;
            const invoiceRemaining = inv.total_due_cents - inv.paid_cents;
            const canPay = isParent && inv.status !== 'paid' && inv.status !== 'cancelled' && invoiceRemaining > 0 && wallet && wallet.balance_cents > 0;
            return (
              <div key={inv.id} className="p-4 border rounded-lg bg-card">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm">{inv.invoice_number}</span>
                      <Badge variant={STATUS_COLORS[inv.status] || 'default'}>{inv.status}</Badge>
                    </div>
                    <p className="text-sm text-foreground">{inv.student_name}{inv.student_class ? ` — ${inv.student_class}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{inv.academic_year} · {new Date(inv.issue_date).toLocaleDateString('fr-FR')}{inv.parent_name ? ` · ${inv.parent_name}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">{formatCents(inv.total_due_cents)}</p>
                    {inv.paid_cents > 0 && inv.status !== 'paid' && (
                      <p className="text-xs text-green-600">{formatCents(inv.paid_cents)} {t('paid', 'paid')}</p>
                    )}
                    {inv.status !== 'paid' && invoiceRemaining > 0 && (
                      <p className="text-xs text-muted-foreground">{formatCents(invoiceRemaining)} {t('remaining', 'remaining')}</p>
                    )}
                  </div>
                </div>

                {/* Progress bar for partial payments */}
                {inv.paid_cents > 0 && inv.status !== 'paid' && (
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                  </div>
                )}

                <div className="flex gap-2 mt-3 flex-wrap">
                  <a href={downloadInvoicePdf(inv.id)} target="_blank" rel="noreferrer"
                    className="text-xs px-2 py-1 border rounded hover:bg-muted">
                    PDF
                  </a>
                  {canPay && (
                    <Button variant="primary" size="sm" onClick={() => openPay(inv)}>
                      {t('payFromWallet', 'Pay from wallet')}
                    </Button>
                  )}
                  {canManage && inv.status === 'draft' && (
                    <Button variant="ghost" size="sm" onClick={() => updateInvoice(inv.id, { status: 'sent' }).then(fetchAll)}>
                      {t('markSent', 'Send')}
                    </Button>
                  )}
                  {canManage && inv.status !== 'paid' && inv.status !== 'cancelled' && (
                    <Button variant="ghost" size="sm" onClick={() => updateInvoice(inv.id, { status: 'paid' }).then(fetchAll)}>
                      {t('markPaid', 'Mark paid')}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pay from wallet modal */}
      <Modal open={!!payingInvoice} title={t('payFromWallet', 'Pay from wallet')} onClose={() => setPayingInvoice(null)}>
        {payingInvoice && (
          <form onSubmit={handlePay} className="flex flex-col gap-4">
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">{t('invoice', 'Invoice')}:</span> {payingInvoice.invoice_number}</p>
              <p><span className="text-muted-foreground">{t('totalDue', 'Total due')}:</span> <strong>{formatCents(payingInvoice.total_due_cents)}</strong></p>
              {payingInvoice.paid_cents > 0 && <p><span className="text-muted-foreground">{t('alreadyPaid', 'Already paid')}:</span> {formatCents(payingInvoice.paid_cents)}</p>}
              <p><span className="text-muted-foreground">{t('remaining', 'Remaining')}:</span> <strong>{formatCents(remaining)}</strong></p>
              {wallet && <p><span className="text-muted-foreground">{t('walletBalance', 'Wallet balance')}:</span> {formatCents(wallet.balance_cents)}</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">{t('amountToPay', 'Amount to pay (€)')}</label>
              <Input type="number" step="0.01" min="0.01" max={(remaining / 100).toFixed(2)}
                value={payAmount} onChange={e => setPayAmount(e.target.value)} required />
              <p className="text-xs text-muted-foreground mt-1">{t('partialPaymentHint', 'You can pay the full amount or a partial amount.')}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="ghost" onClick={() => setPayingInvoice(null)}>{t('cancel', 'Cancel')}</Button>
              <Button type="submit" variant="primary" disabled={paying}>
                {paying ? t('processing', 'Processing…') : t('confirmPayment', 'Confirm payment')}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create invoice modal (admin/teacher/tutor only) */}
      <Modal open={showCreate} title={t('newInvoice', 'New Invoice')} onClose={() => { setShowCreate(false); resetForm(); }}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto pr-1">
          <fieldset className="border rounded-md p-3">
            <legend className="text-xs font-semibold px-1">{t('student', 'Student')}</legend>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1">{t('student', 'Student')} *</label>
                <select value={studentId} onChange={e => setStudentId(e.target.value)} required
                  className="w-full border rounded-md px-2 py-1.5 text-sm bg-background">
                  <option value="">— {t('select', 'select')} —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">{t('classLabel', 'Class / Level')}</label>
                <Input value={studentClass} onChange={e => setStudentClass(e.target.value)} placeholder="PS/MS, 6ème B…" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">{t('academicYear', 'Academic year')}</label>
                <Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">{t('issueDate', 'Issue date')}</label>
                <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </div>
            </div>
          </fieldset>

          <fieldset className="border rounded-md p-3">
            <legend className="text-xs font-semibold px-1">{t('parentAddress', 'Parent / Address')}</legend>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1">{t('parentName', 'Parent name')}</label>
                <Input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Mme DUPONT Isabelle" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1">{t('addressLine1', 'Address')}</label>
                <Input value={parentLine1} onChange={e => setParentLine1(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">{t('postalCode', 'Postal')}</label>
                <Input value={parentPostal} onChange={e => setParentPostal(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">{t('city', 'City')}</label>
                <Input value={parentCity} onChange={e => setParentCity(e.target.value)} />
              </div>
            </div>
          </fieldset>

          <fieldset className="border rounded-md p-3">
            <legend className="text-xs font-semibold px-1">{t('lineItems', 'Line items')}</legend>
            <div className="flex flex-col gap-2 mt-1">
              {lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px_80px_80px_24px] gap-1 items-center">
                  <Input placeholder={t('description', 'Description')} value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                  <Input type="number" step="0.01" placeholder="Qty" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} />
                  <Input type="number" step="0.01" placeholder="Unit €" value={(item.unit_price_cents / 100).toFixed(2)} onChange={e => updateItem(i, 'unit_price_cents', e.target.value)} />
                  <Input type="number" step="0.01" placeholder="Total €" value={(item.total_cents / 100).toFixed(2)} readOnly className="bg-muted" />
                  <button type="button" onClick={() => setLineItems(p => p.filter((_, idx) => idx !== i))} className="text-red-500 font-bold">×</button>
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={() => setLineItems(p => [...p, EMPTY_ITEM()])}>+ {t('addLine', 'Add line')}</Button>
              <p className="text-xs text-muted-foreground">{t('negativeQtyHint', 'Use qty −1 for discounts/reductions')}</p>
            </div>
          </fieldset>

          <div className="flex justify-end gap-6 text-sm">
            <span className="text-muted-foreground">{t('subtotal', 'Subtotal')}: <strong>{formatCents(subtotal)}</strong></span>
            <span className="text-muted-foreground flex items-center gap-1">
              {t('previousBalance', 'Solde antérieur')}:
              <input type="number" step="0.01" value={prevBalance} onChange={e => setPrevBalance(e.target.value)}
                className="w-20 border rounded px-1 py-0.5 text-right text-sm bg-background ml-1" />
            </span>
            <span className="text-muted-foreground">{t('totalDue', 'Total')}: <strong>{formatCents(totalDue)}</strong></span>
          </div>

          <fieldset className="border rounded-md p-3">
            <legend className="text-xs font-semibold px-1">{t('paymentSchedule', 'Échéancier')}</legend>
            <div className="flex flex-col gap-1 mt-1">
              {schedule.map((entry, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_24px] gap-1 items-center">
                  <Input type="date" value={entry.date} onChange={e => setSchedule(p => { const u=[...p]; u[i]={...u[i],date:e.target.value}; return u; })} />
                  <Input type="number" step="0.01" placeholder="€" value={(entry.amount_cents/100).toFixed(2)} onChange={e => setSchedule(p => { const u=[...p]; u[i]={...u[i],amount_cents:Math.round((parseFloat(e.target.value)||0)*100)}; return u; })} />
                  <button type="button" onClick={() => setSchedule(p => p.filter((_,idx) => idx !== i))} className="text-red-500 font-bold">×</button>
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={() => setSchedule(p => [...p, EMPTY_SCHED()])}>+ {t('addDate', 'Add date')}</Button>
            </div>
          </fieldset>

          <fieldset className="border rounded-md p-3">
            <legend className="text-xs font-semibold px-1">{t('paymentInfo', 'Payment info')}</legend>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div>
                <label className="text-xs font-medium block mb-1">{t('method', 'Method')}</label>
                <Input value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} placeholder="Prélèvement…" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">{t('reference', 'Reference')}</label>
                <Input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="4111DUPONT" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1">IBAN</label>
                <Input value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="FR76…" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1">{t('footerNote', 'Footer note')}</label>
                <textarea value={contactInfo} onChange={e => setContactInfo(e.target.value)} rows={2}
                  className="w-full border rounded-md px-2 py-1.5 text-sm bg-background resize-none" />
              </div>
            </div>
          </fieldset>

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); resetForm(); }}>{t('cancel', 'Cancel')}</Button>
            <Button type="submit" variant="primary" disabled={submitting || !studentId}>
              {submitting ? t('saving', 'Saving…') : t('createInvoice', 'Create Invoice')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
