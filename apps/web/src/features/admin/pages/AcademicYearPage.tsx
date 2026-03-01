import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { getAcademicYears, createAcademicYear, createTerm, type AcademicYearData } from '../../../api/academicYears';

export function AcademicYearPage() {
  const { t } = useTranslation();
  const [years, setYears] = useState<AcademicYearData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showYearForm, setShowYearForm] = useState(false);
  const [showTermForm, setShowTermForm] = useState<string | null>(null);
  const [yearName, setYearName] = useState('');
  const [yearStart, setYearStart] = useState('');
  const [yearEnd, setYearEnd] = useState('');
  const [termName, setTermName] = useState('');
  const [termStart, setTermStart] = useState('');
  const [termEnd, setTermEnd] = useState('');
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAcademicYears();
      setYears(data.data);
    } catch {
      setYears([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleCreateYear = async () => {
    setSaving(true);
    try {
      await createAcademicYear({ name: yearName, start_date: yearStart, end_date: yearEnd });
      setShowYearForm(false);
      setYearName(''); setYearStart(''); setYearEnd('');
      fetch();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleCreateTerm = async () => {
    if (!showTermForm) return;
    setSaving(true);
    try {
      const year = years.find((y) => y.id === showTermForm);
      const order = (year?.terms.length || 0) + 1;
      await createTerm(showTermForm, { name: termName, start_date: termStart, end_date: termEnd, order });
      setShowTermForm(null);
      setTermName(''); setTermStart(''); setTermEnd('');
      fetch();
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('academicYear', 'Academic Year')}</h1>
        <Button variant="primary" onClick={() => setShowYearForm(true)}>+ {t('addYear', 'Add year')}</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : years.length === 0 ? (
        <EmptyState title={t('noYears', 'No academic years')} description={t('noYearsDesc', 'Create an academic year to get started.')} />
      ) : (
        <div className="flex flex-col gap-4">
          {years.map((year) => (
            <div key={year.id} className="border rounded-xl bg-card shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold">{year.name}</h3>
                  {year.is_current && <Badge variant="success">{t('current', 'Current')}</Badge>}
                  <span className="text-sm text-muted-foreground">{year.start_date} -- {year.end_date}</span>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="flex gap-2 flex-wrap mb-3">
                  {year.terms.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('noTerms', 'No terms defined.')}</p>
                  ) : (
                    year.terms.sort((a, b) => a.order - b.order).map((term) => (
                      <div key={term.id} className="border rounded-md px-3 py-2 bg-muted/30 text-sm">
                        <div className="font-medium">{term.name}</div>
                        <div className="text-xs text-muted-foreground">{term.start_date} -- {term.end_date}</div>
                      </div>
                    ))
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowTermForm(year.id)}>
                  + {t('addTerm', 'Add term')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showYearForm} onClose={() => setShowYearForm(false)} title={t('addYear', 'Add year')}>
        <div className="flex flex-col gap-3">
          <Input id="yearName" label={t('name', 'Name')} value={yearName} onChange={(e) => setYearName(e.currentTarget.value)} placeholder="2025-2026" required />
          <Input id="yearStart" label={t('startDate', 'Start date')} type="date" value={yearStart} onChange={(e) => setYearStart(e.currentTarget.value)} required />
          <Input id="yearEnd" label={t('endDate', 'End date')} type="date" value={yearEnd} onChange={(e) => setYearEnd(e.currentTarget.value)} required />
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="secondary" onClick={() => setShowYearForm(false)}>{t('cancel')}</Button>
            <Button variant="primary" loading={saving} onClick={handleCreateYear}>{t('save')}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!showTermForm} onClose={() => setShowTermForm(null)} title={t('addTerm', 'Add term')}>
        <div className="flex flex-col gap-3">
          <Input id="termName" label={t('name', 'Name')} value={termName} onChange={(e) => setTermName(e.currentTarget.value)} placeholder="Trimestre 1" required />
          <Input id="termStart" label={t('startDate', 'Start date')} type="date" value={termStart} onChange={(e) => setTermStart(e.currentTarget.value)} required />
          <Input id="termEnd" label={t('endDate', 'End date')} type="date" value={termEnd} onChange={(e) => setTermEnd(e.currentTarget.value)} required />
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="secondary" onClick={() => setShowTermForm(null)}>{t('cancel')}</Button>
            <Button variant="primary" loading={saving} onClick={handleCreateTerm}>{t('save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
