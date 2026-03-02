import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { getForm, getResponses, type FormData, type FormResponseRecord } from '../../../api/forms';

export function FormResultsPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData | null>(null);
  const [responses, setResponses] = useState<FormResponseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getForm(id), getResponses(id)])
      .then(([formRes, respRes]) => {
        setForm(formRes.data);
        setResponses(Array.isArray(respRes.data) ? respRes.data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const exportCsv = () => {
    if (!form || responses.length === 0) return;
    const fields = form.fields || [];
    const headers = ['Submitted At', ...fields.map((f) => f.label)];
    const rows = responses.map((r) => [
      new Date(r.submitted_at).toLocaleString(),
      ...fields.map((f) => {
        const val = r.data[f.id];
        return Array.isArray(val) ? val.join('; ') : String(val ?? '');
      }),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.title}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!form) return <p className="text-center py-12 text-muted-foreground">Form not found.</p>;

  const fields = form.fields || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{form.title}</h1>
          <p className="text-muted-foreground text-sm">{responses.length} responses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/forms')}>
            {t('back', 'Back')}
          </Button>
          <Button variant="primary" onClick={exportCsv} disabled={responses.length === 0}>
            {t('exportCsv', 'Export CSV')}
          </Button>
        </div>
      </div>

      {responses.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">{t('noResponses', 'No responses yet.')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-3 py-2 font-medium">{t('submittedAt', 'Submitted')}</th>
                {fields.map((f) => (
                  <th key={f.id} className="text-left px-3 py-2 font-medium">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {responses.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {new Date(r.submitted_at).toLocaleString()}
                  </td>
                  {fields.map((f) => {
                    const val = r.data[f.id];
                    return (
                      <td key={f.id} className="px-3 py-2">
                        {Array.isArray(val) ? val.join(', ') : String(val ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
