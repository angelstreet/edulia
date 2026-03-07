import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Spinner } from '../../../components/ui/Spinner';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { getEvents, createEvent, deleteEvent, type CalendarEvent } from '../../../api/calendar';

const EVENT_TYPES = ['general', 'holiday', 'exam', 'meeting', 'trip'];
const TYPE_COLORS: Record<string, string> = {
  general: 'bg-blue-100 text-blue-800',
  holiday: 'bg-green-100 text-green-800',
  exam: 'bg-red-100 text-red-800',
  meeting: 'bg-purple-100 text-purple-800',
  trip: 'bg-yellow-100 text-yellow-800',
};
const TYPE_DOT: Record<string, string> = {
  general: 'bg-blue-500',
  holiday: 'bg-green-500',
  exam: 'bg-red-500',
  meeting: 'bg-purple-500',
  trip: 'bg-yellow-500',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function groupByMonth(events: CalendarEvent[]) {
  const groups: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    const key = new Date(ev.start_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
  }
  return groups;
}

export function CalendarPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const isAdmin = user?.role === 'admin';

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_at: '',
    end_at: '',
    event_type: 'general',
  });
  const [saving, setSaving] = useState(false);
  const today = new Date();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEvents();
      const sorted = (Array.isArray(res.data) ? res.data : []).sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      );
      setEvents(sorted);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCreate = async () => {
    if (!form.title || !form.start_at) return;
    setSaving(true);
    try {
      await createEvent({
        title: form.title,
        description: form.description || undefined,
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at ? new Date(form.end_at).toISOString() : undefined,
        event_type: form.event_type,
      });
      setShowCreate(false);
      setForm({ title: '', description: '', start_at: '', end_at: '', event_type: 'general' });
      fetchEvents();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteEvent(id);
      fetchEvents();
    } catch { /* ignore */ }
    setDeleting(null);
  };

  const upcoming = events.filter((e) => new Date(e.start_at) >= today);
  const past = events.filter((e) => new Date(e.start_at) < today && !isSameDay(new Date(e.start_at), today));
  const todayEvents = events.filter((e) => isSameDay(new Date(e.start_at), today));

  const grouped = groupByMonth(upcoming);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('calendar', 'Calendar')}</h1>
        {isAdmin && (
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            + {t('addEvent', 'Add Event')}
          </Button>
        )}
      </div>

      {/* Today banner */}
      {todayEvents.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
          <p className="text-sm font-semibold text-primary mb-2">
            {t('today', 'Today')} — {today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <div className="flex flex-col gap-1">
            {todayEvents.map((ev) => (
              <div key={ev.id} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[ev.event_type] ?? 'bg-gray-400'}`} />
                <span className="text-sm font-medium">{ev.title}</span>
                <span className="text-xs text-muted-foreground">{formatTime(ev.start_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : upcoming.length === 0 && todayEvents.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          {t('noEvents', 'No upcoming events.')}
        </p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, evs]) => (
            <div key={month}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 capitalize">
                {month}
              </h2>
              <div className="flex flex-col gap-2">
                {evs.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-4 p-3 border rounded-lg bg-card hover:bg-muted/20 transition-colors"
                  >
                    <div className="w-12 text-center shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {new Date(ev.start_at).toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </p>
                      <p className="text-lg font-bold leading-none">
                        {new Date(ev.start_at).getDate()}
                      </p>
                    </div>
                    <div className={`w-1 self-stretch rounded-full ${TYPE_DOT[ev.event_type] ?? 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{ev.title}</p>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground truncate">{ev.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDate(ev.start_at)}
                        {ev.end_at && ev.end_at !== ev.start_at && ` → ${formatDate(ev.end_at)}`}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[ev.event_type] ?? 'bg-gray-100'}`}>
                      {ev.event_type}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(ev.id)}
                        disabled={deleting === ev.id}
                        className="text-xs text-red-500 hover:underline disabled:opacity-50 shrink-0"
                      >
                        {deleting === ev.id ? '…' : t('delete', 'Delete')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past events collapsible */}
      {past.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">›</span>
            {t('pastEvents', 'Past events')} ({past.length})
          </summary>
          <div className="flex flex-col gap-2 mt-2 opacity-60">
            {past.slice(-10).reverse().map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 p-2 border rounded-md bg-card text-sm">
                <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[ev.event_type] ?? 'bg-gray-300'}`} />
                <span className="flex-1 truncate">{ev.title}</span>
                <span className="text-xs text-muted-foreground">{formatDate(ev.start_at)}</span>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(ev.id)}
                    disabled={deleting === ev.id}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    {deleting === ev.id ? '…' : t('delete', 'Delete')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Create event modal */}
      <Modal open={showCreate} title={t('addEvent', 'Add Event')} onClose={() => setShowCreate(false)}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">{t('title', 'Title')} *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Réunion parents-professeurs"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">{t('description', 'Description')}</label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium block mb-1">{t('startDate', 'Start')} *</label>
              <Input
                type="datetime-local"
                value={form.start_at}
                onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium block mb-1">{t('endDate', 'End')}</label>
              <Input
                type="datetime-local"
                value={form.end_at}
                onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">{t('type', 'Type')}</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={form.event_type}
              onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>{t('cancel', 'Cancel')}</Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={saving || !form.title || !form.start_at}
            >
              {saving ? t('saving', 'Saving...') : t('create', 'Create')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
