import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import { Modal } from '../../../components/ui/Modal';
import { Table } from '../../../components/ui/Table';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  getMyStudents,
  listSessions,
  createSession,
  listPackages,
  createPackage,
  generateInvoice,
  listInvoices,
  downloadInvoicePdf,
  type MyStudent,
  type TutoringSessionData,
  type TutoringPackageData,
  type TutoringInvoiceData,
} from '../../../api/tutoring';

type Tab = 'myStudents' | 'sessions' | 'packages' | 'invoices';

const SESSION_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'] as const;

const STATUS_COLORS: Record<string, 'info' | 'success' | 'danger' | 'warning' | 'default'> = {
  scheduled: 'info',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'warning',
  active: 'success',
};

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2) + ' €';
}

export function TutoringCRMPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('myStudents');

  // Data state
  const [myStudents, setMyStudents] = useState<MyStudent[]>([]);
  const [sessions, setSessions] = useState<TutoringSessionData[]>([]);
  const [packages, setPackages] = useState<TutoringPackageData[]>([]);
  const [invoices, setInvoices] = useState<TutoringInvoiceData[]>([]);

  // Loading states
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Filters
  const [sessionStudentFilter, setSessionStudentFilter] = useState('');

  // Modal state
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Session form
  const [sessionStudentId, setSessionStudentId] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionDuration, setSessionDuration] = useState(60);
  const [sessionRate, setSessionRate] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<string>('scheduled');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionHomework, setSessionHomework] = useState('');

  // Package form
  const [pkgStudentId, setPkgStudentId] = useState('');
  const [pkgName, setPkgName] = useState('');
  const [pkgSessions, setPkgSessions] = useState(10);
  const [pkgPrice, setPkgPrice] = useState(0);
  const [pkgNotes, setPkgNotes] = useState('');

  // Invoice form
  const [invStudentId, setInvStudentId] = useState('');
  const [invPeriod, setInvPeriod] = useState('');

  const fetchMyStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const { data } = await getMyStudents();
      setMyStudents(data);
    } catch {
      setMyStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const params = sessionStudentFilter ? { student_id: sessionStudentFilter } : undefined;
      const { data } = await listSessions(params);
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [sessionStudentFilter]);

  const fetchPackages = useCallback(async () => {
    setLoadingPackages(true);
    try {
      const { data } = await listPackages();
      setPackages(data);
    } catch {
      setPackages([]);
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const { data } = await listInvoices();
      setInvoices(data);
    } catch {
      setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  useEffect(() => {
    fetchMyStudents();
  }, [fetchMyStudents]);

  useEffect(() => {
    if (activeTab === 'sessions') fetchSessions();
  }, [activeTab, fetchSessions]);

  useEffect(() => {
    if (activeTab === 'packages') fetchPackages();
  }, [activeTab, fetchPackages]);

  useEffect(() => {
    if (activeTab === 'invoices') fetchInvoices();
  }, [activeTab, fetchInvoices]);

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createSession({
        student_id: sessionStudentId,
        session_date: sessionDate,
        duration_minutes: sessionDuration,
        rate_cents: Math.round(sessionRate * 100),
        status: sessionStatus as TutoringSessionData['status'],
        notes: sessionNotes || null,
        homework_given: sessionHomework || null,
      });
      setShowSessionModal(false);
      resetSessionForm();
      if (activeTab === 'sessions') fetchSessions();
      fetchMyStudents();
    } catch {
      // silently handled
    } finally {
      setSubmitting(false);
    }
  }

  function resetSessionForm() {
    setSessionStudentId('');
    setSessionDate('');
    setSessionDuration(60);
    setSessionRate(0);
    setSessionStatus('scheduled');
    setSessionNotes('');
    setSessionHomework('');
  }

  async function handleCreatePackage(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createPackage({
        student_id: pkgStudentId,
        name: pkgName,
        sessions_total: pkgSessions,
        price_cents: Math.round(pkgPrice * 100),
        notes: pkgNotes || null,
      });
      setShowPackageModal(false);
      setPkgStudentId('');
      setPkgName('');
      setPkgSessions(10);
      setPkgPrice(0);
      setPkgNotes('');
      fetchPackages();
    } catch {
      // silently handled
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateInvoice(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await generateInvoice({
        student_id: invStudentId,
        period_label: invPeriod || undefined,
      });
      setShowInvoiceModal(false);
      setInvStudentId('');
      setInvPeriod('');
      fetchInvoices();
    } catch {
      // silently handled
    } finally {
      setSubmitting(false);
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'myStudents', label: t('myStudents', 'My Students') },
    { id: 'sessions', label: t('sessions', 'Sessions') },
    { id: 'packages', label: t('packages', 'Packages') },
    { id: 'invoices', label: t('invoices', 'Invoices') },
  ];

  const myStudentsColumns = [
    {
      key: 'student_id',
      header: t('student', 'Student ID'),
      render: (row: MyStudent) => (
        <span className="font-mono text-xs">{row.student_id.slice(0, 8)}…</span>
      ),
    },
    {
      key: 'session_count',
      header: t('sessions', 'Sessions'),
      render: (row: MyStudent) => row.session_count,
    },
    {
      key: 'last_session',
      header: t('lastSession', 'Last Session'),
      render: (row: MyStudent) =>
        row.last_session ? new Date(row.last_session).toLocaleDateString() : '—',
    },
    {
      key: 'actions',
      header: '',
      render: (row: MyStudent) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSessionStudentId(row.student_id);
              setShowSessionModal(true);
            }}
          >
            {t('logSession', 'Log Session')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setInvStudentId(row.student_id);
              setShowInvoiceModal(true);
            }}
          >
            {t('generateInvoice', 'Generate Invoice')}
          </Button>
        </div>
      ),
    },
  ];

  const sessionColumns = [
    {
      key: 'session_date',
      header: t('sessionDate', 'Session Date'),
      render: (row: TutoringSessionData) => new Date(row.session_date).toLocaleString(),
    },
    {
      key: 'duration_minutes',
      header: t('duration', 'Duration (min)'),
      render: (row: TutoringSessionData) => row.duration_minutes,
    },
    {
      key: 'subject_id',
      header: t('subject', 'Subject'),
      render: (row: TutoringSessionData) =>
        row.subject_id ? <span className="font-mono text-xs">{row.subject_id.slice(0, 8)}…</span> : '—',
    },
    {
      key: 'status',
      header: t('status', 'Status'),
      render: (row: TutoringSessionData) => (
        <Badge variant={STATUS_COLORS[row.status] || 'default'}>{row.status}</Badge>
      ),
    },
    {
      key: 'rate_cents',
      header: t('rate', 'Rate'),
      render: (row: TutoringSessionData) => formatCents(row.rate_cents),
    },
    {
      key: 'invoiced',
      header: t('invoiced', 'Invoiced'),
      render: (row: TutoringSessionData) => (
        <Badge variant={row.invoiced ? 'success' : 'default'}>{row.invoiced ? t('yes', 'Yes') : t('no', 'No')}</Badge>
      ),
    },
    {
      key: 'notes',
      header: t('notes', 'Notes'),
      render: (row: TutoringSessionData) => row.notes || '—',
    },
  ];

  const packageColumns = [
    {
      key: 'student_id',
      header: t('student', 'Student'),
      render: (row: TutoringPackageData) => (
        <span className="font-mono text-xs">{row.student_id.slice(0, 8)}…</span>
      ),
    },
    {
      key: 'name',
      header: t('packageName', 'Package Name'),
      render: (row: TutoringPackageData) => row.name,
    },
    {
      key: 'progress',
      header: t('progress', 'Progress'),
      render: (row: TutoringPackageData) => `${row.sessions_used} / ${row.sessions_total}`,
    },
    {
      key: 'price_cents',
      header: t('price', 'Price'),
      render: (row: TutoringPackageData) => formatCents(row.price_cents),
    },
    {
      key: 'status',
      header: t('status', 'Status'),
      render: (row: TutoringPackageData) => (
        <Badge variant={STATUS_COLORS[row.status] || 'default'}>{row.status}</Badge>
      ),
    },
    {
      key: 'paid',
      header: t('paid', 'Paid'),
      render: (row: TutoringPackageData) => (
        <Badge variant={row.paid ? 'success' : 'warning'}>{row.paid ? t('yes', 'Yes') : t('no', 'No')}</Badge>
      ),
    },
  ];

  const invoiceColumns = [
    {
      key: 'invoice_number',
      header: t('invoiceNumber', 'Invoice #'),
      render: (row: TutoringInvoiceData) => row.invoice_number,
    },
    {
      key: 'student_id',
      header: t('student', 'Student'),
      render: (row: TutoringInvoiceData) => (
        <span className="font-mono text-xs">{row.student_id.slice(0, 8)}…</span>
      ),
    },
    {
      key: 'period_label',
      header: t('period', 'Period'),
      render: (row: TutoringInvoiceData) => row.period_label || '—',
    },
    {
      key: 'total_cents',
      header: t('total', 'Total'),
      render: (row: TutoringInvoiceData) => formatCents(row.total_cents),
    },
    {
      key: 'paid',
      header: t('paid', 'Paid'),
      render: (row: TutoringInvoiceData) => (
        <Badge variant={row.paid ? 'success' : 'warning'}>{row.paid ? t('yes', 'Yes') : t('no', 'No')}</Badge>
      ),
    },
    {
      key: 'created_at',
      header: t('date', 'Date'),
      render: (row: TutoringInvoiceData) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      key: 'download',
      header: '',
      render: (row: TutoringInvoiceData) => (
        <a
          href={downloadInvoicePdf(row.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-sm underline"
        >
          {t('downloadPdf', 'Download PDF')}
        </a>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('tutoringCRM', 'Tutoring CRM')}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: My Students */}
      {activeTab === 'myStudents' && (
        <div>
          {loadingStudents ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : myStudents.length === 0 ? (
            <EmptyState
              title={t('noStudents', 'No students yet')}
              description={t('noStudentsDesc', 'Students you tutor will appear here.')}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table columns={myStudentsColumns} data={myStudents} />
            </div>
          )}
        </div>
      )}

      {/* Tab: Sessions */}
      {activeTab === 'sessions' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
              value={sessionStudentFilter}
              onChange={(e) => setSessionStudentFilter(e.target.value)}
            >
              <option value="">{t('allStudents', 'All students')}</option>
              {myStudents.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.student_id.slice(0, 8)}…
                </option>
              ))}
            </select>
            <Button variant="primary" onClick={() => setShowSessionModal(true)}>
              + {t('newSession', 'New Session')}
            </Button>
          </div>
          {loadingSessions ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState title={t('noSessions', 'No sessions')} description="" />
          ) : (
            <div className="overflow-x-auto">
              <Table columns={sessionColumns} data={sessions} />
            </div>
          )}
        </div>
      )}

      {/* Tab: Packages */}
      {activeTab === 'packages' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button variant="primary" onClick={() => setShowPackageModal(true)}>
              + {t('newPackage', 'New Package')}
            </Button>
          </div>
          {loadingPackages ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : packages.length === 0 ? (
            <EmptyState title={t('noPackages', 'No packages')} description="" />
          ) : (
            <div className="overflow-x-auto">
              <Table columns={packageColumns} data={packages} />
            </div>
          )}
        </div>
      )}

      {/* Tab: Invoices */}
      {activeTab === 'invoices' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button variant="primary" onClick={() => setShowInvoiceModal(true)}>
              + {t('generateInvoice', 'Generate Invoice')}
            </Button>
          </div>
          {loadingInvoices ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : invoices.length === 0 ? (
            <EmptyState title={t('noInvoices', 'No invoices')} description="" />
          ) : (
            <div className="overflow-x-auto">
              <Table columns={invoiceColumns} data={invoices} />
            </div>
          )}
        </div>
      )}

      {/* Session Modal */}
      <Modal
        open={showSessionModal}
        onClose={() => { setShowSessionModal(false); resetSessionForm(); }}
        title={t('logSession', 'Log Session')}
      >
        <form onSubmit={handleCreateSession} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('student', 'Student')}</label>
            {myStudents.length > 0 ? (
              <select
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                value={sessionStudentId}
                onChange={(e) => setSessionStudentId(e.target.value)}
                required
              >
                <option value="">{t('select', 'Select...')}</option>
                {myStudents.map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.student_id.slice(0, 8)}…
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                value={sessionStudentId}
                onChange={(e) => setSessionStudentId(e.target.value)}
                placeholder="Student UUID"
                required
              />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('sessionDate', 'Session Date')}</label>
            <input
              type="datetime-local"
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('duration', 'Duration (min)')}</label>
              <input
                type="number"
                min={1}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                value={sessionDuration}
                onChange={(e) => setSessionDuration(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('ratePerHour', 'Rate (€/h)')}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                value={sessionRate}
                onChange={(e) => setSessionRate(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('status', 'Status')}</label>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
              value={sessionStatus}
              onChange={(e) => setSessionStatus(e.target.value)}
            >
              {SESSION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('notes', 'Notes')}</label>
            <textarea
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring min-h-[60px] resize-none"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder={t('optional', 'optional')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('homeworkGiven', 'Homework Given')}</label>
            <textarea
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring min-h-[60px] resize-none"
              value={sessionHomework}
              onChange={(e) => setSessionHomework(e.target.value)}
              placeholder={t('optional', 'optional')}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => { setShowSessionModal(false); resetSessionForm(); }}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? t('saving', 'Saving...') : t('save', 'Save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Package Modal */}
      <Modal
        open={showPackageModal}
        onClose={() => setShowPackageModal(false)}
        title={t('newPackage', 'New Package')}
      >
        <form onSubmit={handleCreatePackage} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('student', 'Student')}</label>
            {myStudents.length > 0 ? (
              <select
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                value={pkgStudentId}
                onChange={(e) => setPkgStudentId(e.target.value)}
                required
              >
                <option value="">{t('select', 'Select...')}</option>
                {myStudents.map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.student_id.slice(0, 8)}…
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                value={pkgStudentId}
                onChange={(e) => setPkgStudentId(e.target.value)}
                placeholder="Student UUID"
                required
              />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('packageName', 'Package Name')}</label>
            <input
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
              value={pkgName}
              onChange={(e) => setPkgName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('sessionsTotal', 'Sessions')}</label>
              <input
                type="number"
                min={1}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                value={pkgSessions}
                onChange={(e) => setPkgSessions(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('price', 'Price (€)')}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                value={pkgPrice}
                onChange={(e) => setPkgPrice(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('notes', 'Notes')}</label>
            <textarea
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring min-h-[60px] resize-none"
              value={pkgNotes}
              onChange={(e) => setPkgNotes(e.target.value)}
              placeholder={t('optional', 'optional')}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowPackageModal(false)}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? t('saving', 'Saving...') : t('create', 'Create')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invoice Modal */}
      <Modal
        open={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title={t('generateInvoice', 'Generate Invoice')}
      >
        <form onSubmit={handleGenerateInvoice} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('student', 'Student')}</label>
            {myStudents.length > 0 ? (
              <select
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                value={invStudentId}
                onChange={(e) => setInvStudentId(e.target.value)}
                required
              >
                <option value="">{t('select', 'Select...')}</option>
                {myStudents.map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.student_id.slice(0, 8)}…
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                value={invStudentId}
                onChange={(e) => setInvStudentId(e.target.value)}
                placeholder="Student UUID"
                required
              />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('period', 'Period Label')}</label>
            <input
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
              value={invPeriod}
              onChange={(e) => setInvPeriod(e.target.value)}
              placeholder={t('optional', 'e.g. March 2026')}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowInvoiceModal(false)}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? t('processing', 'Processing...') : t('generateInvoice', 'Generate Invoice')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
