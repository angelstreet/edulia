import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { createUser, updateUser, type UserData } from '../../../api/users';

interface UserFormProps {
  user: UserData | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' },
  { value: 'tutor', label: 'Tutor' },
];

export function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const { t } = useTranslation();
  const isEdit = !!user;
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isEdit) {
        await updateUser(user.id, { first_name: firstName, last_name: lastName, email, role });
      } else {
        await createUser({ first_name: firstName, last_name: lastName, email, role });
      }
      onSuccess();
    } catch {
      setError(t('saveError', 'Could not save. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-destructive">{error}</div>}
      <Input
        id="firstName"
        label={t('firstName', 'First name')}
        value={firstName}
        onChange={(e) => setFirstName(e.currentTarget.value)}
        required
      />
      <Input
        id="lastName"
        label={t('lastName', 'Last name')}
        value={lastName}
        onChange={(e) => setLastName(e.currentTarget.value)}
        required
      />
      <Input
        id="formEmail"
        type="email"
        label={t('email')}
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        required
        disabled={isEdit}
      />
      <Select
        id="role"
        label={t('role', 'Role')}
        options={ROLE_OPTIONS}
        value={role}
        onChange={(e) => setRole(e.currentTarget.value)}
      />
      <div className="flex gap-2 justify-end mt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {isEdit ? t('save') : t('addUser', 'Add user')}
        </Button>
      </div>
    </form>
  );
}
