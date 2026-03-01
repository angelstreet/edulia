import { useEffect } from 'react';

interface Branding {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

export function useTenantBranding(branding?: Branding | null) {
  useEffect(() => {
    if (!branding) return;
    const root = document.documentElement;
    if (branding.primary_color) {
      root.style.setProperty('--color-primary', branding.primary_color);
    }
    if (branding.secondary_color) {
      root.style.setProperty('--color-secondary', branding.secondary_color);
    }
    if (branding.accent_color) {
      root.style.setProperty('--color-accent', branding.accent_color);
    }
    return () => {
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-secondary');
      root.style.removeProperty('--color-accent');
    };
  }, [branding]);
}
