'use client';

// ============================================================
// DailyLedger — app/dashboard/account/page.tsx
// Account identity & Google Drive cloud backup controls.
// Uses local-first identity and memory session passphrase.
// ============================================================

import { useState, useEffect, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, ShieldCheck, Cloud, Database, Clock,
  Folder, CheckCircle2, AlertTriangle, RefreshCw, Key,
  Download, Trash2, ShieldAlert
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAppStore } from '@/store/useAppStore';
import { useDriveSync } from '@/hooks/useDriveSync';
import { setSetting } from '@/lib/db/dexie';
import {
  listDriveBackups,
  downloadAndDecryptDriveBackup,
  deleteDriveBackupFile,
  type DriveFileInfo
} from '@/lib/drive/drive';
import { isTokenValid, getTokenEmail, getAccessToken } from '@/lib/gis/tokenClient';
import { toast } from 'sonner';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function AccountPage() {
  const { data: session } = useSession();
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const triggerRefresh = useAppStore((s) => s.triggerRefresh);
  const sessionPassphrase = useAppStore((s) => s.sessionPassphrase);
  const { syncing, lastSyncTime, triggerAutoSync } = useDriveSync();

  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  const hasToken = isTokenValid();
  const tokenEmail = getTokenEmail();

  const user = {
    name: tokenEmail ? tokenEmail.split('@')[0] : (session?.user?.name || 'Local Ledger User'),
    email: tokenEmail || (session?.user?.email || 'Stored on this device'),
    provider: hasToken ? 'Google Drive OAuth (Connected)' : 'Local Storage Mode',
  };

  const [storageEstimate, setStorageEstimate] = useState<{ usageKB: number; quotaMB: number } | null>(null);
  const [remoteFiles, setRemoteFiles] = useState<DriveFileInfo[]>([]);
  const [loadingRemoteFiles, setLoadingRemoteFiles] = useState(false);
  const [actionFileId, setActionFileId] = useState<string | null>(null);

  useEffect(() => {
    // Estimate local storage usage
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      navigator.storage.estimate().then((est) => {
        const usageKB = Math.round((est.usage || 0) / 1024);
        const quotaMB = Math.round((est.quota || 0) / (1024 * 1024));
        setStorageEstimate({ usageKB, quotaMB });
      });
    }
  }, []);

  const handleFetchRemoteBackups = async () => {
    const accessToken = getAccessToken();
    const folderId = settings.driveConfig.folderId;

    if (!settings.driveConfig.connected || !folderId || !accessToken) {
      toast.error('Google Drive is not connected with an active OAuth session. Please connect Drive first.');
      return;
    }

    setLoadingRemoteFiles(true);
    try {
      const files = await listDriveBackups(accessToken, folderId);
      setRemoteFiles(files);
      toast.success(`Found ${files.length} remote backup file(s) in Google Drive`);
    } catch (err) {
      console.error('Fetch remote backups error:', err);
      toast.error('Failed to list backup files from Google Drive');
    } finally {
      setLoadingRemoteFiles(false);
    }
  };

  const handleRestoreFromDrive = async (file: DriveFileInfo) => {
    const pass = prompt('Enter your encryption passphrase (min 12 characters):', sessionPassphrase || '');
    if (!pass) return;

    const accessToken = getAccessToken();
    if (!accessToken) {
      toast.error('Active Google Drive authorization required to download backup.');
      return;
    }
    setActionFileId(file.id);

    try {
      await downloadAndDecryptDriveBackup(accessToken, file.id, pass);
      triggerRefresh();
      toast.success('Successfully restored financial data from Google Drive!');
    } catch (err) {
      console.error('Remote Drive restore error:', err);
      toast.error('Failed to restore from Drive. Incorrect passphrase or corrupted backup file.');
    } finally {
      setActionFileId(null);
    }
  };

  const handleDeleteRemoteBackup = async (fileId: string) => {
    if (!confirm('Delete this backup file permanently from your Google Drive?')) return;

    const accessToken = getAccessToken();
    if (!accessToken) {
      toast.error('Active Google Drive authorization required.');
      return;
    }
    setActionFileId(fileId);

    try {
      await deleteDriveBackupFile(accessToken, fileId);
      setRemoteFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success('Backup file deleted from Google Drive');
    } catch (err) {
      console.error('Delete remote backup error:', err);
      toast.error('Failed to delete file from Google Drive');
    } finally {
      setActionFileId(null);
    }
  };

  const handleDisconnectDrive = async () => {
    if (confirm('Disconnect Google Drive backup? Auto-backup will pause.')) {
      const updatedConfig = { connected: false };
      setSettings({ driveConfig: updatedConfig });
      await setSetting('driveConfig', updatedConfig);
      toast.info('Google Drive disconnected');
    }
  };

  if (!mounted) return null;

  return (
    <div className="page-container space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Account &amp; Cloud Settings</h2>
        <p className="text-sm text-muted mt-1">Manage user identity, encryption keys, and Google Drive cloud backups</p>
      </div>

      {/* User Profile Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <User className="w-4 h-4" /> Identity &amp; Mode
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-2xl shadow-md">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1 flex-1 min-w-[200px]">
            <h3 className="text-xl font-bold text-foreground">{user.name}</h3>
            <p className="text-sm text-muted flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {user.email}
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> {user.provider}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Storage Metric Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Database className="w-4 h-4" /> Local Storage
          </div>
          <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            Stored Locally on Device
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-surface-hover/70 border border-border">
            <span className="text-xs text-muted block">Storage Used</span>
            <span className="text-2xl font-bold text-foreground mt-1 block">
              {storageEstimate ? `${storageEstimate.usageKB} KB` : 'Calculating...'}
            </span>
            <span className="text-[10px] text-muted">Financial records &amp; settings</span>
          </div>

          <div className="p-4 rounded-xl bg-surface-hover/70 border border-border">
            <span className="text-xs text-muted block">Device Quota</span>
            <span className="text-2xl font-bold text-foreground mt-1 block">
              {storageEstimate ? `${storageEstimate.quotaMB} MB` : 'Available'}
            </span>
            <span className="text-[10px] text-muted">Browser allocated storage</span>
          </div>
        </div>
      </motion.div>

      {/* Encryption Status Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Key className="w-4 h-4" /> Session Passphrase Status
          </div>
          <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> User-Created Passphrases
          </span>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          DailyLedger encrypts every Drive backup with AES-256-GCM using your user-created passphrase. Passphrases are stored only in memory during active sessions and are never saved plaintext beside your data.
        </p>

        <div className="p-3.5 rounded-xl bg-surface-hover/60 border border-border text-xs flex items-center justify-between">
          <span className="text-muted">Active Session Status:</span>
          <span className={`font-bold ${sessionPassphrase ? 'text-emerald-500' : 'text-amber-500'}`}>
            {sessionPassphrase ? 'Unlocked' : 'Locked (Passphrase prompt will show on backup/restore)'}
          </span>
        </div>
      </motion.div>

      {/* Google Drive Status & Mount Controls */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Cloud className="w-4 h-4" /> Google Drive Status
          </div>
          {settings.driveConfig.connected ? (
            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connected
            </span>
          ) : (
            <span className="text-xs font-bold text-warning bg-warning/10 px-2.5 py-1 rounded-full border border-warning/20 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Local Only Mode
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-surface-hover/50 border border-border">
              <span className="text-muted block flex items-center gap-1.5 mb-1">
                <Folder className="w-3.5 h-3.5 text-primary" /> Target Drive Folder
              </span>
              <span className="font-bold text-foreground text-sm">
                {settings.driveConfig.folderName || 'DailyLedger_Backups'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-hover/50 border border-border">
              <span className="text-muted block flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-primary" /> Last Backup
              </span>
              <span className="font-bold text-foreground text-sm">
                {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Not synced yet'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              onClick={() => triggerAutoSync()}
              disabled={syncing || !settings.driveConfig.connected}
              className="btn-primary py-2.5 text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing Now...' : 'Trigger Drive Backup Now'}
            </button>

            <button
              onClick={handleFetchRemoteBackups}
              disabled={loadingRemoteFiles || !settings.driveConfig.connected}
              className="btn-secondary py-2.5 text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Cloud className="w-3.5 h-3.5 text-primary" />
              {loadingRemoteFiles ? 'Fetching Remote Files...' : 'Explore Remote Drive Backups'}
            </button>

            {settings.driveConfig.connected && (
              <button
                onClick={handleDisconnectDrive}
                className="btn-secondary py-2.5 text-xs text-danger hover:bg-danger/10 border-danger/20 cursor-pointer"
              >
                Disconnect Drive
              </button>
            )}
          </div>
        </div>

        {/* Remote Drive Backup Explorer Table */}
        {remoteFiles.length > 0 && (
          <div className="pt-4 border-t border-border/60 space-y-3">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Folder className="w-4 h-4 text-primary" /> Remote Drive Backup Files ({remoteFiles.length})
            </h4>

            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface-hover/30">
              {remoteFiles.map((file) => (
                <div key={file.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{file.name}</p>
                    <p className="text-[10px] text-muted">
                      Created: {new Date(file.createdTime).toLocaleString()} {file.size ? `• ${(parseInt(file.size) / 1024).toFixed(1)} KB` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRestoreFromDrive(file)}
                      disabled={actionFileId === file.id}
                      className="btn-primary py-1.5 px-3 text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3 h-3" /> Restore
                    </button>
                    <button
                      onClick={() => handleDeleteRemoteBackup(file.id)}
                      disabled={actionFileId === file.id}
                      className="p-2 rounded-lg hover:bg-danger/10 text-muted hover:text-danger transition cursor-pointer disabled:opacity-50"
                      title="Delete backup from Drive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
