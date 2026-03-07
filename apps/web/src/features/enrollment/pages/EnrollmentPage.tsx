import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { useAuthStore } from '../../../stores/authStore';
import client from '../../../api/client';
import {
  getMyEnrollments,
  submitEnrollment,
  type EnrollmentData,
} from '../../../api/enrollment';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewing: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

interface GroupData {
  id: string;
  name: string;
}

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
  const user = useAuthStore((s) => s.user);

  // Form state
  const [parentFirstName, setParentFirstName] = useState(user?.first_name ?? '');
  const [parentLastName, setParentLastName] = useState(user?.last_name ?? '');
  const [parentEmail, setParentEmail] = useState(user?.email ?? '');
  const [parentPhone, setParentPhone] = useState('');
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [childGender, setChildGender] = useState('');
  const [requestedGroupId, setRequestedGroupId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Groups for class selector
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  // My requests
  const [myRequests, setMyRequests] = useState<EnrollmentData[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  const fetchMyRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const { data } = await getMyEnrollments();
      setMyRequests(data);
    } catch {
      setMyRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyRequests();
    (async () => {
      try {
        const { data } = await client.get<GroupData[]>('/v1/groups');
        setGroups(data);
      } catch {
        setGroups([]);
      } finally {
        setGroupsLoading(false);
      }
    })();
  }, [fetchMyRequests]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitEnrollment({
        parent_first_name: parentFirstName,
        parent_last_name: parentLastName,
        parent_email: parentEmail,
        parent_phone: parentPhone || undefined,
        child_first_name: childFirstName,
        child_last_name: childLastName,
        child_date_of_birth: childDob || undefined,
        child_gender: childGender || undefined,
        requested_group_id: requestedGroupId || undefined,
      });
      setSubmitSuccess(true);
      setChildFirstName('');
      setChildLastName('');
      setChildDob('');
      setChildGender('');
      setRequestedGroupId('');
      setParentPhone('');
      fetchMyRequests();
    } catch {
      setSubmitError(t('saveError', 'Could not save. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Submit new request */}
      <section>
        <h1 className="text-2xl font-bold mb-6">{t('submitEnrollment', 'Submit Enrollment')}</h1>

        {submitSuccess && (
          <div className="rounded-md bg-green-50 p-4 text-green-800 text-sm font-medium mb-4">
            {t('enrollmentApproved', 'Your enrollment request has been submitted successfully!')}
          </div>
        )}

        {submitError && (
          <div className="rounded-md bg-red-50 p-4 text-red-800 text-sm font-medium mb-4">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Parent info */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              {t('parentInfo', 'Parent Information')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('firstName', 'First name')}
                </label>
                <input
                  type="text"
                  required
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                  value={parentFirstName}
                  onChange={(e) => setParentFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('lastName', 'Last name')}
                </label>
                <input
                  type="text"
                  required
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                  value={parentLastName}
                  onChange={(e) => setParentLastName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('email', 'Email address')}
                </label>
                <input
                  type="email"
                  required
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-gray-400">({t('optional', 'optional')})</span>
                </label>
                <input
                  type="tel"
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Child info */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              {t('childInfo', 'Child Information')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('firstName', 'First name')}
                </label>
                <input
                  type="text"
                  required
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                  value={childFirstName}
                  onChange={(e) => setChildFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('lastName', 'Last name')}
                </label>
                <input
                  type="text"
                  required
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                  value={childLastName}
                  onChange={(e) => setChildLastName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth <span className="text-gray-400">({t('optional', 'optional')})</span>
                </label>
                <input
                  type="date"
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                  value={childDob}
                  onChange={(e) => setChildDob(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender <span className="text-gray-400">({t('optional', 'optional')})</span>
                </label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                  value={childGender}
                  onChange={(e) => setChildGender(e.target.value)}
                >
                  <option value="">— Select —</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">{t('other', 'Other')}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('requestedClass', 'Requested Class')}{' '}
                  <span className="text-gray-400">({t('optional', 'optional')})</span>
                </label>
                {groupsLoading ? (
                  <div className="flex items-center h-9">
                    <Spinner />
                  </div>
                ) : (
                  <select
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                    value={requestedGroupId}
                    onChange={(e) => setRequestedGroupId(e.target.value)}
                  >
                    <option value="">— No preference —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? t('saving', 'Saving...') : t('submitEnrollment', 'Submit Enrollment')}
            </Button>
          </div>
        </form>
      </section>

      {/* My requests */}
      <section>
        <h2 className="text-xl font-bold mb-4">{t('myEnrollments', 'My Requests')}</h2>

        {requestsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : myRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No enrollment requests yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    {t('childName', "Child's Name")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    {t('requestedClass', 'Requested Class')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    {t('startDate', 'Submitted')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    {t('enrollmentStatus', 'Status')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    {t('adminNotes', 'Admin Notes')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {myRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {req.child_first_name} {req.child_last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {req.requested_group_id ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {req.admin_notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
