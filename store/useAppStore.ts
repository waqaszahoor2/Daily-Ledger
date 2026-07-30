// ============================================================
// DailyLedger — store/useAppStore.ts
// Zustand global state for UI, settings, revisions, and session passphrase
// ============================================================

import { create } from 'zustand';
import type { Transaction, AppSettings } from '@/types';

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

  // Sync Revision state (for loop prevention)
  dataRevision: number;
  lastSyncedRevision: number;
  incrementDataRevision: () => void;
  markSynced: (revision?: number) => void;

  // In-memory backup passphrase (never persisted to storage)
  sessionPassphrase: string | null;
  setSessionPassphrase: (pass: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
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
  triggerRefresh: () => {
    const nextRev = get().dataRevision + 1;
    set((s) => ({ refreshKey: s.refreshKey + 1, dataRevision: nextRev }));
  },

  dataRevision: 1,
  lastSyncedRevision: 0,
  incrementDataRevision: () => set((s) => ({ dataRevision: s.dataRevision + 1 })),
  markSynced: (revision) =>
    set((s) => ({
      lastSyncedRevision: revision ?? s.dataRevision,
    })),

  sessionPassphrase: null,
  setSessionPassphrase: (pass) => set({ sessionPassphrase: pass }),
}));
