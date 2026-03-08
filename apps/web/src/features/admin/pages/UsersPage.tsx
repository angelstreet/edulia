import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Table } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Pagination } from '../../../components/ui/Pagination';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Spinner } from '../../../components/ui/Spinner';
import { Modal } from '../../../components/ui/Modal';
import { UserForm } from '../components/UserForm';
import { getUsers, createRelationship, type UserData } from '../../../api/users';

const ROLE_COLORS: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'default'> = {
  admin: 'danger',
  teacher: 'info',
  student: 'success',
  parent: 'warning',
  tutor: 'default',
};

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success',
  invited: 'warning',
  inactive: 'danger',
  suspended: 'danger',
};

export function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserData[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [linkParent, setLinkParent] = useState<UserData | null>(null);
  const [linkChildId, setLinkChildId] = useState('');
  const [students, setStudents] = useState<UserData[]>([]);
  const [linking, setLinking] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getUsers({
        page,
        per_page: 20,
        q: search || undefined,
        role: roleFilter || undefined,
      });
      setUsers(data.items);
      setTotalPages(Math.ceil(data.total / data.page_size) || 1);
    } catch {
      // API not connected yet — show empty state
      setUsers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (!linkParent) return;
    getUsers({ role: 'student', per_page: 100 })
      .then(r => setStudents(r.data.items))
      .catch(() => setStudents([]));
  }, [linkParent]);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkParent || !linkChildId) return;
    setLinking(true);
    try {
      await createRelationship(linkParent.id, linkChildId);
      setLinkParent(null);
      setLinkChildId('');
    } catch { /**/ }
    setLinking(false);
  }

  const columns = [
    {
      key: 'display_name',
      header: t('name', 'Name'),
      render: (row: UserData) => (
        <span className="font-medium">{row.display_name || `${row.first_name} ${row.last_name}`}</span>
      ),
    },
    { key: 'email', header: t('email') },
    {
      key: 'role',
      header: t('role', 'Role'),
      render: (row: UserData) => (
        <Badge variant={ROLE_COLORS[row.role] || 'default'}>{row.role}</Badge>
      ),
    },
    {
      key: 'status',
      header: t('status', 'Status'),
      render: (row: UserData) => (
        <Badge variant={STATUS_COLORS[row.status] || 'default'}>{row.status}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: UserData) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setEditUser(row); setShowForm(true); }}>
            {t('edit', 'Edit')}
          </Button>
          {row.role === 'parent' && (
            <Button variant="ghost" size="sm" onClick={() => { setLinkParent(row); setLinkChildId(''); }}>
              {t('linkChild', 'Link child')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('users')}</h1>
        <Button variant="primary" onClick={() => { setEditUser(null); setShowForm(true); }}>
          + {t('addUser', 'Add user')}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          type="search"
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring min-w-60"
          placeholder={t('search') + '...'}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option value="">{t('allRoles', 'All roles')}</option>
          <option value="admin">Admin</option>
          <option value="teacher">{t('teacher', 'Teacher')}</option>
          <option value="student">{t('student', 'Student')}</option>
          <option value="parent">{t('parent', 'Parent')}</option>
          <option value="tutor">{t('tutor', 'Tutor')}</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : users.length === 0 ? (
        <EmptyState
          title={t('noUsers', 'No users found')}
          description={t('noUsersDesc', 'Try adjusting your search or filters.')}
        />
      ) : (
        <>
          <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
            <Table columns={columns} data={users} />
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editUser ? t('editUser', 'Edit user') : t('addUser', 'Add user')}
      >
        <UserForm
          user={editUser}
          onSuccess={() => { setShowForm(false); fetchUsers(); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <Modal
        open={!!linkParent}
        onClose={() => setLinkParent(null)}
        title={`${t('linkChild', 'Link child')} — ${linkParent?.display_name}`}
      >
        <form onSubmit={handleLink} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t('linkChildDesc', 'Select the student this parent is guardian of.')}
          </p>
          <select
            value={linkChildId}
            onChange={e => setLinkChildId(e.target.value)}
            required
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
          >
            <option value="">— {t('selectStudent', 'Select student')} —</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.display_name || `${s.first_name} ${s.last_name}`}</option>
            ))}
          </select>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => setLinkParent(null)}>{t('cancel')}</Button>
            <Button type="submit" variant="primary" disabled={linking || !linkChildId}>
              {linking ? t('saving', 'Saving…') : t('linkChild', 'Link child')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
