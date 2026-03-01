import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { getSubjects, createSubject, updateSubject, deleteSubject, type SubjectData } from '../../../api/subjects';

export function SubjectsPage() {
  const { t } = useTranslation();
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSubject, setEditSubject] = useState<SubjectData | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#4A90D9');
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getSubjects();
      setSubjects(data.data);
    } catch {
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => {
    setEditSubject(null);
    setCode(''); setName(''); setColor('#4A90D9');
    setShowForm(true);
  };

  const openEdit = (s: SubjectData) => {
    setEditSubject(s);
    setCode(s.code); setName(s.name); setColor(s.color);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editSubject) {
        await updateSubject(editSubject.id, { code, name, color });
      } else {
        await createSubject({ code, name, color });
      }
      setShowForm(false);
      fetch();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try { await deleteSubject(id); fetch(); } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('subjects')}</h1>
        <Button variant="primary" onClick={openCreate}>+ {t('addSubject', 'Add subject')}</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : subjects.length === 0 ? (
        <EmptyState title={t('noSubjects', 'No subjects yet')} description={t('noSubjectsDesc', 'Create your first subject.')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {subjects.map((s) => (
            <div
              key={s.id}
              className="border rounded-lg p-4 bg-card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openEdit(s)}
            >
              <span className="block w-8 h-8 rounded-md mb-2" style={{ background: s.color }} />
              <div className="flex flex-col gap-1">
                <strong className="text-sm">{s.name}</strong>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{s.code}</span>
              </div>
              <div className="mt-3">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}>
                  {t('delete', 'Delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editSubject ? t('editSubject', 'Edit subject') : t('addSubject', 'Add subject')}>
        <div className="flex flex-col gap-3">
          <Input id="subjectCode" label={t('code', 'Code')} value={code} onChange={(e) => setCode(e.currentTarget.value)} required placeholder="MATH" />
          <Input id="subjectName" label={t('name', 'Name')} value={name} onChange={(e) => setName(e.currentTarget.value)} required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('color', 'Color')}</label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              <span className="text-xs text-muted-foreground">{color}</span>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="secondary" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>{t('save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
