import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';
import { Badge } from '../../../components/ui/Badge';
import { getDirectory, type DirectoryUser } from '../../../api/community';

const ROLES = ['', 'admin', 'teacher', 'student', 'parent'];

export function DirectoryPage({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getDirectory({
        q: search || undefined,
        role: roleFilter || undefined,
      });
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchDirectory(); }, 300);
    return () => clearTimeout(timer);
  }, [fetchDirectory]);

  const grouped = users.reduce<Record<string, DirectoryUser[]>>((acc, u) => {
    const key = u.role || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(u);
    return acc;
  }, {});

  return (
    <div>
      {!embedded && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t('directory', 'Directory')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('directoryDesc', 'School community — names and roles only')}
          </p>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder={t('search', 'Search by name...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r ? r.charAt(0).toUpperCase() + r.slice(1) : t('allRoles', 'All roles')}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">{t('noResults', 'No results found.')}</p>
      ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(grouped).map(([role, members]) => (
            <section key={role}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 capitalize">
                {role}s ({members.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {members.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-3 border rounded-md bg-card"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
                      {u.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.display_name}</p>
                      {u.group_name && (
                        <p className="text-xs text-muted-foreground truncate">{u.group_name}</p>
                      )}
                    </div>
                    <div className="ml-auto shrink-0"><Badge variant="info">{role}</Badge></div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
