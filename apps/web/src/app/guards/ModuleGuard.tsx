import { useTranslation } from 'react-i18next';

interface ModuleGuardProps {
  module: string;
  children: React.ReactNode;
}

export function ModuleGuard({ module: _module, children }: ModuleGuardProps) {
  const { t: _t } = useTranslation();
  // TODO: check tenant's enabled_modules from tenantStore
  // For now, allow all modules
  return <>{children}</>;
}
