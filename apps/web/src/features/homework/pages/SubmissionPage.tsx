import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Badge } from '../../../components/ui/Badge';
import { getSubmissions, submitHomework, type SubmissionData } from '../../../api/homework';
import { useCurrentUser } from '../../../hooks/useCurrentUser';

export function SubmissionPage() {
  const { t } = useTranslation();
  const { id: homeworkId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');

  const fetchSubmissions = useCallback(async () => {
    if (!homeworkId) return;
    setLoading(true);
    try {
      const { data } = await getSubmissions(homeworkId);
      setSubmissions(Array.isArray(data) ? data : []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [homeworkId]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const handleSubmit = async () => {
    if (!homeworkId) return;
    setSubmitting(true);
    try {
      await submitHomework(homeworkId, { content: content || undefined });
      setContent('');
      fetchSubmissions();
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'graded': return 'success' as const;
      case 'late': return 'danger' as const;
      case 'returned': return 'info' as const;
      default: return 'default' as const;
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="secondary" onClick={() => navigate('/homework')}>
          &larr; {t('back', 'Back')}
        </Button>
        <h1 className="text-2xl font-bold">
          {isTeacher ? t('submissions', 'Submissions') : t('submitHomework', 'Submit Homework')}
        </h1>
      </div>

      {/* Student: submit form */}
      {!isTeacher && (
        <div className="mb-6 p-4 border rounded-lg bg-card">
          <h2 className="text-lg font-semibold mb-3">{t('yourSubmission', 'Your Submission')}</h2>
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
      )}

      {/* List of submissions */}
      <div className="flex flex-col gap-2">
        {submissions.length === 0 ? (
          <p className="text-muted-foreground">{t('noSubmissions', 'No submissions yet.')}</p>
        ) : (
          submissions.map((sub) => (
            <div key={sub.id} className="p-4 border rounded-lg bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {isTeacher ? sub.student_id.slice(0, 8) + '...' : t('yourSubmission', 'Your Submission')}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
                  {sub.grade !== null && (
                    <span className="text-sm font-semibold">{sub.grade}/20</span>
                  )}
                </div>
              </div>
              {sub.content && (
                <p className="text-sm mb-2">{sub.content}</p>
              )}
              <span className="text-xs text-muted-foreground">
                {t('submittedAt', 'Submitted')}: {new Date(sub.submitted_at).toLocaleString()}
              </span>
              {sub.teacher_feedback && (
                <div className="mt-2 p-2 bg-muted/30 rounded text-sm">
                  <strong>{t('feedback', 'Feedback')}:</strong> {sub.teacher_feedback}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
