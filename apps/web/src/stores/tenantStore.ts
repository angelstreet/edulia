import { create } from 'zustand';
import type { TenantData } from '../api/tenant';

interface TenantState {
  tenant: TenantData | null;
  setTenant: (tenant: TenantData) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenant: null,
  setTenant: (tenant) => set({ tenant }),
}));
