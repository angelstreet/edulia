import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { getLiveSession, enableReplay, type LiveSession } from '../../../api/liveSessions';

export function SessionResultsPage() {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<LiveSession | null>(null);

  // Replay form state
  const [replayOpen, setReplayOpen] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    getLiveSession(code)
      .then((res) => {
        const s = res.data;
        setSession(s);
        setReplayOpen(s.replay_open ?? false);
        if (s.replay_deadline) {
          // Convert ISO to datetime-local format (YYYY-MM-DDTHH:mm)
          const d = new Date(s.replay_deadline);
          const pad = (n: number) => String(n).padStart(2, '0');
          const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setDeadline(local);
        }
      })
      .catch(() => setError(t('error', 'Error')))
      .finally(() => setLoading(false));
  }, [code, t]);

  const handleSave = async () => {
    if (!code) return;
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      // Only send deadline if replay is open and a deadline is set
      const deadlineIso = replayOpen && deadline
        ? new Date(deadline).toISOString()
        : null;
      const res = await enableReplay(code, deadlineIso);
      setSession(res.data);
      setSaveSuccess(true);
    } catch {
      setSaveError(t('saveError', 'Could not save. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="py-12 text-center text-muted-foreground space-y-4">
        <p>{error ?? t('error', 'Error')}</p>
        <button
          className="text-sm text-primary underline"
          onClick={() => navigate('/activities')}
        >
          {t('activities', 'Activities')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/activities')}
          className="text-muted-foreground hover:text-foreground transition text-sm"
        >
          {'\u2190'} {t('activities', 'Activities')}
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">
          {t('viewSessionResults', 'View Session Results')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1 font-mono">{session.join_code}</p>
      </div>

      {/* Session info */}
      <div className="rounded-xl border bg-card p-5 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('status', 'Status')}</span>
          <span className="font-medium capitalize">{session.state}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('joinCode', 'Join code')}</span>
          <span className="font-mono font-medium">{session.join_code}</span>
        </div>
        {session.ended_at && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('endDate', 'End date')}</span>
            <span className="font-medium">
              {new Date(session.ended_at).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Replay Settings */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">
          {t('replaySettings', 'Replay Settings')}
        </h2>

        {/* Toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={replayOpen}
            onChange={(e) => {
              setReplayOpen(e.target.checked);
              setSaveSuccess(false);
            }}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <span className="text-sm font-medium">
            {t('openReplayForStudents', 'Open replay for students')}
          </span>
        </label>

        {/* Deadline */}
        {replayOpen && (
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground" htmlFor="replay-deadline">
              {t('replayDeadline', 'Available until')} ({t('optional', 'optional')})
            </label>
            <input
              id="replay-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => {
                setDeadline(e.target.value);
                setSaveSuccess(false);
              }}
              className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center gap-3">
          <Button variant="primary" loading={saving} onClick={handleSave}>
            {t('save', 'Save')}
          </Button>
          {saveSuccess && (
            <span className="text-sm text-green-700 font-medium">
              {t('replaySaved', 'Replay settings saved!')}
            </span>
          )}
          {saveError && (
            <span className="text-sm text-red-600">{saveError}</span>
          )}
        </div>
      </div>
    </div>
  );
}
