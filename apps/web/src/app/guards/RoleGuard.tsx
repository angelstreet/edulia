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
      <div className="text-center py-16 px-6">
        <h1 className="text-5xl font-extrabold text-destructive mb-2">403</h1>
        <p className="text-muted-foreground">{t('forbidden', 'You do not have permission to view this page.')}</p>
      </div>
    );
  }

  return <>{children}</>;
}
