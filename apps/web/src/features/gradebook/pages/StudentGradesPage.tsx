import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { getStudentAverages, type StudentAveragesData } from '../../../api/gradebook';

export function StudentGradesPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const [data, setData] = useState<StudentAveragesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getStudentAverages(user.id)
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }

  if (!data || data.averages.length === 0) {
    return <EmptyState title={t('noGrades', 'No grades yet')} description={t('noGradesDesc', 'Your grades will appear here once teachers publish them.')} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('myGrades', 'My Grades')}</h1>
        {data.general_average !== null && (
          <div className="text-lg font-semibold">
            {t('generalAverage', 'General Average')}: {data.general_average}/20
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {data.averages.map((subj) => (
          <div key={subj.subject_id} className="p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <span className="font-medium">{subj.subject_name}</span>
              <span className="text-lg font-semibold">
                {subj.average !== null ? `${subj.average}/20` : '-'}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {subj.assessment_count} {t('assessments', 'assessments')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
