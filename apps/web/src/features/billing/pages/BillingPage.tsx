import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  getInvoices,
  createInvoice,
  updateInvoice,
  downloadInvoicePdf,
  type InvoiceData,
  type LineItem,
  type PaymentScheduleEntry,
} from '../../../api/billing';

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  draft: 'default',
  sent: 'warning',
  paid: 'success',
  cancelled: 'destructive',
};

function formatCents(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR');
}

const EMPTY_LINE: LineItem = { description: '', qty: 1, unit_price_cents: 0, total_cents: 0 };

function LineItemsEditor({
  items,
  onChange,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}) {
  const { t } = useTranslation();

  function update(i: number, field: keyof LineItem, raw: string) {
    const next = items.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item };
      if (field === 'description') {
        updated.description = raw;
      } else {
        const val = parseFloat(raw) || 0;
        if (field === 'qty') updated.qty = val;
        if (field === 'unit_price_cents') updated.unit_price_cents = Math.round(val * 100);
        updated.total_cents = Math.round(updated.qty * updated.unit_price_cents);
      }
      return updated;
    });
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[1fr_60px_90px_80px_32px] gap-1 text-xs font-medium text-muted-foreground px-1">
        <span>{t('description', 'Description')}</span>
        <span className="text-center">{t('qty', 'Qté')}</span>
        <span className="text-right">{t('unitPrice', 'Prix unit.')}</span>
        <span className="text-right">{t('total', 'Total')}</span>
        <span />
      </div>
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-[1fr_60px_90px_80px_32px] gap-1 items-center">
          <Input
            value={item.description}
            onChange={(e) => update(i, 'description', e.target.value)}
            placeholder={t('description', 'Description')}
            className="text-sm h-8"
          />
          <Input
            type="number"
            value={item.qty}
            onChange={(e) => update(i, 'qty', e.target.value)}
            className="text-sm h-8 text-center"
          />
          <Input
            type="number"
            step="0.01"
            value={(item.unit_price_cents / 100).toFixed(2)}
            onChange={(e) => update(i, 'unit_price_cents', e.target.value)}
            className="text-sm h-8 text-right"
          />
          <span className="text-sm text-right pr-1 tabular-nums">
            {formatCents(item.total_cents)}
          </span>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="text-muted-foreground hover:text-destructive text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange([...items, { ...EMPTY_LINE }])}
        className="self-start mt-1"
      >
        + {t('addLine', 'Add line')}
      </Button>
    </div>
  );
}

