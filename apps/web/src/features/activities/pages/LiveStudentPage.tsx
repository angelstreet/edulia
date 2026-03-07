import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { useSessionSocket } from '../../../hooks/useSessionSocket';

interface Choice {
  id: string;
  text: string;
  is_correct?: boolean;
}

interface Question {
  text: string;
  type: string;
  choices: Choice[];
}

interface ScoreEntry {
  student_id: string;
  score: number;
  max_score: number;
}

type Phase = 'waiting' | 'question' | 'answered' | 'reveal' | 'finished';

export function LiveStudentPage() {
  const { code: joinCode } = useParams<{ code: string }>();
  const { t } = useTranslation();

  const [phase, setPhase] = useState<Phase>('waiting');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [myScore, setMyScore] = useState<{ score: number; max_score: number } | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { lastMessage, send } = useSessionSocket(joinCode ?? null);

  // Clear countdown helper
  const clearCountdown = () => {
    if (countdownRef.current !== null) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'question_start': {
        const data = lastMessage.data as {
          index: number;
          question: Question;
          time_limit_s: number;
          total?: number;
        };
        clearCountdown();
        setCurrentQuestion(data.question);
        setQuestionIndex(data.index);
        if (data.total !== undefined) setTotalQuestions(data.total);
        setSelectedIds([]);
        setHasAnswered(false);
        setCorrectIds([]);
        setPhase('question');

        if (data.time_limit_s > 0) {
          setCountdown(data.time_limit_s);
          countdownRef.current = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearCountdown();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
        break;
      }
      case 'question_reveal': {
        clearCountdown();
        const data = lastMessage.data as {
          question_index: number;
          question: Question;
          counts: Record<string, number>;
          correct_ids: string[];
        };
        setCurrentQuestion(data.question);
        setCorrectIds(data.correct_ids);
        setPhase('reveal');
        break;
      }
      case 'session_finished': {
        clearCountdown();
        const data = lastMessage.data as { scores: ScoreEntry[] };
        // Try to find user's score — we don't have the user id here
        // We pick the first entry if there's exactly one match context
        // The server should ideally send it personalised; take the first non-zero if available
        if (data.scores.length > 0) {
          const first = data.scores[0];
          setMyScore({ score: first.score, max_score: first.max_score });
        }
        setPhase('finished');
        break;
      }
      case 'state_change': {
        const data = lastMessage.data as { state: string; current_question_index: number };
        setQuestionIndex(data.current_question_index);
        break;
      }
      default:
        break;
    }
  }, [lastMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCountdown();
    };
  }, []);

  const handleToggle = (choiceId: string) => {
    if (hasAnswered) return;
    if (!currentQuestion) return;

    if (currentQuestion.type === 'single') {
      setSelectedIds([choiceId]);
    } else {
      setSelectedIds((prev) =>
        prev.includes(choiceId) ? prev.filter((id) => id !== choiceId) : [...prev, choiceId],
      );
    }
  };

  const handleSubmit = () => {
    if (hasAnswered || selectedIds.length === 0) return;
    send({
      type: 'answer',
      data: { question_index: questionIndex, selected_ids: selectedIds },
    });
    setHasAnswered(true);
    setPhase('answered');
  };

  // ── Waiting ──────────────────────────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <span className="text-5xl">⏳</span>
        <p className="text-lg text-muted-foreground">
          {t('waitingForQuestion', 'Waiting for the next question…')}
        </p>
      </div>
    );
  }

  // ── Finished ─────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <span className="text-5xl">🎉</span>
        <h1 className="text-2xl font-bold">{t('sessionFinished', 'Session finished!')}</h1>
        {myScore && (
          <p className="text-lg">
            {t('yourScore', 'Your score')}: <span className="font-bold">{myScore.score} / {myScore.max_score}</span>
          </p>
        )}
      </div>
    );
  }

  // ── Question / Answered / Reveal ─────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto py-8 flex flex-col gap-6">
      {/* Progress + countdown */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {totalQuestions > 0
            ? `${t('questions', 'Question')} ${questionIndex + 1}/${totalQuestions}`
            : `${t('questions', 'Question')} ${questionIndex + 1}`}
        </span>
        {phase === 'question' && countdown > 0 && (
          <span className="text-sm font-mono font-medium tabular-nums">
            ⏱ {countdown}s
          </span>
        )}
      </div>

      {/* Question text */}
      {currentQuestion && (
        <div className="flex flex-col gap-5">
          <p className="text-xl font-semibold">{currentQuestion.text}</p>

          {/* Choices */}
          <div className="flex flex-col gap-3">
            {currentQuestion.choices.map((choice) => {
              const isSelected = selectedIds.includes(choice.id);
              const isCorrect = correctIds.includes(choice.id);
              const isWrong = phase === 'reveal' && isSelected && !isCorrect;

              let borderClass = 'border-border';
              let bgClass = '';

              if (phase === 'reveal') {
                if (isCorrect) {
                  borderClass = 'border-green-500 bg-green-50';
                  bgClass = 'text-green-800';
                } else if (isWrong) {
                  borderClass = 'border-red-400 bg-red-50';
                  bgClass = 'text-red-700';
                } else {
                  borderClass = 'border-border';
                  bgClass = 'text-muted-foreground';
                }
              } else if (isSelected) {
                borderClass = 'border-primary bg-primary/5';
              }

              const inputType = currentQuestion.type === 'single' ? 'radio' : 'checkbox';

              return (
                <label
                  key={choice.id}
                  className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-colors ${borderClass} ${hasAnswered ? 'cursor-default' : 'hover:bg-muted/30'}`}
                  onClick={() => handleToggle(choice.id)}
                >
                  <input
                    type={inputType}
                    readOnly
                    checked={isSelected}
                    className="accent-primary w-4 h-4 shrink-0"
                    tabIndex={-1}
                  />
                  <span className={`text-sm font-medium ${bgClass}`}>
                    {choice.text}
                    {phase === 'reveal' && isCorrect && (
                      <span className="ml-2 text-green-600 font-bold">✓</span>
                    )}
                    {phase === 'reveal' && isWrong && (
                      <span className="ml-2 text-red-500 font-bold">✗</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Submit / status */}
          {phase === 'question' && (
            <Button
              variant="primary"
              disabled={selectedIds.length === 0}
              onClick={handleSubmit}
            >
              {t('submitAnswer', 'Submit Answer')}
            </Button>
          )}

          {phase === 'answered' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-xl px-4 py-3 bg-muted/30">
              <span className="text-green-600 font-bold">✓</span>
              {t('answerSubmitted', 'Answer submitted! Waiting for reveal…')}
            </div>
          )}

          {phase === 'reveal' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-xl px-4 py-3 bg-muted/30">
              ⏳ {t('waitingForQuestion', 'Waiting for the next question…')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
