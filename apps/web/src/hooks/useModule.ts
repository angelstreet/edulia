import { useCallback } from 'react';

export function useModule() {
  // TODO: check tenant's enabled_modules from tenantStore when backend is ready
  const isEnabled = useCallback((_module: string) => {
    return true;
  }, []);

  return { isEnabled };
}
