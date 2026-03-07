import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import { Modal } from '../../../components/ui/Modal';
import { Table } from '../../../components/ui/Table';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  listJustifications,
  submitJustification,
  reviewJustification,
  type JustificationData,
  type JustificationStatus,
} from '../../../api/absences';

const STATUS_COLORS: Record<JustificationStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
};

const REASON_OPTIONS = ['illness', 'family', 'transport', 'other'] as const;

export function AbsencesPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.role === 'admin' || user?.role === 'teacher';

  const [justifications, setJustifications] = useState<JustificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>(isStaff ? 'pending' : 'all');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [studentId, setStudentId] = useState(user?.id || '');
  const [absenceDate, setAbsenceDate] = useState('');
  const [reason, setReason] = useState<string>('illness');
  const [description, setDescription] = useState('');

  const fetchJustifications = useCallback(async () => {
    setLoading(true);
    try {
      const params: { student_id?: string; status?: string } = {};
      if (!isStaff && user?.id) params.student_id = user.id;
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await listJustifications(params);
      setJustifications(data);
    } catch {
      setJustifications([]);
    } finally {
      setLoading(false);
    }
  }, [isStaff, user?.id, statusFilter]);

  useEffect(() => {
    fetchJustifications();
  }, [fetchJustifications]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitJustification({
        student_id: studentId,
        absence_date: absenceDate,
        reason,
        description: description || undefined,
      });
      setShowForm(false);
      setAbsenceDate('');
      setReason('illness');
      setDescription('');
      fetchJustifications();
    } catch {
      // error handled silently
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(id: string, status: 'accepted' | 'rejected') {
    try {
      await reviewJustification(id, status);
      fetchJustifications();
    } catch {
      // error handled silently
    }
  }

  const staffColumns = [
    {
      key: 'student_id',
      header: t('student', 'Student'),
      render: (row: JustificationData) => (
        <span className="font-mono text-xs">{row.student_id.slice(0, 8)}…</span>
      ),
    },
    {
      key: 'absence_date',
      header: t('absenceDate', 'Absence Date'),
      render: (row: JustificationData) => row.absence_date,
    },
    {
      key: 'reason',
      header: t('reason', 'Reason'),
      render: (row: JustificationData) => t(row.reason, row.reason),
    },
    {
      key: 'description',
      header: t('description', 'Description'),
      render: (row: JustificationData) => row.description || '—',
    },
    {
      key: 'status',
      header: t('status', 'Status'),
      render: (row: JustificationData) => (
        <Badge variant={STATUS_COLORS[row.status]}>{t(row.status, row.status)}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: JustificationData) =>
        row.status === 'pending' ? (
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => handleReview(row.id, 'accepted')}>
              {t('accept', 'Accept')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleReview(row.id, 'rejected')}>
              {t('reject', 'Reject')}
            </Button>
          </div>
        ) : null,
    },
  ];

  const parentColumns = [
    {
      key: 'absence_date',
      header: t('absenceDate', 'Absence Date'),
      render: (row: JustificationData) => row.absence_date,
    },
    {
      key: 'reason',
      header: t('reason', 'Reason'),
      render: (row: JustificationData) => t(row.reason, row.reason),
    },
    {
      key: 'description',
      header: t('description', 'Description'),
      render: (row: JustificationData) => row.description || '—',
    },
    {
      key: 'status',
      header: t('status', 'Status'),
      render: (row: JustificationData) => (
        <Badge variant={STATUS_COLORS[row.status]}>{t(row.status, row.status)}</Badge>
      ),
    },
    {
      key: 'submitted_at',
      header: t('submittedAt', 'Submitted'),
      render: (row: JustificationData) => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('absences', 'Absences')}</h1>
        {!isStaff && (
          <Button variant="primary" onClick={() => setShowForm(true)}>
            + {t('submitJustification', 'Submit Justification')}
          </Button>
        )}
      </div>

      {isStaff && (
        <div className="flex gap-3 mb-4">
          {(['pending', 'accepted', 'rejected', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {t(s, s)}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : justifications.length === 0 ? (
        <EmptyState
          title={t('noJustifications', 'No justifications found')}
          description={t('noJustificationsDesc', 'No absence justifications match the current filter.')}
        />
      ) : (
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <Table
            columns={isStaff ? staffColumns : parentColumns}
            data={justifications}
          />
        </div>
      )}

      {/* Submit form modal (parent/student view) */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={t('submitJustification', 'Submit Justification')}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {user?.role === 'parent' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('student', 'Student ID')}</label>
              <input
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder={t('studentId', 'Student ID')}
                required
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('absenceDate', 'Absence Date')}</label>
            <input
              type="date"
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
              value={absenceDate}
              onChange={(e) => setAbsenceDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('reason', 'Reason')}</label>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            >
              {REASON_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {t(r, r)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('description', 'Description')}</label>
            <textarea
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring min-h-[80px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('optional', 'optional')}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? t('saving', 'Saving...') : t('submit', 'Submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
