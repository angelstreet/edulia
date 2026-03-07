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
  getInvoices, createInvoice, updateInvoice, downloadInvoicePdf,
  type InvoiceData, type LineItem, type PaymentScheduleEntry,
} from '../../../api/billing';
import { getDirectory } from '../../../api/community';

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  draft: 'default',
  sent: 'warning',
  paid: 'success',
  cancelled: 'danger',
};

function formatCents(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function currentAcademicYear() {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
}

interface Student { id: string; first_name: string; last_name: string; }

const EMPTY_ITEM = (): LineItem => ({ description: '', qty: 1, unit_price_cents: 0, total_cents: 0 });
const EMPTY_SCHED = (): PaymentScheduleEntry => ({ date: '', amount_cents: 0 });

export function BillingPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const canManage = user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'tutor';

  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);

  // Create form state
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
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getInvoices(statusFilter ? { status: statusFilter } : undefined);
      setInvoices(data);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    if (!showCreate || !canManage) return;
    getDirectory({ role: 'student' }).then(r => setStudents(r.data?.users || [])).catch(() => {});
  }, [showCreate, canManage]);

  // Recompute totals when line items change
  function updateItem(index: number, field: keyof LineItem, raw: string) {
    setLineItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === 'description') {
        item.description = raw;
      } else {
        const num = parseFloat(raw) || 0;
        (item as any)[field] = field === 'unit_price_cents' || field === 'total_cents'
          ? Math.round(num * 100)
          : num;
        item.total_cents = Math.round(item.qty * item.unit_price_cents);
      }
      updated[index] = item;
      return updated;
    });
  }

  function addItem() { setLineItems(p => [...p, EMPTY_ITEM()]); }
  function removeItem(i: number) { setLineItems(p => p.filter((_, idx) => idx !== i)); }

  function updateSchedule(index: number, field: keyof PaymentScheduleEntry, raw: string) {
    setSchedule(prev => {
      const updated = [...prev];
      const entry = { ...updated[index] };
      if (field === 'date') entry.date = raw;
      else entry.amount_cents = Math.round((parseFloat(raw) || 0) * 100);
      updated[index] = entry;
      return updated;
    });
  }

  const subtotal = lineItems.reduce((s, i) => s + i.total_cents, 0);
  const prevBalanceCents = Math.round((parseFloat(prevBalance) || 0) * 100);
  const totalDue = subtotal + prevBalanceCents;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return;
    const selected = students.find(s => s.id === studentId);
    if (!selected) return;
    setSubmitting(true);
    try {
      await createInvoice({
        student_id: studentId,
        student_name: `${selected.last_name} ${selected.first_name}`,
        student_class: studentClass || undefined,
        parent_name: parentName || undefined,
        parent_address: { line1: parentLine1, line2: parentLine2, postal_code: parentPostal, city: parentCity },
        academic_year: academicYear,
        issue_date: issueDate,
        line_items: lineItems,
        previous_balance_cents: prevBalanceCents,
        payment_schedule: schedule.filter(s => s.date),
        payment_method: paymentMethod || undefined,
        payment_reference: paymentRef || undefined,
        bank_account: bankAccount || undefined,
        contact_info: contactInfo || undefined,
        notes: notes || undefined,
      });
      setShowCreate(false);
      resetForm();
      fetchInvoices();
    } catch { /* ignore */ }
    setSubmitting(false);
  }

  function resetForm() {
    setStudentId(''); setStudentClass(''); setParentName('');
    setParentLine1(''); setParentLine2(''); setParentPostal(''); setParentCity('');
    setAcademicYear(currentAcademicYear()); setIssueDate(new Date().toISOString().slice(0, 10));
    setLineItems([EMPTY_ITEM()]); setPrevBalance('0'); setSchedule([]);
    setPaymentMethod(''); setPaymentRef(''); setBankAccount('');
    setContactInfo(''); setNotes('');
  }

  async function markPaid(id: string) {
    await updateInvoice(id, { status: 'paid' });
    fetchInvoices();
  }

  async function markSent(id: string) {
    await updateInvoice(id, { status: 'sent' });
    fetchInvoices();
  }

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

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        {(['', 'draft', 'sent', 'paid', 'cancelled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              statusFilter === s
                ? 'bg-slate-800 text-white border-slate-800'
                : 'border-border text-muted-foreground hover:border-foreground'
            }`}
          >
            {s === '' ? t('all', 'All') : t(s, s.charAt(0).toUpperCase() + s.slice(1))}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : invoices.length === 0 ? (
        <EmptyState title={t('noInvoices', 'No invoices')} description={t('noInvoicesDesc', 'Invoices created here will appear in parents\' portal.')} />
      ) : (
        <div className="flex flex-col gap-2">
          {invoices.map(inv => (
            <div key={inv.id} className="flex items-center gap-4 p-4 border rounded-lg bg-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm">{inv.invoice_number}</span>
                  <Badge variant={STATUS_COLORS[inv.status] || 'default'}>{inv.status}</Badge>
                </div>
                <p className="text-sm text-foreground">{inv.student_name}{inv.student_class ? ` — ${inv.student_class}` : ''}</p>
                <p className="text-xs text-muted-foreground">{inv.academic_year} · {new Date(inv.issue_date).toLocaleDateString('fr-FR')}{inv.parent_name ? ` · ${inv.parent_name}` : ''}</p>
              </div>
              <div className="text-right min-w-[100px]">
                <p className="font-bold text-sm">{formatCents(inv.total_due_cents)}</p>
                <p className="text-xs text-muted-foreground">{t('totalDue', 'Total due')}</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={downloadInvoicePdf(inv.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-2 py-1 border rounded hover:bg-muted"
                >
                  PDF
                </a>
                {canManage && inv.status === 'draft' && (
                  <Button variant="ghost" size="sm" onClick={() => markSent(inv.id)}>
                    {t('markSent', 'Send')}
                  </Button>
                )}
                {canManage && inv.status !== 'paid' && inv.status !== 'cancelled' && (
                  <Button variant="ghost" size="sm" onClick={() => markPaid(inv.id)}>
                    {t('markPaid', 'Paid')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Invoice Modal */}
      <Modal open={showCreate} title={t('newInvoice', 'New Invoice')} onClose={() => { setShowCreate(false); resetForm(); }}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto pr-1">

          {/* Student */}
          <fieldset className="border rounded-md p-3">
            <legend className="text-xs font-semibold px-1">{t('student', 'Student')}</legend>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1">{t('student', 'Student')} *</label>
                <select
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  required
                  className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                >
                  <option value="">{t('selectStudent', '— select —')}</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.last_name} {s.first_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">{t('classLabel', 'Class / Level')}</label>
                <Input value={studentClass} onChange={e => setStudentClass(e.target.value)} placeholder="PS/MS, 6ème B…" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">{t('academicYear', 'Academic year')}</label>
                <Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2025-2026" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">{t('issueDate', 'Issue date')}</label>
                <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </div>
            </div>
          </fieldset>

          {/* Parent address */}
          <fieldset className="border rounded-md p-3">
            <legend className="text-xs font-semibold px-1">{t('parentAddress', 'Parent / Address')}</legend>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1">{t('parentName', 'Parent name')}</label>
                <Input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Mme DUPONT Isabelle" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1">{t('addressLine1', 'Address line 1')}</label>
                <Input value={parentLine1} onChange={e => setParentLine1(e.target.value)} placeholder="12 rue de la Paix" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1">{t('addressLine2', 'Line 2')}</label>
                <Input value={parentLine2} onChange={e => setParentLine2(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">{t('postalCode', 'Postal code')}</label>
                <Input value={parentPostal} onChange={e => setParentPostal(e.target.value)} placeholder="76100" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">{t('city', 'City')}</label>
                <Input value={parentCity} onChange={e => setParentCity(e.target.value)} placeholder="Rouen" />
              </div>
            </div>
          </fieldset>

          {/* Line items */}
          <fieldset className="border rounded-md p-3">
            <legend className="text-xs font-semibold px-1">{t('lineItems', 'Line items')}</legend>
            <div className="flex flex-col gap-2 mt-1">
              {lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px_80px_80px_28px] gap-1 items-center">
                  <Input
                    placeholder={t('description', 'Description')}
                    value={item.description}
                    onChange={e => updateItem(i, 'description', e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={t('qty', 'Qty')}
                    value={item.qty}
                    onChange={e => updateItem(i, 'qty', e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={t('unitPrice', 'Unit €')}
                    value={(item.unit_price_cents / 100).toFixed(2)}
                    onChange={e => updateItem(i, 'unit_price_cents', e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={t('total', 'Total €')}
                    value={(item.total_cents / 100).toFixed(2)}
                    readOnly
                    className="bg-muted"
                  />
                  <button type="button" onClick={() => removeItem(i)} className="text-red-500 text-sm font-bold">×</button>
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={addItem}>+ {t('addLine', 'Add line')}</Button>
            </div>
            <div className="mt-2 text-sm text-right text-muted-foreground">
              {t('hint_negativeDiscount', 'Tip: use qty -1 for a discount/reduction')}
            </div>
          </fieldset>

          {/* Totals */}
          <div className="flex justify-end gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">{t('subtotal', 'Subtotal')}: </span>
              <strong>{formatCents(subtotal)}</strong>
            </div>
            <div>
              <label className="text-muted-foreground mr-1">{t('previousBalance', 'Solde antérieur (€)')}:</label>
              <input
                type="number"
                step="0.01"
                value={prevBalance}
                onChange={e => setPrevBalance(e.target.value)}
                className="w-20 border rounded px-1 py-0.5 text-right text-sm bg-background"
              />
            </div>
            <div>
              <span className="text-muted-foreground">{t('totalDue', 'Total dû')}: </span>
              <strong>{formatCents(totalDue)}</strong>
            </div>
          </div>

          {/* Payment schedule */}
          <fieldset className="border rounded-md p-3">
            <legend className="text-xs font-semibold px-1">{t('paymentSchedule', 'Échéancier')}</legend>
            <div className="flex flex-col gap-1 mt-1">
              {schedule.map((entry, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_28px] gap-1 items-center">
                  <Input type="date" value={entry.date} onChange={e => updateSchedule(i, 'date', e.target.value)} />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="€"
                    value={(entry.amount_cents / 100).toFixed(2)}
                    onChange={e => updateSchedule(i, 'amount_cents', e.target.value)}
                  />
                  <button type="button" onClick={() => setSchedule(p => p.filter((_, idx) => idx !== i))} className="text-red-500 text-sm font-bold">×</button>
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={() => setSchedule(p => [...p, EMPTY_SCHED()])}>
                + {t('addPaymentDate', 'Add date')}
              </Button>
            </div>
          </fieldset>

          {/* Payment info */}
          <fieldset className="border rounded-md p-3">
            <legend className="text-xs font-semibold px-1">{t('paymentInfo', 'Payment info')}</legend>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div>
                <label className="text-xs font-medium block mb-1">{t('paymentMethod', 'Method')}</label>
                <Input value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} placeholder="Prélèvement, Virement…" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">{t('paymentReference', 'Reference')}</label>
                <Input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="4111DUPONT" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1">{t('bankAccount', 'IBAN (for debit)')}</label>
                <Input value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="FR76…" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1">{t('contactInfo', 'Contact info (footer note)')}</label>
                <textarea
                  value={contactInfo}
                  onChange={e => setContactInfo(e.target.value)}
                  rows={2}
                  placeholder="En cas de questions, veuillez contacter…"
                  className="w-full border rounded-md px-2 py-1.5 text-sm bg-background resize-none"
                />
              </div>
            </div>
          </fieldset>

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); resetForm(); }}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || !studentId}>
              {submitting ? t('saving', 'Saving…') : t('createInvoice', 'Create Invoice')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
