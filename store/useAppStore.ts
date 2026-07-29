// ============================================================
// DailyLedger — store/useAppStore.ts
// Zustand global state for UI & settings
// ============================================================

import { create } from 'zustand';
import type { Transaction, AppSettings, DashboardMetrics } from '@/types';

interface AppState {
  // UI state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Drive popup
  showDrivePopup: boolean;
  setShowDrivePopup: (v: boolean) => void;
  
  // Settings cache
  settings: AppSettings;
  setSettings: (s: Partial<AppSettings>) => void;
  
  // Transaction modal
  editingTransaction: Transaction | null;
  setEditingTransaction: (t: Transaction | null) => void;
  showTransactionModal: boolean;
  setShowTransactionModal: (v: boolean) => void;
  modalInitialData: { personName?: string; type?: import('@/types').TransactionType; categoryId?: string } | null;
  setModalInitialData: (data: { personName?: string; type?: import('@/types').TransactionType; categoryId?: string } | null) => void;
  
  // Refresh trigger
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  
  showDrivePopup: false,
  setShowDrivePopup: (v) => set({ showDrivePopup: v }),
  
  settings: {
    theme: 'system',
    currency: 'PKR',
    driveConfig: { connected: false },
    driveSkipped: false,
  },
  setSettings: (s) => set((prev) => ({ settings: { ...prev.settings, ...s } })),
  
  editingTransaction: null,
  setEditingTransaction: (t) => set({ editingTransaction: t }),
  showTransactionModal: false,
  setShowTransactionModal: (v) => set({ showTransactionModal: v }),
  modalInitialData: null,
  setModalInitialData: (data) => set({ modalInitialData: data }),
  
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
