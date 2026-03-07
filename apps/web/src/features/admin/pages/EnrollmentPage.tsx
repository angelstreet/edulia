import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Table } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Modal } from '../../../components/ui/Modal';
import {
  listEnrollments,
  reviewEnrollment,
  type EnrollmentData,
  type EnrollmentStatus,
} from '../../../api/enrollment';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewing: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const STATUS_FILTERS = ['', 'pending', 'reviewing', 'approved', 'rejected'] as const;

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {status}
    </span>
  );
}

export function EnrollmentPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<EnrollmentData[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<EnrollmentData | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'reviewing' | 'approved' | 'rejected'>('reviewing');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await listEnrollments(statusFilter as EnrollmentStatus || undefined);
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  function openReview(row: EnrollmentData) {
    setSelectedRequest(row);
    setReviewStatus('reviewing');
    setReviewNotes(row.admin_notes ?? '');
    setSuccessMessage('');
  }

  function closeModal() {
    setSelectedRequest(null);
    setSuccessMessage('');
  }

  async function handleReviewSubmit() {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      await reviewEnrollment(selectedRequest.id, {
        status: reviewStatus,
        admin_notes: reviewNotes || undefined,
      });
      if (reviewStatus === 'approved') {
        setSuccessMessage(t('enrollmentApproved', 'Approved — student account created'));
      } else {
        closeModal();
      }
      fetchRequests();
    } catch {
      // keep modal open on error
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: 'child_name',
      header: t('childName', "Child's Name"),
      render: (row: EnrollmentData) => (
        <span className="font-medium">
          {row.child_first_name} {row.child_last_name}
        </span>
      ),
    },
    {
      key: 'parent',
      header: t('parentInfo', 'Parent'),
      render: (row: EnrollmentData) => (
        <span>
          {row.parent_first_name} {row.parent_last_name}
        </span>
      ),
    },
    {
      key: 'parent_email',
      header: t('email', 'Email'),
      render: (row: EnrollmentData) => <span>{row.parent_email}</span>,
    },
    {
      key: 'requested_group_id',
      header: t('requestedClass', 'Requested Class'),
      render: (row: EnrollmentData) => (
        <span>{row.requested_group_id ?? '—'}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('startDate', 'Submitted'),
      render: (row: EnrollmentData) => (
        <span>{new Date(row.created_at).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'status',
      header: t('enrollmentStatus', 'Status'),
      render: (row: EnrollmentData) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (row: EnrollmentData) => (
        <Button variant="ghost" size="sm" onClick={() => openReview(row)}>
          {t('reviewEnrollment', 'Review')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('enrollmentRequests', 'Enrollment Requests')}</h1>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {t('noUsers', 'No enrollment requests found.')}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table columns={columns} data={requests} />
          </div>
          {/* Mobile card layout */}
          <div className="flex flex-col gap-3 md:hidden">
            {requests.map((row) => (
              <div key={row.id} className="border rounded-lg p-4 bg-white space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-sm">
                    {row.child_first_name} {row.child_last_name}
                  </span>
                  <StatusBadge status={row.status} />
                </div>
                <p className="text-xs text-gray-500">
                  {row.parent_first_name} {row.parent_last_name} · {row.parent_email}
                </p>
                <p className="text-xs text-gray-400">
                  {t('requestedClass', 'Class')}: {row.requested_group_id ?? '—'} · {new Date(row.created_at).toLocaleDateString()}
                </p>
                <Button variant="ghost" size="sm" onClick={() => openReview(row)}>
                  {t('reviewEnrollment', 'Review')}
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        open={!!selectedRequest}
        onClose={closeModal}
        title={t('reviewEnrollment', 'Review Enrollment')}
      >
        {selectedRequest && (
          <div className="space-y-4">
            {successMessage && (
              <div className="rounded-md bg-green-50 p-3 text-green-800 text-sm font-medium">
                {successMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-600 mb-1">{t('childInfo', 'Child Information')}</p>
                <p>
                  {selectedRequest.child_first_name} {selectedRequest.child_last_name}
                </p>
                {selectedRequest.child_date_of_birth && (
                  <p className="text-gray-500">DOB: {selectedRequest.child_date_of_birth}</p>
                )}
                {selectedRequest.child_gender && (
                  <p className="text-gray-500">Gender: {selectedRequest.child_gender}</p>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-600 mb-1">{t('parentInfo', 'Parent Information')}</p>
                <p>
                  {selectedRequest.parent_first_name} {selectedRequest.parent_last_name}
                </p>
                <p className="text-gray-500">{selectedRequest.parent_email}</p>
                {selectedRequest.parent_phone && (
                  <p className="text-gray-500">{selectedRequest.parent_phone}</p>
                )}
              </div>
            </div>

            <div className="text-sm">
              <p className="font-semibold text-gray-600 mb-1">{t('enrollmentStatus', 'Current Status')}</p>
              <StatusBadge status={selectedRequest.status} />
            </div>

            {!successMessage && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('enrollmentStatus', 'New Status')}
                  </label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                    value={reviewStatus}
                    onChange={(e) =>
                      setReviewStatus(e.target.value as 'reviewing' | 'approved' | 'rejected')
                    }
                  >
                    <option value="reviewing">Reviewing</option>
                    <option value="approved">{t('approveEnrollment', 'Approve')}</option>
                    <option value="rejected">{t('rejectEnrollment', 'Reject')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('adminNotes', 'Admin Notes')}
                  </label>
                  <textarea
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring resize-none"
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Optional notes..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={closeModal} disabled={submitting}>
                    {t('cancel', 'Cancel')}
                  </Button>
                  <Button variant="primary" onClick={handleReviewSubmit} disabled={submitting}>
                    {submitting ? t('saving', 'Saving...') : t('save', 'Save')}
                  </Button>
                </div>
              </>
            )}

            {successMessage && (
              <div className="flex justify-end">
                <Button variant="primary" onClick={closeModal}>
                  {t('cancel', 'Close')}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
