import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { getAssessmentById, getAssessmentGrades, bulkCreateGrades, type AssessmentData, type GradeData, type GradeInput } from '../../../api/gradebook';
import { getGroup } from '../../../api/groups';

interface GradeRow {
  student_id: string;
  score: string;
  is_absent: boolean;
  is_exempt: boolean;
  comment: string;
}

export function GradeEntryPage() {
  const { t } = useTranslation();
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [, setGrades] = useState<GradeData[]>([]);
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const isQcmSource = Boolean(assessment?.source_activity_id);

  const fetchGrades = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    try {
      const [gradesRes, assessmentRes] = await Promise.all([
        getAssessmentGrades(assessmentId),
        getAssessmentById(assessmentId),
      ]);
      const list = Array.isArray(gradesRes.data) ? gradesRes.data : [];
      setGrades(list);
      setRows(list.map((g) => ({
        student_id: g.student_id,
        score: g.score !== null ? String(g.score) : '',
        is_absent: g.is_absent,
        is_exempt: g.is_exempt,
        comment: g.comment || '',
      })));
      const found = assessmentRes.data ?? null;
      setAssessment(found);

      // Load group members to build student name map
      if (found?.group_id) {
        try {
          const groupRes = await getGroup(found.group_id);
          const members = groupRes.data?.members ?? [];
          const nameMap: Record<string, string> = {};
          for (const m of members) {
            nameMap[m.user_id] = m.display_name || m.email || m.user_id.slice(0, 8);
          }
          setStudentNames(nameMap);
        } catch {
          setStudentNames({});
        }
      }
    } catch {
      setGrades([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const updateRow = (index: number, field: keyof GradeRow, value: string | boolean) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    if (!assessmentId) return;
    setSaving(true);
    try {
      const payload: GradeInput[] = rows.map((r) => ({
        student_id: r.student_id,
        score: r.score !== '' ? parseFloat(r.score) : null,
        is_absent: r.is_absent,
        is_exempt: r.is_exempt,
        comment: r.comment || null,
      }));
      await bulkCreateGrades(assessmentId, payload);
      fetchGrades();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const stats = useMemo(() => {
    const scores = rows
      .filter((r) => r.score !== '' && !r.is_absent && !r.is_exempt)
      .map((r) => parseFloat(r.score));
    if (scores.length === 0) return null;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { min: min.toFixed(1), max: max.toFixed(1), avg: avg.toFixed(1), count: scores.length };
  }, [rows]);

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/gradebook')}>
            &larr; {t('back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold">{t('gradeEntry', 'Grade Entry')}</h1>
        </div>
        <Button variant="primary" loading={saving} onClick={handleSave} disabled={isQcmSource}>
          {t('saveGrades', 'Save Grades')}
        </Button>
      </div>

      {isQcmSource && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <span className="shrink-0">ℹ</span>
          <span>
            {t('qcmReadOnly', 'Scores from auto-graded QCM — read only.')}
            {' '}
            {t('qcmReadOnlyHint', 'Re-push from the activity to update.')}
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-muted-foreground">{t('noGradesYet', 'No grades entered yet for this assessment.')}</p>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">{t('student', 'Student')}</th>
                <th className="text-left p-2">{t('score', 'Score')}</th>
                <th className="text-center p-2">{t('absent', 'Abs')}</th>
                <th className="text-center p-2">{t('exempt', 'Exc')}</th>
                <th className="text-left p-2">{t('comment', 'Comment')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.student_id} className="border-b hover:bg-muted/30">
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2 font-medium">
                    {studentNames[row.student_id] ?? `${row.student_id.slice(0, 8)}...`}
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="h-8 w-20 min-w-[4rem] rounded border border-input bg-transparent px-2 text-sm outline-none focus:border-ring disabled:opacity-60"
                      value={row.score}
                      onChange={(e) => updateRow(i, 'score', e.target.value)}
                      disabled={isQcmSource || row.is_absent || row.is_exempt}
                      readOnly={isQcmSource}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.is_absent}
                      onChange={(e) => updateRow(i, 'is_absent', e.target.checked)}
                      disabled={isQcmSource}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.is_exempt}
                      onChange={(e) => updateRow(i, 'is_exempt', e.target.checked)}
                      disabled={isQcmSource}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="h-8 w-full rounded border border-input bg-transparent px-2 text-sm outline-none focus:border-ring disabled:opacity-60"
                      value={row.comment}
                      onChange={(e) => updateRow(i, 'comment', e.target.value)}
                      disabled={isQcmSource}
                      readOnly={isQcmSource}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stats && (
        <div className="mt-4 flex gap-6 p-3 bg-muted/30 rounded-lg text-sm">
          <span><strong>{t('min', 'Min')}:</strong> {stats.min}</span>
          <span><strong>{t('max', 'Max')}:</strong> {stats.max}</span>
          <span><strong>{t('average', 'Avg')}:</strong> {stats.avg}</span>
          <span><strong>{t('graded', 'Graded')}:</strong> {stats.count}/{rows.length}</span>
        </div>
      )}
    </div>
  );
}
