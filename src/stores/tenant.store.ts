import { create } from 'zustand';
import type { Tenant } from '@/types/tenant.types';

type ColorMode = 'light' | 'dark';

interface TenantState {
  tenant: Tenant | null;
  colorMode: ColorMode;
  setTenant: (tenant: Tenant | null) => void;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
  clear: () => void;
}

function getInitialColorMode(): ColorMode {
  return 'light';
}

function applyColorMode(mode: ColorMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', mode === 'dark');
  localStorage.setItem('color-mode', mode);
}

export const useTenantStore = create<TenantState>((set, get) => ({
  tenant: null,
  colorMode: getInitialColorMode(),
  setTenant: (tenant) => set({ tenant }),
  toggleColorMode: () => {
    const next = get().colorMode === 'light' ? 'dark' : 'light';
    applyColorMode(next);
    set({ colorMode: next });
  },
  setColorMode: (mode) => {
    applyColorMode(mode);
    set({ colorMode: mode });
  },
  clear: () => set({ tenant: null }),
}));
