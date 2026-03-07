import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import {
  getLiveSession,
  submitReplayAttempt,
  getReplayAttempt,
  type ReplayAttemptResult,
  type ReplayQuestionResult,
} from '../../../api/liveSessions';
import { getActivity, type ActivityData, type Question } from '../../../api/activities';

// ── Helpers ────────────────────────────────────────────────────────────────────

function isAxios404(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    (err as { response?: { status?: number } }).response?.status === 404
  );
}

// ── ScoreReveal ────────────────────────────────────────────────────────────────

function ReplayScoreReveal({
  result,
  activity,
}: {
  result: ReplayAttemptResult;
  activity: ActivityData;
}) {
  const { t } = useTranslation();

  const choiceMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const q of activity.questions) {
      for (const c of q.choices) {
        map[c.id] = c.text;
      }
    }
    return map;
  }, [activity]);

  const score = result.score ?? 0;
  const maxScore = result.max_score ?? 0;
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  const questionResults: ReplayQuestionResult[] = result.question_results ?? [];

  return (
    <div className="space-y-6">
      {/* Score banner */}
      <div className="p-6 border-2 border-primary rounded-xl bg-card text-center space-y-1">
        <p className="text-4xl font-bold text-primary">
          {score} / {maxScore}
        </p>
        <p className="text-muted-foreground text-sm">
          {t('yourScore', 'Your Score')} — {pct}%
        </p>
      </div>

      {/* Per-question results */}
      <div className="space-y-3">
        {questionResults.map((qr) => {
          const question = activity.questions[qr.question_index];
          const correctTexts = qr.correct_choice_ids.map((cid) => choiceMap[cid] ?? cid);
          const studentTexts = qr.selected_ids.map((cid) => choiceMap[cid] ?? cid);

          return (
            <div
              key={qr.question_index}
              className={`p-4 border-l-4 rounded-lg bg-card ${
                qr.is_correct
                  ? 'border-green-500 bg-green-50/50'
                  : 'border-red-400 bg-red-50/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Q{qr.question_index + 1}
                  </p>
                  <p className="font-medium text-sm">{question?.text ?? `Q${qr.question_index + 1}`}</p>

                  {studentTexts.length > 0 && (
                    <p className="text-sm mt-1 text-muted-foreground">
                      {t('yourAnswer', 'Your answer')}: {studentTexts.join(', ')}
                    </p>
                  )}

                  {!qr.is_correct && correctTexts.length > 0 && (
                    <p className="text-sm mt-1 text-green-700 font-medium">
                      {t('correctAnswer', 'Correct answer')}: {correctTexts.join(', ')}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      qr.is_correct
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {qr.is_correct ? t('correct', 'Correct') : t('wrong', 'Wrong')}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    +{qr.points_earned} {t('pointsEarned', 'Points')}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2">
        <Link to="/activities" className="text-sm text-primary underline">
          {t('activities', 'Activities')}
        </Link>
      </div>
    </div>
  );
}

// ── QuestionCard ───────────────────────────────────────────────────────────────

function ReplayQuestionCard({
  question,
  index,
  selectedIds,
  textValue,
  onSingleChoice,
  onMultiChoice,
  onText,
}: {
  question: Question;
  index: number;
  selectedIds: string[];
  textValue: string;
  onSingleChoice: (qIdx: number, choiceId: string) => void;
  onMultiChoice: (qIdx: number, choiceId: string) => void;
  onText: (qIdx: number, text: string) => void;
}) {
  return (
    <div className="border rounded-xl bg-card p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Q{index + 1}
        </p>
        <p className="text-base font-bold leading-snug">{question.text}</p>
      </div>

      {question.type === 'open' ? (
        <textarea
          className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring resize-y"
          placeholder="Your answer…"
          value={textValue}
          onChange={(e) => onText(index, e.target.value)}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {question.choices.map((choice) => {
            const selected = selectedIds.includes(choice.id);
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() =>
                  question.type === 'multi'
                    ? onMultiChoice(index, choice.id)
                    : onSingleChoice(index, choice.id)
                }
                className={`w-full text-left py-3 px-4 rounded-lg border transition-colors text-sm font-medium ${
                  selected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input hover:bg-muted/60 text-foreground'
                }`}
              >
                {choice.text}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── ReplayPage ─────────────────────────────────────────────────────────────────

export function ReplayPage() {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [result, setResult] = useState<ReplayAttemptResult | null>(null);
  const [replayDeadline, setReplayDeadline] = useState<string | null>(null);

  // answers[questionIndex] = { selectedIds, text }
  const [answers, setAnswers] = useState<
    Record<number, { selectedIds: string[]; text: string }>
  >({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!code) return;

    const run = async () => {
      try {
        // 1. Load session
        const sessionRes = await getLiveSession(code);
        const session = sessionRes.data;

        setReplayDeadline(session.replay_deadline ?? null);

        // Check replay_open
        if (session.replay_open === false) {
          setError(t('replayNotAvailable', 'Replay is not available for this session.'));
          return;
        }

        // Check deadline
        if (session.replay_deadline) {
          const deadline = new Date(session.replay_deadline);
          if (deadline < new Date()) {
            setError(t('replayDeadlinePassed', 'The replay deadline has passed.'));
            return;
          }
        }

        // 2. Try fetching existing attempt
        try {
          const attemptRes = await getReplayAttempt(code);
          // Already attempted — load activity for reveal
          const actRes = await getActivity(session.activity_id);
          setActivity(actRes.data);
          setResult(attemptRes.data);
          return;
        } catch (attemptErr) {
          if (!isAxios404(attemptErr)) {
            // Unexpected error
            setError(t('error', 'Error'));
            return;
          }
          // 404 = no attempt yet, continue
        }

        // 3. Load activity questions for answering phase
        const actRes = await getActivity(session.activity_id);
        setActivity(actRes.data);
      } catch {
        setError(t('error', 'Error'));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [code, t]);

  const handleSingleChoice = (qIdx: number, choiceId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qIdx]: { selectedIds: [choiceId], text: prev[qIdx]?.text ?? '' },
    }));
  };

  const handleMultiChoice = (qIdx: number, choiceId: string) => {
    setAnswers((prev) => {
      const current = prev[qIdx]?.selectedIds ?? [];
      const already = current.includes(choiceId);
      const next = already
        ? current.filter((id) => id !== choiceId)
        : [...current, choiceId];
      return { ...prev, [qIdx]: { selectedIds: next, text: prev[qIdx]?.text ?? '' } };
    });
  };

  const handleText = (qIdx: number, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qIdx]: { selectedIds: prev[qIdx]?.selectedIds ?? [], text },
    }));
  };

  const allAnswered = useMemo(() => {
    if (!activity) return false;
    return activity.questions
      .filter((q) => q.type !== 'open')
      .every((_, idx) => {
        const a = answers[idx];
        return a && a.selectedIds.length > 0;
      });
  }, [activity, answers]);

  const answeredCount = useMemo(() => {
    if (!activity) return 0;
    return activity.questions.filter((q, idx) => {
      const a = answers[idx];
      if (q.type === 'open') return a && (a.text ?? '').trim().length > 0;
      return a && a.selectedIds.length > 0;
    }).length;
  }, [activity, answers]);

  const handleSubmit = async () => {
    if (!code || !activity) return;
    setSubmitting(true);
    try {
      const replayAnswers = activity.questions.map((_, idx) => ({
        question_index: idx,
        selected_ids: answers[idx]?.selectedIds ?? [],
      }));
      const res = await submitReplayAttempt(code, replayAnswers);
      setResult(res.data);
    } catch {
      setError(t('error', 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-muted-foreground space-y-4">
        <p>{error}</p>
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
        <h1 className="text-2xl font-bold">{activity?.title ?? '\u2026'}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('sessionReplay', 'Session Replay')}
        </p>
      </div>

      {/* Score reveal after submission */}
      {result ? (
        <div className="space-y-4">
          {activity && <ReplayScoreReveal result={result} activity={activity} />}
        </div>
      ) : (
        <>
          {/* Replay note */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {t(
              'replayNote',
              'You are replaying this session. Answer all questions then submit.',
            )}
          </div>

          {/* Deadline */}
          {replayDeadline && (
            <p className="text-sm text-muted-foreground">
              {t('replayDeadline', 'Available until')}:{' '}
              <span className="font-medium">
                {new Date(replayDeadline).toLocaleString()}
              </span>
            </p>
          )}

          {/* Progress */}
          {activity && (
            <p className="text-sm text-muted-foreground">
              {t('questionOf', 'Question {{current}} of {{total}} answered', {
                current: answeredCount,
                total: activity.questions.length,
              })}
            </p>
          )}

          {/* Questions */}
          <div className="space-y-4">
            {activity?.questions.map((q, idx) => (
              <ReplayQuestionCard
                key={q.id}
                question={q}
                index={idx}
                selectedIds={answers[idx]?.selectedIds ?? []}
                textValue={answers[idx]?.text ?? ''}
                onSingleChoice={handleSingleChoice}
                onMultiChoice={handleMultiChoice}
                onText={handleText}
              />
            ))}
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              loading={submitting}
              disabled={!allAnswered || submitting}
              onClick={handleSubmit}
            >
              {t('submitAnswers', 'Submit Answers')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
