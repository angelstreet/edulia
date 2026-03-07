import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Spinner } from '../../../components/ui/Spinner';
import { Badge } from '../../../components/ui/Badge';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { getIncidents, createIncident, updateIncident, type Incident } from '../../../api/schoolLife';
import { getDirectory } from '../../../api/community';

const INCIDENT_TYPES = ['behavior', 'absence', 'late', 'health', 'other'];
const SEVERITIES = ['low', 'medium', 'high'];
const SEVERITY_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  low: 'info',
  medium: 'warning',
  high: 'danger',
};

interface StudentOption { id: string; name: string; }

export function SchoolLifePage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const canCreate = isAdmin || isTeacher;

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionText, setActionText] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    student_id: '',
    incident_type: 'behavior',
    severity: 'low',
    description: '',
    action_taken: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [incRes] = await Promise.all([getIncidents()]);
      setIncidents(Array.isArray(incRes.data) ? incRes.data : []);
      if (canCreate) {
        const dirRes = await getDirectory({ role: 'student' });
        const list = Array.isArray(dirRes.data) ? dirRes.data : [];
        setStudents(list.map((u) => ({ id: u.id, name: u.display_name })));
      }
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [canCreate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const studentMap = Object.fromEntries(students.map((s) => [s.id, s.name]));

  const handleCreate = async () => {
    if (!form.description || (!form.student_id && canCreate)) return;
    setSaving(true);
    try {
      await createIncident({
        student_id: form.student_id,
        incident_type: form.incident_type,
        severity: form.severity,
        description: form.description,
        action_taken: form.action_taken || undefined,
      });
      setShowCreate(false);
      setForm({ student_id: '', incident_type: 'behavior', severity: 'low', description: '', action_taken: '' });
      fetchData();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleResolve = async (id: string) => {
    setSaving(true);
    try {
      await updateIncident(id, { status: 'resolved', action_taken: actionText || undefined });
      setEditingId(null);
      setActionText('');
      fetchData();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const open = incidents.filter((i) => i.status === 'open');
  const resolved = incidents.filter((i) => i.status !== 'open');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('schoolLife', 'School Life')}</h1>
        {canCreate && (
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            + {t('reportIncident', 'Report Incident')}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <>
          {/* Open incidents */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t('openIncidents', 'Open')} ({open.length})
            </h2>
            {open.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                {t('noIncidents', 'No open incidents.')}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {open.map((inc) => (
                  <div key={inc.id} className="border rounded-xl p-4 bg-card space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">
                          {studentMap[inc.student_id] ?? inc.student_id.slice(0, 8) + '…'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(inc.created_at).toLocaleDateString('fr-FR')} · {inc.incident_type}
                        </p>
                      </div>
                      <Badge variant={SEVERITY_VARIANT[inc.severity] ?? 'info'}>{inc.severity}</Badge>
                    </div>
                    <p className="text-sm">{inc.description}</p>
                    {inc.action_taken && (
                      <p className="text-xs text-muted-foreground italic">Action: {inc.action_taken}</p>
                    )}
                    {canCreate && (
                      editingId === inc.id ? (
                        <div className="flex flex-col gap-2 pt-1">
                          <textarea
                            rows={2}
                            className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                            placeholder={t('actionTaken', 'Action taken…')}
                            value={actionText}
                            onChange={(e) => setActionText(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button variant="primary" size="sm" onClick={() => handleResolve(inc.id)} disabled={saving}>
                              {t('markResolved', 'Mark Resolved')}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                              {t('cancel', 'Cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingId(inc.id); setActionText(inc.action_taken ?? ''); }}
                          className="text-xs text-primary hover:underline"
                        >
                          {t('resolve', 'Resolve')}
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resolved */}
          {resolved.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform inline-block">›</span>
                {t('resolved', 'Resolved')} ({resolved.length})
              </summary>
              <div className="flex flex-col gap-2 mt-2 opacity-60">
                {resolved.map((inc) => (
                  <div key={inc.id} className="border rounded-lg p-3 bg-card flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {studentMap[inc.student_id] ?? inc.student_id.slice(0, 8) + '…'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{inc.description}</p>
                    </div>
                    <Badge variant="success">{inc.status}</Badge>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {/* Create modal */}
      <Modal open={showCreate} title={t('reportIncident', 'Report Incident')} onClose={() => setShowCreate(false)}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">{t('student', 'Student')} *</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={form.student_id}
              onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
            >
              <option value="">{t('selectStudent', 'Select…')}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium block mb-1">{t('type', 'Type')}</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.incident_type}
                onChange={(e) => setForm((f) => ({ ...f, incident_type: e.target.value }))}
              >
                {INCIDENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium block mb-1">{t('severity', 'Severity')}</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">{t('description', 'Description')} *</label>
            <textarea
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe what happened…"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">{t('actionTaken', 'Action taken')}</label>
            <textarea
              rows={2}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
              value={form.action_taken}
              onChange={(e) => setForm((f) => ({ ...f, action_taken: e.target.value }))}
              placeholder="Optional initial action…"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>{t('cancel', 'Cancel')}</Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={saving || !form.description || !form.student_id}
            >
              {saving ? t('saving', 'Saving...') : t('report', 'Report')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
