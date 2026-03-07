import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Badge } from '../../../components/ui/Badge';
import { getHomeworkById, getSubmissions, submitHomework, gradeSubmission, type HomeworkData, type SubmissionData } from '../../../api/homework';
import { getDirectory, type DirectoryUser } from '../../../api/community';
import { useCurrentUser } from '../../../hooks/useCurrentUser';

function statusVariant(status: string) {
  switch (status) {
    case 'graded': return 'success' as const;
    case 'returned': return 'info' as const;
    case 'late': return 'danger' as const;
    default: return 'default' as const;
  }
}

// ── Teacher: grading row for one submission ──────────────────────────────────

function GradeRow({
  sub,
  homeworkId,
  studentName,
  onSaved,
}: {
  sub: SubmissionData;
  homeworkId: string;
  studentName: string;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState<string>(sub.grade != null ? String(sub.grade) : '');
  const [feedback, setFeedback] = useState(sub.teacher_feedback ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await gradeSubmission(homeworkId, sub.id, {
        grade: grade !== '' ? Number(grade) : undefined,
        teacher_feedback: feedback || undefined,
        status: 'graded',
      });
      onSaved();
      setOpen(false);
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Row header */}
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
            {studentName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{studentName}</p>
            <p className="text-xs text-muted-foreground">
              {t('submittedAt', 'Submitted')}: {new Date(sub.submitted_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
          {sub.grade != null && (
            <span className="text-sm font-semibold text-primary">{Number(sub.grade)}/20</span>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-xs px-2.5 py-1 rounded-md border border-input bg-background hover:bg-muted transition text-muted-foreground"
          >
            {open ? t('close', 'Close') : sub.grade != null ? t('editGrade', 'Edit grade') : t('grade', 'Grade')}
          </button>
        </div>
      </div>

      {/* Submission content */}
      {sub.content && (
        <div className="px-4 pb-3 border-t pt-3">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sub.content}</p>
        </div>
      )}

      {/* Existing feedback display */}
      {sub.teacher_feedback && !open && (
        <div className="px-4 pb-3">
          <div className="p-2 bg-blue-50 rounded text-sm text-blue-800">
            <strong>{t('feedback', 'Feedback')}:</strong> {sub.teacher_feedback}
          </div>
        </div>
      )}

      {/* Grading form */}
      {open && (
        <div className="px-4 pb-4 pt-2 border-t space-y-3 bg-muted/20">
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 w-28">
              <label className="text-xs font-medium text-muted-foreground">{t('score', 'Score')} /20</label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                placeholder="—"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-muted-foreground">{t('feedback', 'Feedback')}</label>
              <input
                type="text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                placeholder={t('optionalFeedback', 'Optional comment for student…')}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>{t('save')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function SubmissionPage() {
  const { t } = useTranslation();
  const { id: homeworkId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [homework, setHomework] = useState<HomeworkData | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');

  // My own submission (student view)
  const mySubmission = !isTeacher
    ? submissions.find((s) => s.student_id === user?.id)
    : null;

  const fetchAll = useCallback(async () => {
    if (!homeworkId) return;
    setLoading(true);
    try {
      const [hwRes, subRes] = await Promise.all([
        getHomeworkById(homeworkId),
        getSubmissions(homeworkId),
      ]);
      setHomework(hwRes.data);
      const subs = Array.isArray(subRes.data) ? subRes.data : [];
      setSubmissions(subs);

      // Resolve student names for teacher view
      if (isTeacher && subs.length > 0) {
        const { data: dir } = await getDirectory();
        const list: DirectoryUser[] = Array.isArray(dir) ? dir : [];
        const map: Record<string, string> = {};
        for (const u of list) map[u.id] = u.display_name;
        setUserMap(map);
      }
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [homeworkId, isTeacher]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async () => {
    if (!homeworkId) return;
    setSubmitting(true);
    try {
      await submitHomework(homeworkId, { content: content || undefined });
      setContent('');
      fetchAll();
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const gradedCount = submissions.filter((s) => s.status === 'graded').length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate('/homework')}
          className="text-muted-foreground hover:text-foreground transition text-sm"
        >
          ← {t('homework', 'Homework')}
        </button>
      </div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{homework?.title ?? '…'}</h1>
          {homework && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('due', 'Due')}: {homework.due_date}
              {homework.description && ` — ${homework.description}`}
            </p>
          )}
        </div>
        {isTeacher && submissions.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{gradedCount}/{submissions.length}</span>
            {t('graded', 'graded')}
          </div>
        )}
      </div>

      {/* ── Student view ── */}
      {!isTeacher && (
        <div className="space-y-4">
          {/* Already submitted */}
          {mySubmission ? (
            <div className="p-4 border rounded-lg bg-card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{t('yourSubmission', 'Your Submission')}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(mySubmission.status)}>{mySubmission.status}</Badge>
                  {mySubmission.grade != null && (
                    <span className="text-sm font-semibold text-primary">{Number(mySubmission.grade)}/20</span>
                  )}
                </div>
              </div>
              {mySubmission.content && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{mySubmission.content}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('submittedAt', 'Submitted')}: {new Date(mySubmission.submitted_at).toLocaleString()}
              </p>
              {mySubmission.teacher_feedback && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <strong>{t('feedback', 'Feedback')}:</strong> {mySubmission.teacher_feedback}
                </div>
              )}
            </div>
          ) : (
            /* Not submitted yet */
            homework?.allow_submission ? (
              <div className="p-4 border rounded-lg bg-card">
                <h2 className="font-semibold mb-3">{t('yourSubmission', 'Your Submission')}</h2>
                <textarea
                  className="w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring resize-y"
                  placeholder={t('writeSubmission', 'Write your submission here...')}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <div className="flex justify-end mt-3">
                  <Button variant="primary" loading={submitting} onClick={handleSubmit}>
                    {t('submit', 'Submit')}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t('noOnlineSubmission', 'This assignment does not accept online submissions.')}</p>
            )
          )}
        </div>
      )}

      {/* ── Teacher view ── */}
      {isTeacher && (
        <div className="space-y-3">
          {submissions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">{t('noSubmissions', 'No submissions yet.')}</p>
          ) : (
            submissions.map((sub) => (
              <GradeRow
                key={sub.id}
                sub={sub}
                homeworkId={homeworkId!}
                studentName={userMap[sub.student_id] ?? sub.student_id.slice(0, 8) + '…'}
                onSaved={fetchAll}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