function ScheduleEditor({
  entries,
  onChange,
}: {
  entries: PaymentScheduleEntry[];
  onChange: (e: PaymentScheduleEntry[]) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1">
      {entries.map((e, i) => (
        <div key={i} className="grid grid-cols-[1fr_100px_28px] gap-1 items-center">
          <Input
            type="date"
            value={e.date}
            onChange={(ev) => {
              const next = [...entries];
              next[i] = { ...e, date: ev.target.value };
              onChange(next);
            }}
            className="text-sm h-8"
          />
          <Input
            type="number"
            step="0.01"
            value={(e.amount_cents / 100).toFixed(2)}
            onChange={(ev) => {
              const next = [...entries];
              next[i] = { ...e, amount_cents: Math.round(parseFloat(ev.target.value || '0') * 100) };
              onChange(next);
            }}
            className="text-sm h-8 text-right"
          />
          <button
            type="button"
            onClick={() => onChange(entries.filter((_, idx) => idx !== i))}
            className="text-muted-foreground hover:text-destructive text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange([...entries, { date: '', amount_cents: 0 }])}
        className="self-start"
      >
        + {t('addInstalment', 'Add instalment')}
      </Button>
    </div>
  );
}

export function BillingPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role && ['admin', 'teacher', 'tutor'].includes(user.role);

  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentLine1, setParentLine1] = useState('');
  const [parentCity, setParentCity] = useState('');
  const [parentPostal, setParentPostal] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...EMPTY_LINE }]);
  const [prevBalance, setPrevBalance] = useState('0');
  const [schedule, setSchedule] = useState<PaymentScheduleEntry[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [contactInfo, setContactInfo] = useState('');

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getInvoices();
      setInvoices(data);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  function resetForm() {
    setStudentName(''); setStudentClass(''); setParentName('');
    setParentLine1(''); setParentCity(''); setParentPostal('');
    setAcademicYear('2025-2026');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setLineItems([{ ...EMPTY_LINE }]);
    setPrevBalance('0');
    setSchedule([]);
    setPaymentMethod(''); setPaymentRef(''); setBankAccount(''); setContactInfo('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createInvoice({
        student_id: '00000000-0000-0000-0000-000000000000', // overridden by student_name for now
        student_name: studentName,
        student_class: studentClass || undefined,
        parent_name: parentName || undefined,
        parent_address: { line1: parentLine1, city: parentCity, postal_code: parentPostal },
        academic_year: academicYear,
        issue_date: issueDate,
        line_items: lineItems,
        previous_balance_cents: Math.round(parseFloat(prevBalance || '0') * 100),
        payment_schedule: schedule,
        payment_method: paymentMethod || undefined,
        payment_reference: paymentRef || undefined,
        bank_account: bankAccount || undefined,
        contact_info: contactInfo || undefined,
      });
      setShowCreate(false);
      resetForm();
      fetchInvoices();
    } catch {
      // error stays
    } finally {
      setSubmitting(false);
    }
  }

  async function markPaid(id: string) {
    await updateInvoice(id, { status: 'paid' });
    fetchInvoices();
  }

  async function markSent(id: string) {
    await updateInvoice(id, { status: 'sent' });
    fetchInvoices();
  }

  const subtotal = lineItems.reduce((s, i) => s + i.total_cents, 0);
  const prevBalanceCents = Math.round(parseFloat(prevBalance || '0') * 100);
  const totalDue = subtotal + prevBalanceCents;

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

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

      {invoices.length === 0 ? (
        <EmptyState
          title={t('noInvoices', 'No invoices')}
          description={canManage ? t('createFirstInvoice', 'Create your first invoice.') : t('noInvoicesParent', 'No invoices have been issued yet.')}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="border rounded-lg p-4 bg-card flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{inv.invoice_number}</span>
                  <Badge variant={STATUS_COLORS[inv.status] || 'default'}>{inv.status}</Badge>
                </div>
                <p className="text-sm font-medium">{inv.student_name}</p>
                {inv.student_class && <p className="text-xs text-muted-foreground">{inv.student_class}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('academicYear', 'Year')}: {inv.academic_year} · {formatDate(inv.issue_date)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold tabular-nums">{formatCents(inv.total_due_cents)}</p>
                {inv.previous_balance_cents !== 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('prevBalance', 'Prev. balance')}: {formatCents(inv.previous_balance_cents)}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href={downloadInvoicePdf(inv.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 rounded-md border text-sm hover:bg-muted"
                >
                  ↓ PDF
                </a>
                {canManage && inv.status === 'draft' && (
                  <Button variant="secondary" size="sm" onClick={() => markSent(inv.id)}>
                    {t('markSent', 'Send')}
                  </Button>
                )}
                {canManage && inv.status !== 'paid' && inv.status !== 'cancelled' && (
                  <Button variant="primary" size="sm" onClick={() => markPaid(inv.id)}>
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
        <form onSubmit={handleCreate} className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Student / Parent */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">{t('studentName', 'Student name')} *</label>
              <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} required placeholder="N'DOYE Keylia" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">{t('studentClass', 'Class / Section')}</label>
              <Input value={studentClass} onChange={(e) => setStudentClass(e.target.value)} placeholder="PS/MS/GS P, Externe libre" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">{t('parentName', 'Parent name')}</label>
              <Input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Mme LACOUTURE Prescillia" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">{t('parentAddress', 'Address line 1')}</label>
              <Input value={parentLine1} onChange={(e) => setParentLine1(e.target.value)} placeholder="148 rue jacquard" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">{t('postalCode', 'Postal code')}</label>
              <Input value={parentPostal} onChange={(e) => setParentPostal(e.target.value)} placeholder="76140" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">{t('city', 'City')}</label>
              <Input value={parentCity} onChange={(e) => setParentCity(e.target.value)} placeholder="LE PETIT QUEVILLY" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">{t('academicYear', 'Academic year')} *</label>
              <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} required placeholder="2025-2026" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">{t('issueDate', 'Issue date')}</label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
          </div>

          {/* Line items */}
          <div>
            <label className="text-xs font-medium block mb-2">{t('lineItems', 'Line items')}</label>
            <LineItemsEditor items={lineItems} onChange={setLineItems} />
            <div className="flex justify-end gap-4 mt-2 text-sm font-medium border-t pt-2">
              <span>{t('subtotal', 'Sous-total')}: {formatCents(subtotal)}</span>
            </div>
          </div>

          {/* Previous balance */}
          <div>
            <label className="text-xs font-medium block mb-1">{t('prevBalance', 'Previous balance (€, negative = credit)')}</label>
            <Input
              type="number"
              step="0.01"
              value={prevBalance}
              onChange={(e) => setPrevBalance(e.target.value)}
              placeholder="-75.00"
            />
          </div>

          <div className="flex justify-end text-base font-bold border-t pt-2">
            {t('totalDue', 'Total à PAYER')}: {formatCents(totalDue)}
          </div>

          {/* Payment schedule */}
          <div>
            <label className="text-xs font-medium block mb-2">{t('paymentSchedule', 'Échéancier (payment schedule)')}</label>
            <ScheduleEditor entries={schedule} onChange={setSchedule} />
          </div>

          {/* Payment details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">{t('paymentMethod', 'Payment method')}</label>
              <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Prélèvement" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">{t('paymentRef', 'Reference')}</label>
              <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="4111LACOUTURE" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">{t('bankAccount', 'IBAN (shown on invoice)')}</label>
            <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="FR76 1142 5009 0004..." />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">{t('contactInfo', 'Footer contact note')}</label>
            <textarea
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              rows={2}
              placeholder="En cas de questions, veuillez contacter..."
              className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); resetForm(); }}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || !studentName}>
              {submitting ? t('saving', 'Saving...') : t('createInvoice', 'Create Invoice')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
