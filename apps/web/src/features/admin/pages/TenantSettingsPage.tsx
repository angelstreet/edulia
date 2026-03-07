import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Spinner } from '../../../components/ui/Spinner';
import { getSettings, updateSettings, type TenantSettings } from '../../../api/tenant';

const ALL_MODULES = [
  'timetable', 'attendance', 'gradebook', 'homework', 'quiz',
  'messaging', 'notifications', 'files', 'billing', 'enrollment',
  'tutoring', 'report_cards', 'calendar', 'school_life', 'audit',
];

export function TenantSettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getSettings();
        setSettings(data);
      } catch {
        // Use defaults
        setSettings({
          timezone: 'Europe/Paris',
          locale: 'fr',
          currency: 'EUR',
          enabled_modules: ALL_MODULES,
          academic_structure: 'trimester',
          grading_scale: 20,
          grading_type: 'numeric',
          show_rank: true,
          show_class_average: true,
          attendance_mode: 'per_session',
          file_upload_max_mb: 50,
          data_retention_years: 3,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleModule = (mod: string) => {
    if (!settings) return;
    const current = settings.enabled_modules ?? [];
    const enabled = current.includes(mod)
      ? current.filter((m) => m !== mod)
      : [...current, mod];
    setSettings({ ...settings, enabled_modules: enabled });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!settings) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('tenantSettings', 'Tenant Settings')}</h1>
        <Button variant="primary" loading={saving} onClick={handleSave}>
          {saved ? t('saved', 'Saved!') : t('save')}
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        <Card title={t('modules', 'Modules')}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {ALL_MODULES.map((mod) => (
              <label key={mod} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(settings.enabled_modules ?? []).includes(mod)}
                  onChange={() => toggleModule(mod)}
                  className="h-4 w-4 accent-primary"
                />
                <span>{mod.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card title={t('gradingSettings', 'Grading')}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('gradingScale', 'Grading scale')}</label>
              <select className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none" value={settings.grading_scale} onChange={(e) => setSettings({ ...settings, grading_scale: Number(e.target.value) })}>
                <option value={20}>/ 20</option>
                <option value={100}>/ 100</option>
                <option value={10}>/ 10</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('academicStructure', 'Structure')}</label>
              <select className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none" value={settings.academic_structure} onChange={(e) => setSettings({ ...settings, academic_structure: e.target.value })}>
                <option value="trimester">{t('trimester', 'Trimester')}</option>
                <option value="semester">{t('semester', 'Semester')}</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title={t('attendanceSettings', 'Attendance')}>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t('attendanceMode', 'Mode')}</label>
            <select className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none" value={settings.attendance_mode} onChange={(e) => setSettings({ ...settings, attendance_mode: e.target.value })}>
              <option value="per_session">{t('perSession', 'Per session')}</option>
              <option value="per_day">{t('perDay', 'Per day')}</option>
            </select>
          </div>
        </Card>

        <Card title={t('general', 'General')}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('timezone', 'Timezone')}</label>
              <select className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none" value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Africa/Dakar">Africa/Dakar</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('locale', 'Locale')}</label>
              <select className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none" value={settings.locale} onChange={(e) => setSettings({ ...settings, locale: e.target.value })}>
                <option value="fr">Francais</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title={t('billingInfo', 'Billing / Invoice info')}>
          <p className="text-xs text-muted-foreground mb-3">{t('billingInfoDesc', 'This information appears on all invoices generated from /billing.')}</p>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">SIRET</label>
                <input className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none" value={settings.siret ?? ''} onChange={e => setSettings({ ...settings, siret: e.target.value })} placeholder="781 118 716 00013" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">N° ICS</label>
                <input className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none" value={settings.ics ?? ''} onChange={e => setSettings({ ...settings, ics: e.target.value })} placeholder="FR76ZZZ404070" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('schoolAddress', 'School address (for invoice header)')}</label>
              <textarea rows={2} className="rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs outline-none resize-none" value={settings.school_address ?? ''} onChange={e => setSettings({ ...settings, school_address: e.target.value })} placeholder={"31 Rue Blaise Pascal\n76100 Rouen"} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('schoolPhone', 'School phone')}</label>
              <input className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none" value={settings.school_phone ?? ''} onChange={e => setSettings({ ...settings, school_phone: e.target.value })} placeholder="01 23 45 67 89" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('defaultBankAccount', 'Default IBAN (for direct debit info)')}</label>
              <input className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none" value={settings.default_bank_account ?? ''} onChange={e => setSettings({ ...settings, default_bank_account: e.target.value })} placeholder="FR76 1234 5678 9012 3456 7890 123" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t('defaultContactInfo', 'Default contact note (invoice footer)')}</label>
              <textarea rows={2} className="rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs outline-none resize-none" value={settings.default_contact_info ?? ''} onChange={e => setSettings({ ...settings, default_contact_info: e.target.value })} placeholder="En cas de questions, veuillez contacter…" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
