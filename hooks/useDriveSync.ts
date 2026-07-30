// ============================================================
// DailyLedger — hooks/useDriveSync.ts
// React hook for authentic automatic background Google Drive backup
// ============================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useAppStore } from '@/store/useAppStore';
import { performAutoDriveSync } from '@/lib/drive/drive';
import { toast } from 'sonner';

export function useDriveSync() {
  const { data: session } = useSession();
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const refreshKey = useAppStore((s) => s.refreshKey);

  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(settings.driveConfig.lastBackupAt || null);

  const isSyncingRef = useRef(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.info('Reconnected to internet. Auto-sync active.');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Offline mode. Data is stored locally on this device.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync execution
  const triggerAutoSync = useCallback(async () => {
    if (!settings.driveConfig.connected || !isOnline || isSyncingRef.current) return;

    const accessToken = (session as { accessToken?: string })?.accessToken;
    if (!accessToken) {
      return;
    }

    isSyncingRef.current = true;
    setSyncing(true);

    try {
      const res = await performAutoDriveSync(accessToken);
      setLastSyncTime(res.lastBackupAt);
      setSettings({
        driveConfig: {
          ...settings.driveConfig,
          lastBackupAt: res.lastBackupAt,
        },
      });
      toast.success('Auto-backed up to Google Drive (DailyLedger_Backups)');
    } catch (err) {
      console.error('Auto Drive sync error:', err);
      toast.error('Google Drive backup sync encountered an error. Please verify account permissions.');
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
    }
  }, [settings.driveConfig, isOnline, session, setSettings]);

  // Trigger sync on transaction change or re-connecting online
  useEffect(() => {
    if (settings.driveConfig.connected && isOnline) {
      const timer = setTimeout(() => {
        triggerAutoSync();
      }, 2000); // 2-second debounce after changes
      return () => clearTimeout(timer);
    }
  }, [refreshKey, isOnline, settings.driveConfig.connected, triggerAutoSync]);

  return {
    isOnline,
    syncing,
    lastSyncTime,
    triggerAutoSync,
  };
}
