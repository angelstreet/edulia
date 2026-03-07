import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import {
  getActivity,
  getAllAttempts,
  getActivityReport,
  type ActivityData,
  type AttemptResult,
  type ActivityReport,
} from '../../../api/activities';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dt: string | null): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleString();
}

// ── ActivityResultsPage ───────────────────────────────────────────────────────

export function ActivityResultsPage() {
  const { t } = useTranslation();
  const { id: activityId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [report, setReport] = useState<ActivityReport | null>(null);

  useEffect(() => {
    if (!activityId) return;
    Promise.all([
      getActivity(activityId),
      getAllAttempts(activityId),
      getActivityReport(activityId).catch(() => null),
    ])
      .then(([actRes, attRes, repRes]) => {
        setActivity(actRes.data);
        setAttempts(Array.isArray(attRes.data) ? attRes.data : []);
        setReport(repRes ? repRes.data : null);
      })
      .catch(() => {
        setAttempts([]);
      })
      .finally(() => setLoading(false));
  }, [activityId]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const submitted = attempts.filter((a) => a.submitted_at !== null);

  const avgScore = useMemo(() => {
    const scored = submitted.filter((a) => a.score !== null && a.max_score !== null);
    if (scored.length === 0) return null;
    const total = scored.reduce((acc, a) => acc + (a.score ?? 0), 0);
    return (total / scored.length).toFixed(1);
  }, [submitted]);

  const maxScoreRef = useMemo(() => {
    const first = submitted.find((a) => a.max_score !== null);
    return first?.max_score ?? null;
  }, [submitted]);

  // Per-question: % who got it wrong
  const questionStats = useMemo(() => {
    if (!activity) return [];
    return activity.questions.map((q) => {
      const relevant = submitted.filter(
        (a) => a.question_results && a.question_results.some((qr) => qr.question_id === q.id)
      );
      if (relevant.length === 0) return { question: q, wrongPct: 0, correctPct: 0, total: 0 };

      const wrong = relevant.filter((a) =>
        a.question_results?.some((qr) => qr.question_id === q.id && !qr.correct)
      ).length;
      const wrongPct = Math.round((wrong / relevant.length) * 100);
      return { question: q, wrongPct, correctPct: 100 - wrongPct, total: relevant.length };
    });
  }, [activity, submitted]);

  // Sort attempts by score desc
  const sortedAttempts = useMemo(
    () => [...submitted].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    [submitted]
  );

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/activities')}
          className="text-muted-foreground hover:text-foreground transition text-sm"
        >
          {'\u2190'} {t('activities', 'Activities')}
        </button>
      </div>

      <h1 className="text-2xl font-bold">
        {activity?.title ?? '\u2026'} — {t('activityResults', 'Results')}
      </h1>

      {/* Summary bar — prefer aggregated report data when available */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 border rounded-xl bg-card text-center">
          <p className="text-2xl font-bold text-primary">{submitted.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('submitted', 'Submitted')}
          </p>
        </div>
        <div className="p-4 border rounded-xl bg-card text-center">
          <p className="text-2xl font-bold text-primary">
            {report?.avg_score !== undefined && report?.avg_score !== null
              ? `${report.avg_score.toFixed(1)}${report.max_score !== null ? `/${report.max_score}` : ''}`
              : avgScore !== null
              ? `${avgScore}${maxScoreRef !== null ? `/${maxScoreRef}` : ''}`
              : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('avgScore', 'Average score')}
          </p>
        </div>
        <div className="p-4 border rounded-xl bg-card text-center">
          <p className="text-2xl font-bold text-primary">
            {report !== null
              ? `${Math.round(report.completion_rate * 100)}%`
              : submitted.length > 0
              ? `${submitted.length}`
              : '0'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('completion', 'Completion')}
          </p>
        </div>
      </div>

      {/* Aggregated per-question error rates from report endpoint */}
      {report && report.question_error_rates.length > 0 && (
        <div className="border rounded-xl bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            {t('errorRate', 'Error rate')} {t('perQuestion', 'per question')}
          </h2>
          <div className="space-y-3">
            {report.question_error_rates.map((q, idx) => {
              const correctPct = Math.round((1 - q.error_rate) * 100);
              const wrongPct = 100 - correctPct;
              return (
                <div key={q.question_id}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate max-w-[70%]">
                      Q{idx + 1}: {q.question_text}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {wrongPct}% {t('wrong', 'Wrong')}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
                    {correctPct > 0 && (
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${correctPct}%` }}
                      />
                    )}
                    {wrongPct > 0 && (
                      <div
                        className="h-full bg-red-400 transition-all"
                        style={{ width: `${wrongPct}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fallback per-question breakdown from local attempt data (when report endpoint unavailable) */}
      {!report && questionStats.length > 0 && (
        <div className="border rounded-xl bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            {t('errorRate', 'Error rate')} {t('perQuestion', 'per question')}
          </h2>
          <div className="space-y-3">
            {questionStats.map((qs, idx) => (
              <div key={qs.question.id}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium truncate max-w-[70%]">
                    Q{idx + 1}: {qs.question.text}
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {qs.wrongPct}% {t('wrong', 'Wrong')}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
                  {qs.correctPct > 0 && (
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${qs.correctPct}%` }}
                    />
                  )}
                  {qs.wrongPct > 0 && (
                    <div
                      className="h-full bg-red-400 transition-all"
                      style={{ width: `${qs.wrongPct}%` }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-student table */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-3 border-b">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            {t('students', 'Students')}
          </h2>
        </div>

        {sortedAttempts.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            {t('noSubmissions', 'No submissions yet.')}
          </p>
        ) : (
          <div className="divide-y">
            {sortedAttempts.map((attempt) => {
              const scoreDisplay =
                attempt.score !== null && attempt.max_score !== null
                  ? `${attempt.score}/${attempt.max_score}`
                  : '—';

              return (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between px-5 py-3 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {attempt.student_id.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attempt.student_id.slice(0, 8)}&hellip;
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(attempt.submitted_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-primary">{scoreDisplay}</span>
                    <Badge variant="success">{t('submitted', 'Submitted')}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
