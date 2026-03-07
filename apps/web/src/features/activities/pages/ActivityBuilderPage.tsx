import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { createActivity, updateActivity, type Question, type QuestionChoice } from '../../../api/activities';
import { getGroups, type GroupData } from '../../../api/groups';
import { getSubjects, type SubjectData } from '../../../api/subjects';

interface ChoiceDraft extends QuestionChoice {
  _key: string;
}

interface QuestionDraft extends Omit<Question, 'choices'> {
  _key: string;
  choices: ChoiceDraft[];
}

function newChoice(): ChoiceDraft {
  return {
    _key: crypto.randomUUID(),
    id: crypto.randomUUID(),
    text: '',
    is_correct: false,
  };
}

function newQuestion(): QuestionDraft {
  return {
    _key: crypto.randomUUID(),
    id: crypto.randomUUID(),
    text: '',
    type: 'single',
    choices: [newChoice(), newChoice()],
    time_limit_s: null,
    points: 1,
  };
}

export function ActivityBuilderPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityType, setActivityType] = useState<'qcm' | 'poll'>('qcm');
  const [groupId, setGroupId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion()]);

  const [groups, setGroups] = useState<GroupData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getGroups(), getSubjects()]).then(([grpRes, subRes]) => {
      const grpList = Array.isArray(grpRes.data) ? grpRes.data : grpRes.data.data ?? [];
      setGroups(grpList);
      const subList = Array.isArray(subRes.data) ? subRes.data : subRes.data.data ?? [];
      setSubjects(subList);
    }).catch(() => {});
  }, []);

  const updateQuestion = (key: string, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) => prev.map((q) => (q._key === key ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (key: string) => {
    setQuestions((prev) => prev.filter((q) => q._key !== key));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, newQuestion()]);
  };

  const updateChoice = (qKey: string, cKey: string, patch: Partial<ChoiceDraft>) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q._key !== qKey) return q;
        return {
          ...q,
          choices: q.choices.map((c) => (c._key === cKey ? { ...c, ...patch } : c)),
        };
      })
    );
  };

  const setCorrectChoice = (qKey: string, cKey: string, questionType: 'single' | 'multi' | 'open') => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q._key !== qKey) return q;
        return {
          ...q,
          choices: q.choices.map((c) => {
            if (questionType === 'single') {
              return { ...c, is_correct: c._key === cKey };
            }
            if (c._key === cKey) {
              return { ...c, is_correct: !c.is_correct };
            }
            return c;
          }),
        };
      })
    );
  };

  const addChoice = (qKey: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q._key === qKey ? { ...q, choices: [...q.choices, newChoice()] } : q))
    );
  };

  const removeChoice = (qKey: string, cKey: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q._key !== qKey) return q;
        return { ...q, choices: q.choices.filter((c) => c._key !== cKey) };
      })
    );
  };

  const validate = (): string | null => {
    if (!title.trim()) return t('title', 'Title') + ' is required';
    if (activityType === 'qcm') {
      if (questions.length === 0) return 'At least one question is required';
      for (const q of questions) {
        if (!q.text.trim()) return 'Each question must have text';
        if (q.type === 'single' || q.type === 'multi') {
          if (q.choices.length < 2) return 'Each question must have at least 2 choices';
          if (q.type === 'single') {
            const correctCount = q.choices.filter((c) => c.is_correct).length;
            if (correctCount !== 1) return 'Single answer questions must have exactly 1 correct choice';
          }
        }
      }
    }
    return null;
  };

  const buildPayload = () => {
    const qs = activityType === 'qcm'
      ? questions.map(({ _key: _qk, choices, ...rest }) => ({
          ...rest,
          choices: choices.map(({ _key: _ck, ...c }) => c),
        }))
      : [];

    return {
      title: title.trim(),
      description: description.trim() || undefined,
      type: activityType,
      group_id: groupId || undefined,
      subject_id: subjectId || undefined,
      questions: qs,
    };
  };

  const handleSave = async (status: 'draft' | 'published') => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await createActivity(buildPayload());
      if (status === 'published') {
        await updateActivity(data.id, { status: 'published' });
      }
      navigate('/activities');
    } catch {
      setError('Failed to save activity. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('newActivity', 'New Activity')}</h1>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <div className="flex flex-col gap-4 mb-8">
        <div>
          <label className="text-sm font-medium block mb-1">{t('title', 'Title')} *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Activity title" />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">{t('description', 'Description')}</label>
          <textarea
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium block mb-1">{t('activityType', 'Type')}</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as 'qcm' | 'poll')}
            >
              <option value="qcm">{t('qcm', 'QCM')}</option>
              <option value="poll">{t('poll', 'Poll')}</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium block mb-1">{t('group', 'Group')}</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            >
              <option value="">{t('noParent', 'None')}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium block mb-1">{t('subject', 'Subject')}</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">{t('noParent', 'None')}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {activityType === 'qcm' && (
        <>
          <h2 className="text-lg font-semibold mb-3">{t('questions', 'Questions')}</h2>
          <div className="flex flex-col gap-4 mb-6">
            {questions.map((question, qIdx) => (
              <div key={question._key} className="border rounded-md p-4 bg-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('questions', 'Question')} {qIdx + 1}
                  </span>
                  <button
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => removeQuestion(question._key)}
                  >
                    {t('remove', 'Remove')}
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-sm font-medium block mb-1">{t('questionText', 'Question')} *</label>
                    <Input
                      placeholder="Enter question text"
                      value={question.text}
                      onChange={(e) => updateQuestion(question._key, { text: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-sm font-medium block mb-1">{t('activityType', 'Type')}</label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={question.type}
                        onChange={(e) =>
                          updateQuestion(question._key, {
                            type: e.target.value as 'single' | 'multi' | 'open',
                          })
                        }
                      >
                        <option value="single">{t('singleChoice', 'Single answer')}</option>
                        <option value="multi">{t('multiChoice', 'Multiple answers')}</option>
                        <option value="open">{t('openAnswer', 'Open answer')}</option>
                      </select>
                    </div>

                    <div className="flex-1">
                      <label className="text-sm font-medium block mb-1">{t('timeLimit', 'Time limit (seconds)')}</label>
                      <Input
                        type="number"
                        placeholder={t('noTimeLimit', 'No limit')}
                        value={question.time_limit_s ?? ''}
                        onChange={(e) =>
                          updateQuestion(question._key, {
                            time_limit_s: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        min={1}
                      />
                    </div>

                    <div style={{ width: '80px' }}>
                      <label className="text-sm font-medium block mb-1">Points</label>
                      <Input
                        type="number"
                        value={question.points}
                        onChange={(e) =>
                          updateQuestion(question._key, { points: Number(e.target.value) || 1 })
                        }
                        min={1}
                      />
                    </div>
                  </div>

                  {(question.type === 'single' || question.type === 'multi') && (
                    <div>
                      <p className="text-sm font-medium mb-2">{t('choices', 'Choices')}</p>
                      <div className="flex flex-col gap-2 mb-2">
                        {question.choices.map((choice) => (
                          <div key={choice._key} className="flex items-center gap-2">
                            <input
                              type={question.type === 'single' ? 'radio' : 'checkbox'}
                              name={`correct-${question._key}`}
                              checked={choice.is_correct}
                              onChange={() => setCorrectChoice(question._key, choice._key, question.type)}
                              title={t('markCorrect', 'Correct answer')}
                            />
                            <Input
                              placeholder={t('addChoice', 'Add choice')}
                              value={choice.text}
                              onChange={(e) =>
                                updateChoice(question._key, choice._key, { text: e.target.value })
                              }
                            />
                            <button
                              className="text-xs text-muted-foreground hover:text-red-500 shrink-0"
                              onClick={() => removeChoice(question._key, choice._key)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => addChoice(question._key)}
                      >
                        + {t('addChoice', 'Add choice')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <Button variant="secondary" onClick={addQuestion}>
              + {t('addQuestion', 'Add Question')}
            </Button>
          </div>
        </>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={() => navigate('/activities')} disabled={saving}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button variant="secondary" onClick={() => handleSave('draft')} disabled={saving} loading={saving}>
          {t('saveDraft', 'Save Draft')}
        </Button>
        <Button variant="primary" onClick={() => handleSave('published')} disabled={saving} loading={saving}>
          {t('publish', 'Publish')}
        </Button>
      </div>
    </div>
  );
}
