import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { createForm, updateForm as updateFormApi, type FormFieldCreate } from '../../../api/forms';

const FIELD_TYPES = ['text', 'textarea', 'checkbox', 'radio', 'select', 'date', 'file'];

interface FieldDraft extends FormFieldCreate {
  _key: string;
  _optionInput: string;
}

function newField(position: number): FieldDraft {
  return {
    _key: crypto.randomUUID(),
    label: '',
    field_type: 'text',
    required: false,
    options: [],
    position,
    _optionInput: '',
  };
}

export function FormBuilderPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('survey');
  const [deadline, setDeadline] = useState('');
  const [fields, setFields] = useState<FieldDraft[]>([newField(0)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateField = (key: string, patch: Partial<FieldDraft>) => {
    setFields((prev) => prev.map((f) => (f._key === key ? { ...f, ...patch } : f)));
  };

  const addOption = (key: string, opt: string) => {
    if (!opt.trim()) return;
    setFields((prev) =>
      prev.map((f) =>
        f._key === key ? { ...f, options: [...f.options, opt.trim()], _optionInput: '' } : f
      )
    );
  };

  const removeOption = (key: string, idx: number) => {
    setFields((prev) =>
      prev.map((f) =>
        f._key === key ? { ...f, options: f.options.filter((_, i) => i !== idx) } : f
      )
    );
  };

  const removeField = (key: string) => {
    setFields((prev) => prev.filter((f) => f._key !== key).map((f, i) => ({ ...f, position: i })));
  };

  const handlePublish = async (status: 'draft' | 'published') => {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const { data } = await createForm({
        title,
        description: description || undefined,
        type,
        target_roles: [],
        deadline: deadline || undefined,
        fields: fields.map(({ _key, _optionInput, ...f }) => f),
      });
      if (status === 'published') {
        await updateFormApi(data.id, { status: 'published' });
      }
      navigate('/forms');
    } catch {
      setError('Failed to save form. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('createForm', 'Create Form')}</h1>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <div className="flex flex-col gap-4 mb-8">
        <div>
          <label className="text-sm font-medium block mb-1">{t('title', 'Title')} *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Form title" />
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
            <label className="text-sm font-medium block mb-1">{t('type', 'Type')}</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {['survey', 'consent', 'info'].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium block mb-1">{t('deadline', 'Deadline')}</label>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">{t('fields', 'Fields')}</h2>
      <div className="flex flex-col gap-4 mb-6">
        {fields.map((field, idx) => (
          <div key={field._key} className="border rounded-md p-4 bg-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">Field {idx + 1}</span>
              <button
                className="text-xs text-red-500 hover:underline"
                onClick={() => removeField(field._key)}
              >
                Remove
              </button>
            </div>
            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <Input
                  placeholder="Field label"
                  value={field.label}
                  onChange={(e) => updateField(field._key, { label: e.target.value })}
                />
              </div>
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={field.field_type}
                onChange={(e) => updateField(field._key, { field_type: e.target.value })}
              >
                {FIELD_TYPES.map((ft) => (
                  <option key={ft} value={ft}>{ft}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm mb-2">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(field._key, { required: e.target.checked })}
              />
              Required
            </label>
            {['radio', 'select', 'checkbox'].includes(field.field_type) && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Options</p>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add option"
                    value={field._optionInput}
                    onChange={(e) => updateField(field._key, { _optionInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addOption(field._key, field._optionInput); }
                    }}
                  />
                  <Button variant="secondary" size="sm" onClick={() => addOption(field._key, field._optionInput)}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {field.options.map((opt, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs bg-muted rounded px-2 py-0.5">
                      {opt}
                      <button onClick={() => removeOption(field._key, i)} className="text-muted-foreground hover:text-foreground">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        <Button
          variant="secondary"
          onClick={() => setFields((prev) => [...prev, newField(prev.length)])}
        >
          + {t('addField', 'Add Field')}
        </Button>
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={() => handlePublish('draft')} disabled={saving}>
          {t('saveDraft', 'Save Draft')}
        </Button>
        <Button variant="primary" onClick={() => handlePublish('published')} disabled={saving}>
          {t('publish', 'Publish')}
        </Button>
      </div>
    </div>
  );
}
