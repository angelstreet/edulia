import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { getServices, createService, subscribeService, type ServiceData } from '../../../api/wallet';

const CATEGORIES = ['cantine', 'garderie', 'etude', 'sortie', 'other'];
const PERIODS = ['daily', 'weekly', 'monthly', 'per_event'];

function formatCents(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function ServicesPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const isAdmin = user?.role === 'admin';
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState<ServiceData | null>(null);
  const [studentId, setStudentId] = useState('');
  const [form, setForm] = useState({ name: '', category: 'cantine', unit_price_cents: '', billing_period: 'daily' });
  const [saving, setSaving] = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getServices();
      setServices(Array.isArray(data) ? data : []);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

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
      fetchServices();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleSubscribe = async () => {
    if (!showSubscribe || !studentId) return;
    setSaving(true);
    try {
      await subscribeService(showSubscribe.id, studentId);
      setShowSubscribe(null);
      setStudentId('');
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('services', 'Services')}</h1>
        {isAdmin && (
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            + {t('addService', 'Add Service')}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : services.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">{t('noServices', 'No services available.')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc) => (
            <div key={svc.id} className="border rounded-md p-4 bg-card flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{svc.name}</h3>
                <Badge variant="info">{svc.category}</Badge>
              </div>
              <p className="text-lg font-bold">{formatCents(svc.unit_price_cents)}</p>
              <p className="text-xs text-muted-foreground">{svc.billing_period}</p>
              {!isAdmin && (
                <Button variant="secondary" size="sm" onClick={() => setShowSubscribe(svc)}>
                  {t('subscribe', 'Subscribe')}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Admin: create service */}
      {showCreate && (
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
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium block mb-1">{t('billingPeriod', 'Billing Period')}</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.billing_period}
                  onChange={(e) => setForm((f) => ({ ...f, billing_period: e.target.value }))}
                >
                  {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">{t('price', 'Price')} (€) *</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="5.00"
                value={form.unit_price_cents}
                onChange={(e) => setForm((f) => ({ ...f, unit_price_cents: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>{t('cancel', 'Cancel')}</Button>
              <Button variant="primary" onClick={handleCreate} disabled={saving}>{t('create', 'Create')}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Parent: subscribe */}
      {showSubscribe && (
        <Modal open={!!showSubscribe} title={`${t('subscribe', 'Subscribe')} — ${showSubscribe.name}`} onClose={() => setShowSubscribe(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {formatCents(showSubscribe.unit_price_cents)} / {showSubscribe.billing_period}
            </p>
            <div>
              <label className="text-sm font-medium block mb-1">{t('studentId', 'Student ID')} *</label>
              <Input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter student UUID"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowSubscribe(null)}>{t('cancel', 'Cancel')}</Button>
              <Button variant="primary" onClick={handleSubscribe} disabled={saving || !studentId}>
                {t('confirm', 'Confirm')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
