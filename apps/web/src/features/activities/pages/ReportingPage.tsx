import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { getActivityReports, type ActivityReport } from '../../../api/activities';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatusVariant(status: string): 'warning' | 'success' | 'default' {
  if (status === 'draft') return 'warning';
  if (status === 'published') return 'success';
  return 'default';
}

function getTypeLabel(type: string, t: (key: string, fallback: string) => string): string {
  if (type === 'qcm') return t('qcm', 'QCM');
  if (type === 'poll') return t('poll', 'Poll');
  return type;
}

function getStatusLabel(status: string, t: (key: string, fallback: string) => string): string {
  if (status === 'draft') return t('draft', 'Draft');
  if (status === 'published') return t('published', 'Published');
  if (status === 'closed') return t('closed', 'Closed');
  return status;
}

function truncate(text: string, maxLen = 60): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

// ── SummaryCard ───────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="p-4 border rounded-xl bg-card text-center">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

// ── ActivityReportCard ────────────────────────────────────────────────────────

interface ActivityReportCardProps {
  report: ActivityReport;
  onViewDetails: (id: string) => void;
  t: (key: string, fallback: string) => string;
}

function ActivityReportCard({ report, onViewDetails, t }: ActivityReportCardProps) {
  const completionPct = Math.round(report.completion_rate * 100);
  const avgDisplay =
    report.avg_score !== null && report.max_score !== null
      ? `${report.avg_score.toFixed(1)}/${report.max_score}`
      : '—';

  return (
    <div className="border rounded-xl bg-card p-5 space-y-4">
      {/* Card header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-semibold text-base truncate">{report.title}</span>
          <Badge variant="default">{getTypeLabel(report.type, t)}</Badge>
          <Badge variant={getStatusVariant(report.status)}>
            {getStatusLabel(report.status, t)}
          </Badge>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
        <span>
          <span className="font-medium text-foreground">{report.total_attempts}</span>{' '}
          {t('submitted', 'Submitted')}
        </span>
        <span>
          {t('avgScore', 'Average score')}:{' '}
          <span className="font-medium text-foreground">{avgDisplay}</span>
        </span>
        <span>
          {t('completion', 'Completion')}:{' '}
          <span className="font-medium text-foreground">{completionPct}%</span>
        </span>
      </div>

      {/* Per-question bars */}
      {report.question_error_rates.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('questions', 'Questions')}
          </p>
          {report.question_error_rates.map((q, idx) => {
            const correctPct = Math.round((1 - q.error_rate) * 100);
            return (
              <div key={q.question_id}>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <p className="text-sm truncate max-w-[75%]">
                    Q{idx + 1}: {truncate(q.question_text)}
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {correctPct}% {t('correctRate', 'correct')}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-2 bg-green-500 rounded-full"
                    style={{ width: `${correctPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View details link */}
      <div className="flex justify-end">
        <button
          onClick={() => onViewDetails(report.id)}
          className="text-sm text-primary hover:underline font-medium"
        >
          {t('viewDetails', 'View details')} →
        </button>
      </div>
    </div>
  );
}

// ── ReportingPage ─────────────────────────────────────────────────────────────

export function ReportingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ActivityReport[]>([]);

  useEffect(() => {
    getActivityReports()
      .then((res) => {
        setReports(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        setReports([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Summary stats ──────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const total = reports.length;
    const avgCompletion =
      total > 0
        ? Math.round((reports.reduce((acc, r) => acc + r.completion_rate, 0) / total) * 100)
        : 0;

    const scoredReports = reports.filter(
      (r) => r.avg_score !== null && r.max_score !== null
    );
    const overallAvg =
      scoredReports.length > 0
        ? scoredReports.reduce((acc, r) => acc + (r.avg_score ?? 0), 0) /
          scoredReports.length
        : null;
    const refMax =
      scoredReports.length > 0 ? scoredReports[0].max_score : null;

    return { total, avgCompletion, overallAvg, refMax };
  }, [reports]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
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

      <h1 className="text-2xl font-bold">{t('activityReports', 'Activity Reports')}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          label={t('totalActivities', 'Total Activities')}
          value={String(summary.total)}
        />
        <SummaryCard
          label={t('avgCompletion', 'Avg Completion')}
          value={`${summary.avgCompletion}%`}
        />
        <SummaryCard
          label={t('avgScore', 'Average score')}
          value={
            summary.overallAvg !== null && summary.refMax !== null
              ? `${summary.overallAvg.toFixed(1)}/${summary.refMax}`
              : '—'
          }
        />
      </div>

      {/* Per-activity cards */}
      {reports.length === 0 ? (
        <EmptyState
          title={t('noReports', 'No activity reports yet')}
          description={t(
            'noReportsDesc',
            'Publish activities and students will start submitting.'
          )}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((report) => (
            <ActivityReportCard
              key={report.id}
              report={report}
              onViewDetails={(id) => navigate(`/activities/${id}/results`)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
