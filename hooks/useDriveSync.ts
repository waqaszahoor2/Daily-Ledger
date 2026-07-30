// ============================================================
// DailyLedger — hooks/useDriveSync.ts
// React hook for authentic automatic background Google Drive backup.
// Properly validates session token before attempting sync and
// surfaces actionable error messages for expired/missing tokens.
// ============================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useAppStore } from '@/store/useAppStore';
import { performAutoDriveSync } from '@/lib/drive/drive';
import { toast } from 'sonner';

export function useDriveSync() {
  const { data: session, status } = useSession();
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const refreshKey = useAppStore((s) => s.refreshKey);

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(
    settings.driveConfig.lastBackupAt || null
  );

  const isSyncingRef = useRef(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.info('Reconnected to internet. Auto-sync active.');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Offline. Data is stored locally on this device.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Trigger an authenticated Google Drive backup.
   * Guards:
   *  - Drive must be connected in settings
   *  - Device must be online
   *  - No sync already in progress
   *  - NextAuth session must be authenticated with a valid accessToken
   */
  const triggerAutoSync = useCallback(async () => {
    if (!settings.driveConfig.connected || !isOnline || isSyncingRef.current) return;

    // Validate session
    if (status !== 'authenticated') {
      // Session not ready yet — skip silently (will retry on next refreshKey)
      return;
    }

    const accessToken = (session as { accessToken?: string })?.accessToken;

    if (!accessToken) {
      // Google session exists but token is missing/expired
      toast.error(
        'Google Drive token has expired. Please sign out and sign back in with Google to re-authorise Drive access.',
        { duration: 6000 }
      );
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
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes('401') || message.includes('403') || message.includes('invalid_grant')) {
        toast.error(
          'Google Drive access revoked or expired. Please sign out and re-connect Google Drive.',
          { duration: 8000 }
        );
      } else {
        toast.error('Google Drive backup failed. Check your internet connection and Drive permissions.');
      }
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
    }
  }, [settings.driveConfig, isOnline, session, status, setSettings]);

  // Trigger sync on transaction change or re-connecting online (2-second debounce)
  useEffect(() => {
    if (settings.driveConfig.connected && isOnline && status === 'authenticated') {
      const timer = setTimeout(() => {
        triggerAutoSync();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [refreshKey, isOnline, settings.driveConfig.connected, status, triggerAutoSync]);

  return {
    isOnline,
    syncing,
    lastSyncTime,
    triggerAutoSync,
  };
}
