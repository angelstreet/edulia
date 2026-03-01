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
import { getUsers, type UserData } from '../../../api/users';

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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getUsers({
        page,
        per_page: 20,
        q: search || undefined,
        role: roleFilter || undefined,
      });
      setUsers(data.data);
      setTotalPages(data.meta.total_pages);
    } catch {
      // API not connected yet — show empty state
      setUsers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const columns = [
    {
      key: 'display_name',
      header: t('name', 'Name'),
      render: (row: UserData) => (
        <span className="user-name-cell">{row.display_name || `${row.first_name} ${row.last_name}`}</span>
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
        <Button variant="ghost" size="sm" onClick={() => { setEditUser(row); setShowForm(true); }}>
          {t('edit', 'Edit')}
        </Button>
      ),
    },
  ];

  return (
    <div className="admin-users-page">
      <div className="page-header">
        <h1>{t('users')}</h1>
        <Button variant="primary" onClick={() => { setEditUser(null); setShowForm(true); }}>
          + {t('addUser', 'Add user')}
        </Button>
      </div>

      <div className="page-filters">
        <input
          type="search"
          className="search-input"
          placeholder={t('search') + '...'}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="filter-select"
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
        <div className="page-center"><Spinner /></div>
      ) : users.length === 0 ? (
        <EmptyState
          title={t('noUsers', 'No users found')}
          description={t('noUsersDesc', 'Try adjusting your search or filters.')}
        />
      ) : (
        <>
          <Table columns={columns} data={users} />
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
    </div>
  );
}
