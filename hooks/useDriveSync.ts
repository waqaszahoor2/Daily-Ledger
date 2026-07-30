// ============================================================
// DailyLedger — hooks/useDriveSync.ts
// Revision-based automatic background Google Drive backup hook.
// Strictly prevents backup loops, uses 30s debounce, single-flight
// upload lock, and reads access tokens ONLY from in-memory GIS.
// ============================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { performAutoDriveSync } from '@/lib/drive/drive';
import { getAccessToken, isTokenValid, clearAccessToken } from '@/lib/gis/tokenClient';
import { toast } from 'sonner';

export function useDriveSync() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const dataRevision = useAppStore((s) => s.dataRevision);
  const lastSyncedRevision = useAppStore((s) => s.lastSyncedRevision);
  const markSynced = useAppStore((s) => s.markSynced);
  const sessionPassphrase = useAppStore((s) => s.sessionPassphrase);

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(
    settings.driveConfig.lastBackupAt || null
  );

  const isSyncingRef = useRef(false);
  const pendingFollowupRef = useRef(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.info('Reconnected to internet.');
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
   * Executes a single-flight backup to Google Drive.
   */
  const triggerAutoSync = useCallback(async () => {
    if (!settings.driveConfig.connected || !isOnline) return;

    if (isSyncingRef.current) {
      // Mark that a data change occurred during an active upload
      pendingFollowupRef.current = true;
      return;
    }

    const token = getAccessToken();
    if (!token || !isTokenValid()) {
      // Token missing or expired — do not spam toasts unless backup is overdue
      return;
    }

    if (!sessionPassphrase) {
      // Passphrase locked for this session — backup cannot proceed until unlocked
      return;
    }

    const targetRevision = dataRevision;

    isSyncingRef.current = true;
    setSyncing(true);

    try {
      const res = await performAutoDriveSync(token, sessionPassphrase);

      // Update sync markers (does NOT increment dataRevision, preventing loops)
      markSynced(targetRevision);
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
        clearAccessToken();
        toast.error('Google Drive access expired or revoked. Please reconnect in Settings.');
      } else {
        toast.error(`Google Drive backup failed: ${message}`);
      }
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);

      // Handle follow-up if data changed during upload
      if (pendingFollowupRef.current) {
        pendingFollowupRef.current = false;
        // Trigger exactly one follow-up after current upload completes
        setTimeout(() => {
          triggerAutoSync();
        }, 1000);
      }
    }
  }, [
    settings.driveConfig.connected,
    isOnline,
    sessionPassphrase,
    dataRevision,
    markSynced,
    setSettings,
    settings.driveConfig,
  ]);

  // 30-second debounced trigger whenever dataRevision increases
  useEffect(() => {
    if (!settings.driveConfig.connected || !isOnline) return;
    if (dataRevision <= lastSyncedRevision) return; // No pending changes

    const timer = setTimeout(() => {
      triggerAutoSync();
    }, 30000); // 30-second debounce delay

    return () => clearTimeout(timer);
  }, [dataRevision, lastSyncedRevision, settings.driveConfig.connected, isOnline, triggerAutoSync]);

  return {
    isOnline,
    syncing,
    lastSyncTime,
    hasPendingChanges: dataRevision > lastSyncedRevision,
    triggerAutoSync,
  };
}
