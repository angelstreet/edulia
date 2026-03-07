import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { getForm, submitResponse, type FormData } from '../../../api/forms';

export function FormFillPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    getForm(id)
      .then(({ data }) => setForm(data))
      .catch(() => setForm(null))
      .finally(() => setLoading(false));
  }, [id]);

  const setAnswer = (fieldId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => { const e = { ...prev }; delete e[fieldId]; return e; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    for (const field of form?.fields || []) {
      if (!field.required) continue;
      const val = answers[field.id];
      const empty = val === undefined || val === null || val === '' ||
        (Array.isArray(val) && val.length === 0);
      if (empty) errs[field.id] = 'This field is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !id) return;
    setSubmitting(true);
    try {
      await submitResponse(id, answers);
      setSubmitted(true);
    } catch {
      setErrors({ _global: 'Submission failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!form) return <p className="text-center py-12 text-muted-foreground">Form not found.</p>;

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-xl font-bold mb-2">{t('submitted', 'Response submitted!')}</h2>
        <p className="text-muted-foreground mb-6">{t('thankYou', 'Thank you for your response.')}</p>
        <Button variant="secondary" onClick={() => navigate('/forms')}>{t('backToForms', 'Back to Forms')}</Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{form.title}</h1>
        {form.description && <p className="text-muted-foreground mt-1">{form.description}</p>}
        {form.deadline && (
          <p className="text-sm text-orange-600 mt-1">
            Due: {new Date(form.deadline).toLocaleDateString()}
          </p>
        )}
      </div>

      {errors['_global'] && <p className="text-red-500 text-sm mb-4">{errors['_global']}</p>}

      <div className="flex flex-col gap-6">
        {(form.fields || []).map((field) => (
          <div key={field.id}>
            <label className="text-sm font-medium block mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.field_type === 'text' && (
              <Input
                value={(answers[field.id] as string) || ''}
                onChange={(e) => setAnswer(field.id, e.target.value)}
              />
            )}
            {field.field_type === 'textarea' && (
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                rows={3}
                value={(answers[field.id] as string) || ''}
                onChange={(e) => setAnswer(field.id, e.target.value)}
              />
            )}
            {field.field_type === 'date' && (
              <input
                type="date"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={(answers[field.id] as string) || ''}
                onChange={(e) => setAnswer(field.id, e.target.value)}
              />
            )}
            {field.field_type === 'radio' && (
              <div className="flex flex-col gap-2">
                {field.options.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={field.id}
                      value={opt}
                      checked={answers[field.id] === opt}
                      onChange={() => setAnswer(field.id, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
            {field.field_type === 'select' && (
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={(answers[field.id] as string) || ''}
                onChange={(e) => setAnswer(field.id, e.target.value)}
              >
                <option value="">Select...</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
            {field.field_type === 'checkbox' && (
              <div className="flex flex-col gap-2">
                {field.options.map((opt) => {
                  const checked = ((answers[field.id] as string[]) || []).includes(opt);
                  return (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const current = (answers[field.id] as string[]) || [];
                          setAnswer(
                            field.id,
                            e.target.checked ? [...current, opt] : current.filter((v) => v !== opt)
                          );
                        }}
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            )}
            {errors[field.id] && (
              <p className="text-red-500 text-xs mt-1">{errors[field.id]}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? t('submitting', 'Submitting...') : t('submit', 'Submit')}
        </Button>
      </div>
    </div>
  );
}
