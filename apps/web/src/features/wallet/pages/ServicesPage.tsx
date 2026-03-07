import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import {
  getServices, createService, subscribeService, getSubscriptions, cancelSubscription,
  type ServiceData, type SubscriptionData,
} from '../../../api/wallet';
import { getDashboardStats } from '../../../api/dashboard';
import { getDirectory } from '../../../api/community';

const CATEGORIES = ['cantine', 'garderie', 'etude', 'sortie', 'other'];
const PERIODS = ['daily', 'weekly', 'monthly', 'per_event'];

function formatCents(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

interface Child { id: string; name: string; }

export function ServicesPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const isAdmin = user?.role === 'admin';
  const isParent = user?.role === 'parent';

  const [services, setServices] = useState<ServiceData[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [children, setChildren] = useState<Child[]>([]);          // for parent role
  const [students, setStudents] = useState<Child[]>([]);          // for admin role
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState<ServiceData | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [form, setForm] = useState({ name: '', category: 'cantine', unit_price_cents: '', billing_period: 'daily' });
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [svcRes, subRes] = await Promise.all([getServices(), getSubscriptions()]);
      setServices(Array.isArray(svcRes.data) ? svcRes.data : []);
      setSubscriptions(Array.isArray(subRes.data) ? subRes.data : []);

      if (isParent) {
        const { data: stats } = await getDashboardStats();
        setChildren(stats.children ?? []);
      } else if (isAdmin) {
        const { data: dir } = await getDirectory({ role: 'student' });
        const list = Array.isArray(dir) ? dir : [];
        setStudents(list.map((u) => ({ id: u.id, name: u.display_name })));
      }
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [isParent, isAdmin]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!form.name || !form.unit_price_cents) return;
    setSaving(true);
    try {
      await createService({
        name: form.name,
        category: form.category,
        unit_price_cents: Math.round(parseFloat(form.unit_price_cents) * 100),
        billing_period: form.billing_period,
      });
      setShowCreate(false);
      setForm({ name: '', category: 'cantine', unit_price_cents: '', billing_period: 'daily' });
      fetchAll();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleSubscribe = async () => {
    if (!showSubscribe || !selectedStudentId) return;
    setSaving(true);
    try {
      await subscribeService(showSubscribe.id, selectedStudentId);
      setShowSubscribe(null);
      setSelectedStudentId('');
      fetchAll();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleCancel = async (subscriptionId: string) => {
    setCancelling(subscriptionId);
    try {
      await cancelSubscription(subscriptionId);
      fetchAll();
    } catch { /* ignore */ }
    setCancelling(null);
  };

  // Build lookup maps
  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));
  const studentOptions = isParent ? children : students;

  // Group subscriptions by student for display
  const studentMap = Object.fromEntries(studentOptions.map((c) => [c.id, c.name]));

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-8">
      {/* ── Service catalog ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{t('services', 'Services')}</h1>
          {isAdmin && (
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              + {t('addService', 'Add Service')}
            </Button>
          )}
        </div>

        {services.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">{t('noServices', 'No services available.')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((svc) => {
              const alreadySubscribed = subscriptions.some((s) => s.service_id === svc.id);
              return (
                <div key={svc.id} className="border rounded-xl p-4 bg-card flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{svc.name}</h3>
                    <Badge variant="info">{svc.category}</Badge>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{formatCents(svc.unit_price_cents)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{svc.billing_period}</p>
                  </div>
                  {!isAdmin && (
                    <Button
                      variant={alreadySubscribed ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => { setShowSubscribe(svc); setSelectedStudentId(studentOptions[0]?.id ?? ''); }}
                    >
                      {alreadySubscribed ? t('subscribeAnother', 'Subscribe another') : t('subscribe', 'Subscribe')}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Active subscriptions ── */}
      {subscriptions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{t('activeSubscriptions', 'Active Subscriptions')}</h2>
          <div className="flex flex-col gap-2">
            {subscriptions.map((sub) => {
              const svc = serviceMap[sub.service_id];
              const studentName = studentMap[sub.student_id] ?? sub.student_id.slice(0, 8) + '…';
              return (
                <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg bg-card gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{svc?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {studentName} · {svc ? formatCents(svc.unit_price_cents) : '—'}/{svc?.billing_period}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="success">{sub.status}</Badge>
                    <button
                      onClick={() => handleCancel(sub.id)}
                      disabled={cancelling === sub.id}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      {cancelling === sub.id ? '…' : t('cancel', 'Cancel')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin: create service modal */}
      <Modal open={showCreate} title={t('addService', 'Add Service')} onClose={() => setShowCreate(false)}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">{t('name', 'Name')} *</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Service name" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium block mb-1">{t('category', 'Category')}</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium block mb-1">{t('billingPeriod', 'Billing Period')}</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.billing_period}
                onChange={(e) => setForm((f) => ({ ...f, billing_period: e.target.value }))}
              >
                {PERIODS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">{t('price', 'Price')} (€) *</label>
            <Input type="number" min="0" step="0.01" placeholder="5.00" value={form.unit_price_cents}
              onChange={(e) => setForm((f) => ({ ...f, unit_price_cents: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>{t('cancel')}</Button>
            <Button variant="primary" onClick={handleCreate} loading={saving}>{t('create', 'Create')}</Button>
          </div>
        </div>
      </Modal>

      {/* Subscribe modal */}
      {showSubscribe && (
        <Modal open={!!showSubscribe} title={`${t('subscribe', 'Subscribe')} — ${showSubscribe.name}`} onClose={() => setShowSubscribe(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {formatCents(showSubscribe.unit_price_cents)} / {showSubscribe.billing_period}
            </p>
            <div>
              <label className="text-sm font-medium block mb-1">
                {isParent ? t('child', 'Child') : t('student', 'Student')} *
              </label>
              {studentOptions.length > 0 ? (
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                >
                  <option value="">{t('selectStudent', 'Select…')}</option>
                  {studentOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted-foreground">{t('noStudentsFound', 'No students found.')}</p>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowSubscribe(null)}>{t('cancel')}</Button>
              <Button variant="primary" onClick={handleSubscribe} loading={saving} disabled={!selectedStudentId}>
                {t('confirm', 'Confirm')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
