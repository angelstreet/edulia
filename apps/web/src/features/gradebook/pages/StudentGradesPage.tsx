import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { getStudentAverages, getStudentSubjectGrades, type StudentAveragesData, type StudentSubjectGrades } from '../../../api/gradebook';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function StudentGradesPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const [data, setData] = useState<StudentAveragesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentSubjectGrades | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    getStudentAverages(user.id)
      .then(({ data: d }) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const toggleSubject = async (subjectId: string) => {
    if (expanded === subjectId) { setExpanded(null); setDetail(null); return; }
    setExpanded(subjectId);
    setDetailLoading(true);
    try {
      const { data: d } = await getStudentSubjectGrades(user!.id, subjectId);
      setDetail(d);
    } catch { setDetail(null); }
    finally { setDetailLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  
  const averages = data?.averages ?? [];
  if (!averages.length) {
    return <EmptyState title={t('noGrades', 'No grades yet')} description={t('noGradesDesc', 'Your grades will appear here once teachers publish them.')} />;
  }

  const scoreColor = (score: number | null, max: number) => {
    if (score === null) return '';
    const pct = (score / max) * 100;
    if (pct >= 70) return 'text-green-600 dark:text-green-400';
    if (pct >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('myGrades', 'My Grades')}</h1>
        {data?.general_average != null && (
          <div className="text-lg font-semibold bg-primary/10 text-primary px-4 py-2 rounded-lg">
            {t('generalAverage', 'General Average')}: {data.general_average}/20
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {averages.map((subj) => (
          <div key={subj.subject_id} className="border rounded-lg bg-card overflow-hidden">
            <button
              onClick={() => toggleSubject(subj.subject_id)}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/5 transition"
            >
              <div className="text-left">
                <span className="font-medium text-base">{subj.subject_name}</span>
                <span className="block text-sm text-muted-foreground">
                  {subj.assessment_count} {t('assessments', 'assessments')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xl font-bold ${scoreColor(subj.average, 20)}`}>
                  {subj.average != null ? `${subj.average}/20` : '-'}
                </span>
                {expanded === subj.subject_id
                  ? <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
              </div>
            </button>

            {expanded === subj.subject_id && (
              <div className="border-t px-4 pb-4">
                {detailLoading ? (
                  <div className="flex justify-center py-4"><Spinner /></div>
                ) : detail && detail.grades.length > 0 ? (
                  <table className="w-full mt-3 text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-left border-b">
                        <th className="pb-2 font-medium">{t('assessment', 'Assessment')}</th>
                        <th className="pb-2 font-medium">{t('date', 'Date')}</th>
                        <th className="pb-2 font-medium text-center">{t('coefficient', 'Coeff.')}</th>
                        <th className="pb-2 font-medium text-right">{t('score', 'Score')}</th>
                        <th className="pb-2 font-medium pl-4">{t('comment', 'Comment')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.grades.map((g) => (
                        <tr key={g.assessment_id} className="border-t border-border/40">
                          <td className="py-2.5 font-medium">{g.assessment_title}</td>
                          <td className="py-2.5 text-muted-foreground">
                            {new Date(g.assessment_date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="py-2.5 text-center text-muted-foreground">x{Number(g.coefficient)}</td>
                          <td className={`py-2.5 text-right font-semibold ${
                            g.is_absent ? 'text-orange-500' 
                            : g.is_exempt ? 'text-blue-500' 
                            : scoreColor(g.score, Number(g.max_score))
                          }`}>
                            {g.is_absent ? 'Abs.' : g.is_exempt ? 'Disp.'
                              : g.score != null ? `${g.score}/${g.max_score}` : '-'}
                          </td>
                          <td className="py-2.5 text-muted-foreground text-sm pl-4 italic">
                            {g.comment || ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="py-4 text-muted-foreground text-sm">{t('noDetailedGrades', 'No detailed grades available.')}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
