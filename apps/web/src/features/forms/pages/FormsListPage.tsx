import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { getForms, type FormData } from '../../../api/forms';

const STATUS_VARIANTS: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
  draft: 'warning',
  published: 'success',
  closed: 'error',
};

export function FormsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const isAdmin = user?.role === 'admin';
  const [forms, setForms] = useState<FormData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const params = isAdmin ? {} : { status: 'published', target_role: user?.role };
      const { data } = await getForms(params);
      setForms(Array.isArray(data) ? data : []);
    } catch {
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.role]);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('forms', 'Forms')}</h1>
        {isAdmin && (
          <Button variant="primary" onClick={() => navigate('/forms/new')}>
            + {t('createForm', 'Create Form')}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : forms.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">{t('noForms', 'No forms available.')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {forms.map((form) => (
            <div
              key={form.id}
              className="p-4 border rounded-md bg-card hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() =>
                isAdmin ? navigate(`/forms/${form.id}/results`) : navigate(`/forms/${form.id}/fill`)
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{form.title}</h3>
                  {form.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{form.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>{form.type}</span>
                    {form.deadline && <span>· Due {new Date(form.deadline).toLocaleDateString()}</span>}
                    {isAdmin && <span>· {form.response_count} responses</span>}
                  </div>
                </div>
                <Badge variant={STATUS_VARIANTS[form.status] || 'info'}>{form.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
