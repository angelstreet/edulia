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
import { getHomework, createHomework, type HomeworkData } from '../../../api/homework';
import { useCurrentUser } from '../../../hooks/useCurrentUser';

export function HomeworkPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [groups, setGroups] = useState<GroupData[]>([]);
  const [homeworkList, setHomeworkList] = useState<HomeworkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssignedDate, setNewAssignedDate] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newAllowSubmission, setNewAllowSubmission] = useState(false);

  useEffect(() => {
    getGroups().then(({ data }) => {
      const list = Array.isArray(data) ? data : data.data || [];
      setGroups(list);
    }).catch(() => setGroups([]));
  }, []);

  const fetchHomework = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedGroupId) params.group_id = selectedGroupId;
      const { data } = await getHomework(params);
      setHomeworkList(Array.isArray(data) ? data : []);
    } catch {
      setHomeworkList([]);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => { fetchHomework(); }, [fetchHomework]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !selectedGroupId || !newAssignedDate || !newDueDate) return;
    setSaving(true);
    try {
      await createHomework({
        subject_id: selectedGroupId, // placeholder — teacher would select subject
        group_id: selectedGroupId,
        title: newTitle,
        description: newDescription || undefined,
        assigned_date: newAssignedDate,
        due_date: newDueDate,
        allow_submission: newAllowSubmission,
      });
      setShowForm(false);
      setNewTitle('');
      setNewDescription('');
      setNewAssignedDate('');
      setNewDueDate('');
      setNewAllowSubmission(false);
      fetchHomework();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const isPastDue = (dueDate: string) => new Date(dueDate) < new Date();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('homework', 'Homework')}</h1>
        {isTeacher && (
          <Button variant="primary" onClick={() => setShowForm(true)} disabled={!selectedGroupId}>
            + {t('newHomework', 'New Homework')}
          </Button>
        )}
      </div>

      {isTeacher && (
        <div className="flex gap-4 mb-6">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('class', 'Class')}</label>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <option value="">{t('allClasses', 'All classes')}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : homeworkList.length === 0 ? (
        <EmptyState title={t('noHomework', 'No homework yet')} description={t('noHomeworkDesc', 'Homework assignments will appear here.')} />
      ) : (
        <div className="flex flex-col gap-2">
          {homeworkList.map((hw) => (
            <div
              key={hw.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-card cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/homework/${hw.id}`)}
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium">{hw.title}</span>
                <span className="text-sm text-muted-foreground">
                  {t('due', 'Due')}: {hw.due_date}
                  {hw.description && ` — ${hw.description.slice(0, 80)}${hw.description.length > 80 ? '...' : ''}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isPastDue(hw.due_date) ? (
                  <Badge variant="danger">{t('pastDue', 'Past due')}</Badge>
                ) : (
                  <Badge variant="success">{t('upcoming', 'Upcoming')}</Badge>
                )}
                {hw.allow_submission && (
                  <Badge variant="info">{t('submissionEnabled', 'Online')}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('newHomework', 'New Homework')}>
        <div className="flex flex-col gap-3">
          <Input id="hwTitle" label={t('title', 'Title')} value={newTitle} onChange={(e) => setNewTitle(e.currentTarget.value)} required />
          <Input id="hwDesc" label={t('description', 'Description')} value={newDescription} onChange={(e) => setNewDescription(e.currentTarget.value)} />
          <Input id="hwAssigned" label={t('assignedDate', 'Assigned Date')} type="date" value={newAssignedDate} onChange={(e) => setNewAssignedDate(e.currentTarget.value)} required />
          <Input id="hwDue" label={t('dueDate', 'Due Date')} type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.currentTarget.value)} required />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="allowSub" checked={newAllowSubmission} onChange={(e) => setNewAllowSubmission(e.target.checked)} />
            <label htmlFor="allowSub" className="text-sm">{t('allowOnlineSubmission', 'Allow online submission')}</label>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="secondary" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
            <Button variant="primary" loading={saving} onClick={handleCreate}>{t('save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
