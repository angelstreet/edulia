import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useAuthStore } from '../../../stores/authStore';
import { getStudentAverages, getStudentSubjectGrades, type StudentAveragesData, type StudentSubjectGrades } from '../../../api/gradebook';
import { getAcademicYears, type TermData } from '../../../api/academicYears';
import { getDashboardStats } from '../../../api/dashboard';
import { ChevronDown, ChevronUp, Users, Download } from 'lucide-react';
import client from '../../../api/client';

interface Child { id: string; name: string; average: number; absences: number; }

export function StudentGradesPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const isParent = useAuthStore(s => s.user?.role === 'parent');
  const [data, setData] = useState<StudentAveragesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentSubjectGrades | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [terms, setTerms] = useState<TermData[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  // Load academic years and flatten terms
  useEffect(() => {
    getAcademicYears()
      .then(({ data }) => {
        const years = data.data ?? [];
        const allTerms = years.flatMap((y) => y.terms ?? []);
        setTerms(allTerms);
      })
      .catch(() => {});
  }, []);

  // Load parent's children from dashboard stats
  useEffect(() => {
    if (!isParent || !user?.id) return;
    getDashboardStats().then(({ data: stats }) => {
      const kids = stats.children ?? [];
      setChildren(kids);
      if (kids.length > 0) setSelectedChildId(kids[0].id);
    }).catch(() => {});
  }, [isParent, user?.id]);

  const targetId = isParent ? selectedChildId : user?.id;

  const downloadReport = async () => {
    if (!targetId) return;
    try {
      const { data: blob } = await client.get(`/v1/report-cards/students/${targetId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulletin_${targetId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!targetId) { setLoading(false); return; }
    setLoading(true);
    const params = selectedTermId ? { term_id: selectedTermId } : {};
    getStudentAverages(targetId, params)
      .then(({ data: d }) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [targetId, selectedTermId]);

  const toggleSubject = async (subjectId: string) => {
    if (expanded === subjectId) { setExpanded(null); setDetail(null); return; }
    setExpanded(subjectId);
    setDetailLoading(true);
    try {
      const params = selectedTermId ? { term_id: selectedTermId } : {};
      const { data: d } = await getStudentSubjectGrades(targetId!, subjectId, params);
      setDetail(d);
    } catch { setDetail(null); }
    finally { setDetailLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const averages = data?.averages ?? [];

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
        <h1 className="text-2xl font-bold">{isParent ? t('childGrades', "My Child's Grades") : t('myGrades', 'My Grades')}</h1>
        <div className="flex items-center gap-3">
          {averages.length > 0 && (
            <button onClick={downloadReport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
              <Download className="w-4 h-4" /> Bulletin PDF
            </button>
          )}
        {data?.general_average != null && (
          <div className="text-lg font-semibold bg-primary/10 text-primary px-4 py-2 rounded-lg">
            {t('generalAverage', 'General Average')}: {data.general_average}/20
          </div>
        )}
        </div>
      </div>

      {/* Parent child selector */}
      {isParent && children.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-2">
            {children.map(child => (
              <button key={child.id} onClick={() => { setSelectedChildId(child.id); setExpanded(null); setDetail(null); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  selectedChildId === child.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}>
                {child.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Term filter */}
      {terms.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm font-medium">{t('term', 'Term')}</label>
          <select
            value={selectedTermId}
            onChange={(e) => { setSelectedTermId(e.target.value); setExpanded(null); setDetail(null); }}
            className="h-8 rounded border border-input bg-transparent px-2 text-sm outline-none focus:border-ring"
          >
            <option value="">{t('allTerms', 'All terms')}</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>{term.name}</option>
            ))}
          </select>
        </div>
      )}

      {averages.length === 0 ? (
        <EmptyState title={t('noGrades', 'No grades yet')} description={t('noGradesDesc', 'Grades will appear here once teachers publish them.')} />
      ) : (
        <div className="flex flex-col gap-3">
          {averages.map((subj) => (
            <div key={subj.subject_id} className="border rounded-lg bg-card overflow-hidden">
              <button onClick={() => toggleSubject(subj.subject_id)}
                className="w-full p-4 flex items-center justify-between hover:bg-accent/5 transition">
                <div className="text-left">
                  <span className="font-medium text-base">{subj.subject_name}</span>
                  <span className="block text-sm text-muted-foreground">{subj.assessment_count} {t('assessments', 'assessments')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xl font-bold ${scoreColor(subj.average, 20)}`}>
                    {subj.average != null ? `${subj.average}/20` : '-'}
                  </span>
                  {expanded === subj.subject_id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
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
                          <th className="pb-2 font-medium">Assessment</th>
                          <th className="pb-2 font-medium">Date</th>
                          <th className="pb-2 font-medium text-center">Coeff.</th>
                          <th className="pb-2 font-medium text-right">Score</th>
                          <th className="pb-2 font-medium pl-4">Comment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.grades.map((g) => (
                          <tr key={g.assessment_id} className="border-t border-border/40">
                            <td className="py-2.5 font-medium">{g.assessment_title}</td>
                            <td className="py-2.5 text-muted-foreground">{new Date(g.assessment_date).toLocaleDateString('fr-FR')}</td>
                            <td className="py-2.5 text-center text-muted-foreground">x{Number(g.coefficient)}</td>
                            <td className={`py-2.5 text-right font-semibold ${
                              g.is_absent ? 'text-orange-500' : g.is_exempt ? 'text-blue-500' : scoreColor(g.score, Number(g.max_score))
                            }`}>
                              {g.is_absent ? 'Abs.' : g.is_exempt ? 'Disp.' : g.score != null ? `${g.score}/${g.max_score}` : '-'}
                            </td>
                            <td className="py-2.5 text-muted-foreground text-sm pl-4 italic">{g.comment || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="py-4 text-muted-foreground text-sm">No detailed grades available.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
