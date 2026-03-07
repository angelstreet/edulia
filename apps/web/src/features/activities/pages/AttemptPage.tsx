import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import {
  startAttempt,
  submitAttempt,
  getMyAttempt,
  type ActivityData,
  type Question,
  type AnswerInput,
  type AttemptResult,
  type QuestionResult,
} from '../../../api/activities';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAxiosConflict(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    (err as { response?: { status?: number } }).response?.status === 409
  );
}

// ── ScoreReveal ───────────────────────────────────────────────────────────────

function ScoreReveal({
  result,
  activity,
}: {
  result: AttemptResult;
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

  const questionMap = useMemo(() => {
    const map: Record<string, Question> = {};
    for (const q of activity.questions) {
      map[q.id] = q;
    }
    return map;
  }, [activity]);

  const score = result.score ?? 0;
  const maxScore = result.max_score ?? 0;
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  const questionResults: QuestionResult[] = result.question_results ?? [];

  const answerMap = useMemo(() => {
    const map: Record<string, AnswerInput> = {};
    for (const a of result.answers) {
      map[a.question_id] = a;
    }
    return map;
  }, [result.answers]);

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
        {questionResults.map((qr, idx) => {
          const question = questionMap[qr.question_id];
          const studentAnswer = answerMap[qr.question_id];
          const correctTexts = qr.correct_choice_ids.map((cid) => choiceMap[cid] ?? cid);
          const studentTexts =
            studentAnswer?.choice_ids?.map((cid) => choiceMap[cid] ?? cid) ?? [];

          return (
            <div
              key={qr.question_id}
              className={`p-4 border-l-4 rounded-lg bg-card ${
                qr.correct ? 'border-green-500 bg-green-50/50' : 'border-red-400 bg-red-50/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Q{idx + 1}
                  </p>
                  <p className="font-medium text-sm">{question?.text ?? qr.question_id}</p>

                  {studentTexts.length > 0 && (
                    <p className="text-sm mt-1 text-muted-foreground">
                      {t('yourAnswer', 'Your answer')}: {studentTexts.join(', ')}
                    </p>
                  )}

                  {!qr.correct && correctTexts.length > 0 && (
                    <p className="text-sm mt-1 text-green-700 font-medium">
                      {t('correctAnswer', 'Correct answer')}: {correctTexts.join(', ')}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      qr.correct
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {qr.correct ? t('correct', 'Correct') : t('wrong', 'Wrong')}
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
    </div>
  );
}

// ── QuestionCard ──────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  answer,
  onAnswer,
}: {
  question: Question;
  index: number;
  answer: AnswerInput | undefined;
  onAnswer: (questionId: string, choiceIds: string[], text?: string) => void;
}) {
  const selectedIds = answer?.choice_ids ?? [];
  const textValue = answer?.text ?? '';

  const handleSingleChoice = (choiceId: string) => {
    onAnswer(question.id, [choiceId]);
  };

  const handleMultiChoice = (choiceId: string) => {
    const already = selectedIds.includes(choiceId);
    const next = already
      ? selectedIds.filter((id) => id !== choiceId)
      : [...selectedIds, choiceId];
    onAnswer(question.id, next);
  };

  const handleText = (text: string) => {
    onAnswer(question.id, [], text);
  };

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
          onChange={(e) => handleText(e.target.value)}
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
                    ? handleMultiChoice(choice.id)
                    : handleSingleChoice(choice.id)
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

// ── AttemptPage ───────────────────────────────────────────────────────────────

export function AttemptPage() {
  const { t } = useTranslation();
  const { id: activityId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerInput>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);

  // On mount: start attempt (or recover existing one)
  useEffect(() => {
    if (!activityId) return;

    startAttempt(activityId)
      .then((res) => {
        setActivity(res.data.activity);
        setAttemptId(res.data.attempt_id);
      })
      .catch(async (err) => {
        if (isAxiosConflict(err)) {
          // Already attempted — fetch existing result
          try {
            const myRes = await getMyAttempt(activityId);
            setResult(myRes.data);
            // We still need the activity for rendering results — use what's in the attempt
            // but we don't have it here; set a minimal flag so ScoreReveal renders
          } catch {
            setError(t('error', 'Error'));
          }
        } else {
          setError(t('activityNotAvailable', 'This activity is not available.'));
        }
      })
      .finally(() => setLoading(false));
  }, [activityId, t]);

  // For 409 path: if we have a result but no activity, fetch it separately
  useEffect(() => {
    if (result && !activity && activityId) {
      import('../../../api/activities').then(({ getActivity }) => {
        getActivity(activityId).then((res) => setActivity(res.data)).catch(() => {});
      });
    }
  }, [result, activity, activityId]);

  const handleAnswer = (questionId: string, choiceIds: string[], text?: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        choice_ids: choiceIds,
        text,
        answered_at_ms: Date.now(),
      },
    }));
  };

  // All non-open questions must have at least one choice selected
  const allAnswered = useMemo(() => {
    if (!activity) return false;
    return activity.questions
      .filter((q) => q.type !== 'open')
      .every((q) => {
        const a = answers[q.id];
        return a && a.choice_ids.length > 0;
      });
  }, [activity, answers]);

  const answeredCount = useMemo(() => {
    if (!activity) return 0;
    return activity.questions.filter((q) => {
      const a = answers[q.id];
      if (q.type === 'open') return a && (a.text ?? '').trim().length > 0;
      return a && a.choice_ids.length > 0;
    }).length;
  }, [activity, answers]);

  const handleSubmit = async () => {
    if (!activityId || !attemptId) return;
    setSubmitting(true);
    try {
      const answerList = Object.values(answers);
      const res = await submitAttempt(activityId, attemptId, answerList);
      setResult(res.data);
    } catch {
      setError(t('error', 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }

  if (error) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>{error}</p>
        <button
          className="mt-4 text-sm text-primary underline"
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

      <h1 className="text-2xl font-bold">{activity?.title ?? '\u2026'}</h1>

      {/* Already submitted — show result only */}
      {result ? (
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm font-medium text-muted-foreground">
            {t('alreadySubmitted', 'Already submitted')}
          </div>
          {activity && <ScoreReveal result={result} activity={activity} />}
        </div>
      ) : (
        <>
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
              <QuestionCard
                key={q.id}
                question={q}
                index={idx}
                answer={answers[q.id]}
                onAnswer={handleAnswer}
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
