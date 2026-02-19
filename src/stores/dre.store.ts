import { create } from 'zustand';
import type { DrePeriod, DreReport } from '@/types/dre.types';

interface DreState {
  periods: DrePeriod[];
  selectedPeriod: DrePeriod | null;
  currentReport: DreReport | null;
  isCalculating: boolean;
  setPeriods: (periods: DrePeriod[]) => void;
  setSelectedPeriod: (period: DrePeriod | null) => void;
  setCurrentReport: (report: DreReport | null) => void;
  setCalculating: (calculating: boolean) => void;
}

export const useDreStore = create<DreState>((set) => ({
  periods: [],
  selectedPeriod: null,
  currentReport: null,
  isCalculating: false,
  setPeriods: (periods) => set({ periods }),
  setSelectedPeriod: (selectedPeriod) => set({ selectedPeriod }),
  setCurrentReport: (currentReport) => set({ currentReport }),
  setCalculating: (isCalculating) => set({ isCalculating }),
}));
