import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { getGroups, createGroup, deleteGroup, getGroup, type GroupData, type GroupMember } from '../../../api/groups';

export function ClassesPage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('class');
  const [parentId, setParentId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<(GroupData & { members: GroupMember[] }) | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getGroups();
      setGroups(Array.isArray(data) ? data : data.data || []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createGroup({ name: newName, type: newType, parent_id: parentId || undefined });
      setShowForm(false);
      setNewName('');
      setParentId(null);
      fetchGroups();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGroup(id);
      fetchGroups();
      if (selectedGroup?.id === id) setSelectedGroup(null);
    } catch { /* ignore */ }
  };

  const handleSelect = async (g: GroupData) => {
    try {
      const { data } = await getGroup(g.id);
      setSelectedGroup(data);
    } catch {
      setSelectedGroup({ ...g, members: [] });
    }
  };

  // Build tree: levels (no parent) -> classes under them
  const levels = groups.filter((g) => !g.parent_id);
  const childrenOf = (id: string) => groups.filter((g) => g.parent_id === id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('classes')}</h1>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          + {t('addClass', 'Add class')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : groups.length === 0 ? (
        <EmptyState title={t('noClasses', 'No classes yet')} description={t('noClassesDesc', 'Create your first class to get started.')} />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex flex-col gap-1 flex-1">
            {levels.map((level) => (
              <div key={level.id}>
                <div
                  className="flex items-center gap-2 p-3 border rounded-md bg-card cursor-pointer hover:bg-muted/50 text-sm"
                  onClick={() => handleSelect(level)}
                >
                  <strong>{level.name}</strong>
                  <Badge variant="info">{level.type}</Badge>
                  <span className="text-xs text-muted-foreground">{level.member_count} {t('members', 'members')}</span>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(level.id); }}>
                    {t('delete', 'Delete')}
                  </Button>
                </div>
                <div className="ml-6 flex flex-col gap-1 mt-1">
                  {childrenOf(level.id).map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center gap-2 p-3 border rounded-md bg-card cursor-pointer hover:bg-muted/50 text-sm"
                      onClick={() => handleSelect(child)}
                    >
                      <span>{child.name}</span>
                      <span className="text-xs text-muted-foreground">{child.member_count} {t('members', 'members')}</span>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(child.id); }}>
                        {t('delete', 'Delete')}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {groups.filter((g) => !g.parent_id && g.type === 'class' && !levels.some((l) => l.id === g.id)).map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-2 p-3 border rounded-md bg-card cursor-pointer hover:bg-muted/50 text-sm"
                onClick={() => handleSelect(g)}
              >
                <span>{g.name}</span>
                <span className="text-xs text-muted-foreground">{g.member_count}</span>
              </div>
            ))}
          </div>

          {selectedGroup && (
            <div className="flex-1 border rounded-lg p-4 bg-card">
              <h2 className="text-lg font-semibold mb-1">{selectedGroup.name}</h2>
              <p className="text-sm text-muted-foreground mb-4">{selectedGroup.members.length} {t('members', 'members')}</p>
              <div className="flex flex-col gap-2">
                {selectedGroup.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('noMembers', 'No members yet.')}</p>
                ) : (
                  selectedGroup.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                      <span>{m.display_name}</span>
                      <Badge variant="default">{m.role}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('addClass', 'Add class')}>
        <div className="flex flex-col gap-3">
          <Input id="className" label={t('name', 'Name')} value={newName} onChange={(e) => setNewName(e.currentTarget.value)} required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('type', 'Type')}</label>
            <select className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none" value={newType} onChange={(e) => setNewType(e.target.value)}>
              <option value="class">{t('classType', 'Class')}</option>
              <option value="section">{t('section', 'Section')}</option>
              <option value="cohort">{t('cohort', 'Cohort')}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('parentGroup', 'Parent group')}</label>
            <select className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none" value={parentId || ''} onChange={(e) => setParentId(e.target.value || null)}>
              <option value="">{t('none', 'None')}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
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
