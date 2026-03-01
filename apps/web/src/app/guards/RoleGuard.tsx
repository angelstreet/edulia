import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';

interface RoleGuardProps {
  roles: string[];
  children: React.ReactNode;
}

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  if (!user || !roles.includes(user.role)) {
    return (
      <div className="forbidden-page">
        <h1>403</h1>
        <p>{t('forbidden', 'You do not have permission to view this page.')}</p>
      </div>
    );
  }

  return <>{children}</>;
}
