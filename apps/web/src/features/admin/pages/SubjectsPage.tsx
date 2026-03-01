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
    <div className="admin-subjects-page">
      <div className="page-header">
        <h1>{t('subjects')}</h1>
        <Button variant="primary" onClick={openCreate}>+ {t('addSubject', 'Add subject')}</Button>
      </div>

      {loading ? (
        <div className="page-center"><Spinner /></div>
      ) : subjects.length === 0 ? (
        <EmptyState title={t('noSubjects', 'No subjects yet')} description={t('noSubjectsDesc', 'Create your first subject.')} />
      ) : (
        <div className="subjects-grid">
          {subjects.map((s) => (
            <div key={s.id} className="subject-card" onClick={() => openEdit(s)}>
              <span className="subject-color-chip" style={{ background: s.color }} />
              <div className="subject-info">
                <strong>{s.name}</strong>
                <span className="text-muted">{s.code}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}>
                {t('delete', 'Delete')}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editSubject ? t('editSubject', 'Edit subject') : t('addSubject', 'Add subject')}>
        <div className="user-form">
          <Input id="subjectCode" label={t('code', 'Code')} value={code} onChange={(e) => setCode(e.currentTarget.value)} required placeholder="MATH" />
          <Input id="subjectName" label={t('name', 'Name')} value={name} onChange={(e) => setName(e.currentTarget.value)} required />
          <div className="form-group">
            <label>{t('color', 'Color')}</label>
            <div className="color-picker-row">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              <span className="text-muted">{color}</span>
            </div>
          </div>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>{t('save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
