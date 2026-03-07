import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

type Phase = 'lobby' | 'question' | 'reveal' | 'finished';

function WsStatusDot({ state }: { state: 'connecting' | 'open' | 'closed' | 'error' }) {
  const { t } = useTranslation();
  const colorMap = {
    connecting: 'bg-yellow-400',
    open: 'bg-green-500',
    closed: 'bg-slate-400',
    error: 'bg-red-500',
  };
  const labelMap = {
    connecting: t('connecting', 'Connecting…'),
    open: t('connected', 'Connected'),
    closed: t('disconnected', 'Disconnected'),
    error: t('disconnected', 'Disconnected'),
  };
  return (
    <span className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorMap[state]}`} />
      {labelMap[state]}
    </span>
  );
}

export function LiveTeacherPage() {
  const { code: joinCode } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [phase, setPhase] = useState<Phase>('lobby');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({});
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [finalScores, setFinalScores] = useState<ScoreEntry[]>([]);

  const { readyState, lastMessage, send } = useSessionSocket(joinCode ?? null);

  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'student_joined': {
        setTotalStudents((prev) => prev + 1);
        break;
      }
      case 'question_start': {
        const data = lastMessage.data as {
          index: number;
          question: Question;
          time_limit_s: number;
          total?: number;
        };
        setCurrentQuestion(data.question);
        setQuestionIndex(data.index);
        if (data.total !== undefined) setTotalQuestions(data.total);
        setAnswerCounts({});
        setCorrectIds([]);
        setPhase('question');
        break;
      }
      case 'answer_update': {
        const data = lastMessage.data as {
          question_index: number;
          counts: Record<string, number>;
        };
        setAnswerCounts(data.counts);
        break;
      }
      case 'question_reveal': {
        const data = lastMessage.data as {
          question_index: number;
          question: Question;
          counts: Record<string, number>;
          correct_ids: string[];
        };
        setCurrentQuestion(data.question);
        setAnswerCounts(data.counts);
        setCorrectIds(data.correct_ids);
        setPhase('reveal');
        break;
      }
      case 'session_finished': {
        const data = lastMessage.data as { scores: ScoreEntry[] };
        setFinalScores(data.scores);
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
  }, [lastMessage]);

  const handleReveal = () => {
    send({ type: 'reveal_question', data: {} });
  };

  const handleNext = () => {
    send({ type: 'next_question', data: {} });
  };

  const handleFinish = () => {
    send({ type: 'finish_session', data: {} });
  };

  // Total answers cast for progress bars
  const totalAnswers = currentQuestion
    ? currentQuestion.choices.reduce((sum, c) => sum + (answerCounts[c.id] ?? 0), 0)
    : 0;

  if (phase === 'finished') {
    return (
      <div className="max-w-2xl mx-auto py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('sessionFinished', 'Session finished!')}</h1>
          <Button variant="secondary" onClick={() => navigate('/activities')}>
            {t('activities', 'Activities')}
          </Button>
        </div>

        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Student</th>
                <th className="text-right px-4 py-3 font-medium">{t('yourScore', 'Score')}</th>
              </tr>
            </thead>
            <tbody>
              {finalScores.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-center px-4 py-6 text-muted-foreground">
                    —
                  </td>
                </tr>
              ) : (
                finalScores.map((entry, i) => (
                  <tr key={entry.student_id} className={i % 2 === 0 ? '' : 'bg-muted/30'}>
                    <td className="px-4 py-2 font-mono">{entry.student_id.slice(0, 12)}…</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {entry.score} / {entry.max_score}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-sm text-muted-foreground">{t('liveSession', 'Live Session')}: </span>
            <span className="font-mono font-bold text-lg">{joinCode}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {totalStudents} {t('studentsAnswered', 'students answered')}
          </span>
          <WsStatusDot state={readyState} />
        </div>
        <Button variant="secondary" onClick={handleFinish}>
          {t('finishSession', 'Finish Session')}
        </Button>
      </div>

      {/* Lobby phase */}
      {phase === 'lobby' && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6">
          <p className="text-muted-foreground text-lg">
            {t('waitingForQuestion', 'Waiting for the next question…')}
          </p>
          <Button variant="primary" onClick={handleNext}>
            {t('startFirstQuestion', 'Start First Question')} →
          </Button>
        </div>
      )}

      {/* Question / Reveal phase */}
      {(phase === 'question' || phase === 'reveal') && currentQuestion && (
        <div className="flex flex-col gap-6">
          {/* Phase label */}
          <p className="text-sm text-muted-foreground">
            {phase === 'question'
              ? t('liveResults', 'Live Results')
              : t('revealAnswers', 'Reveal Answers')}
            {totalQuestions > 0 && ` · ${questionIndex + 1}/${totalQuestions}`}
          </p>

          {/* Question card */}
          <div className="border rounded-xl p-6 flex flex-col gap-6 bg-card">
            <p className="text-xl font-semibold">{currentQuestion.text}</p>

            {/* Answer bars */}
            <div className="flex flex-col gap-3">
              {currentQuestion.choices.map((choice, idx) => {
                const count = answerCounts[choice.id] ?? 0;
                const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
                const label = String.fromCharCode(65 + idx); // A, B, C, D...
                const isCorrect = correctIds.includes(choice.id);

                let barColor = 'bg-primary/60';
                let borderClass = '';
                if (phase === 'reveal') {
                  barColor = isCorrect ? 'bg-green-500' : 'bg-slate-300';
                  borderClass = isCorrect
                    ? 'border border-green-500'
                    : 'border border-transparent';
                }

                return (
                  <div key={choice.id} className={`flex flex-col gap-1 rounded-lg p-2 ${borderClass}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${phase === 'reveal' && isCorrect ? 'text-green-700' : ''}`}>
                        {label}) {choice.text}
                        {phase === 'reveal' && isCorrect && (
                          <span className="ml-2 text-green-600 font-bold">✓</span>
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {count} / {totalAnswers > 0 ? totalAnswers : '—'}
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {phase === 'question' && (
              <Button variant="secondary" onClick={handleReveal}>
                {t('revealAnswers', 'Reveal Answers')}
              </Button>
            )}
            {phase === 'reveal' && (
              <Button variant="primary" onClick={handleNext}>
                {t('nextQuestion', 'Next Question')} →
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
