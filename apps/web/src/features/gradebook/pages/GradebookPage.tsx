import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { getGroups, type GroupData } from '../../../api/groups';
import { getAssessments, createAssessment, type AssessmentData } from '../../../api/gradebook';

export function GradebookPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [assessments, setAssessments] = useState<AssessmentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedSubjectId] = useState('');
  const [selectedTermId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newMaxScore, setNewMaxScore] = useState('20');
  const [newCoefficient, setNewCoefficient] = useState('1');

  useEffect(() => {
    getGroups().then(({ data }) => {
      const list = Array.isArray(data) ? data : data.data || [];
      setGroups(list);
    }).catch(() => setGroups([]));
  }, []);

  const fetchAssessments = useCallback(async () => {
    if (!selectedGroupId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { group_id: selectedGroupId };
      if (selectedSubjectId) params.subject_id = selectedSubjectId;
      if (selectedTermId) params.term_id = selectedTermId;
      const { data } = await getAssessments(params);
      setAssessments(Array.isArray(data) ? data : []);
    } catch {
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId, selectedSubjectId, selectedTermId]);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !selectedGroupId || !newDate) return;
    setSaving(true);
    try {
      await createAssessment({
        subject_id: selectedSubjectId,
        group_id: selectedGroupId,
        term_id: selectedTermId,
        title: newTitle,
        date: newDate,
        max_score: parseFloat(newMaxScore) || 20,
        coefficient: parseFloat(newCoefficient) || 1,
      });
      setShowForm(false);
      setNewTitle('');
      setNewDate('');
      setNewMaxScore('20');
      setNewCoefficient('1');
      fetchAssessments();
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('gradebook', 'Gradebook')}</h1>
        <Button variant="primary" onClick={() => setShowForm(true)} disabled={!selectedGroupId}>
          + {t('newAssessment', 'New Assessment')}
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">{t('class', 'Class')}</label>
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="">{t('selectClass', 'Select a class...')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !selectedGroupId ? (
        <EmptyState title={t('selectClassFirst', 'Select a class')} description={t('selectClassDesc', 'Choose a class to see its assessments.')} />
      ) : assessments.length === 0 ? (
        <EmptyState title={t('noAssessments', 'No assessments yet')} description={t('noAssessmentsDesc', 'Create your first assessment to start grading.')} />
      ) : (
        <div className="flex flex-col gap-2">
          {assessments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-card cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/gradebook/${a.id}`)}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.title}</span>
                  {a.source_activity_id && (
                    <Badge variant="default">{t('qcmBadge', 'QCM')}</Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {a.date} &middot; /{a.max_score} &middot; {t('coeff', 'Coeff')} {a.coefficient}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={a.is_published ? 'success' : 'default'}>
                  {a.is_published ? t('published', 'Published') : t('draft', 'Draft')}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('newAssessment', 'New Assessment')}>
        <div className="flex flex-col gap-3">
          <Input id="title" label={t('title', 'Title')} value={newTitle} onChange={(e) => setNewTitle(e.currentTarget.value)} required />
          <Input id="date" label={t('date', 'Date')} type="date" value={newDate} onChange={(e) => setNewDate(e.currentTarget.value)} required />
          <Input id="maxScore" label={t('maxScore', 'Max Score')} type="number" value={newMaxScore} onChange={(e) => setNewMaxScore(e.currentTarget.value)} />
          <Input id="coefficient" label={t('coefficient', 'Coefficient')} type="number" value={newCoefficient} onChange={(e) => setNewCoefficient(e.currentTarget.value)} />
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="secondary" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
            <Button variant="primary" loading={saving} onClick={handleCreate}>{t('save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
