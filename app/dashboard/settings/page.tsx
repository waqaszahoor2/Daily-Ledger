'use client';

// ============================================================
// DailyLedger — app/dashboard/settings/page.tsx
// Comprehensive Backup & Sync settings, safe restore, appearance,
// and real Google Drive disconnection with token revocation.
// ============================================================

import { useState, useSyncExternalStore } from 'react';
import {
  Cloud, Download, Upload, Sun, Moon, Monitor,
  Shield, AlertTriangle, CheckCircle2, Trash2, Key, RefreshCw, Unplug, HardDrive, FileCheck
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAppStore } from '@/store/useAppStore';
import { useDriveSync } from '@/hooks/useDriveSync';
import { getDB, setSetting } from '@/lib/db/dexie';
import { encryptData, decryptData, createBackupEnvelope } from '@/lib/encryption/crypto';
import { validateBackupPayload, validatePassphrase } from '@/lib/backup/schema';
import { BackupPassphraseModal } from '@/components/backup/BackupPassphraseModal';
import { isTokenValid, getTokenEmail, revokeCurrentToken, clearAccessToken, getAccessToken } from '@/lib/gis/tokenClient';
import { performAutoDriveSync, DRIVE_FOLDER_NAME } from '@/lib/drive/drive';
import { txRepo } from '@/lib/db/transactions.repository';
import { toast } from 'sonner';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const setShowDrivePopup = useAppStore((s) => s.setShowDrivePopup);
  const sessionPassphrase = useAppStore((s) => s.sessionPassphrase);
  const setSessionPassphrase = useAppStore((s) => s.setSessionPassphrase);
  const triggerRefresh = useAppStore((s) => s.triggerRefresh);

  const { syncing, hasPendingChanges, lastSyncTime } = useDriveSync();

  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [passphraseAction, setPassphraseAction] = useState<'download' | 'drive' | null>(null);
  const [showLegacyWarning, setShowLegacyWarning] = useState(false);
  const [pendingLegacyFile, setPendingLegacyFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  const hasToken = isTokenValid();
  const tokenEmail = getTokenEmail();
  const driveCfg = settings.driveConfig;

  // Derive status
  const driveStatus = !driveCfg.connected
    ? 'Local Only'
    : !hasToken
    ? 'Reconnection Required'
    : syncing
    ? 'Syncing'
    : !sessionPassphrase
    ? 'Backup Locked'
    : hasPendingChanges
    ? 'Local Changes Pending'
    : 'Backed Up';

  /**
   * Triggers file download backup after passphrase entry.
   */
  const handleDownloadBackupWithPassphrase = async (passphrase: string) => {
    try {
      setBusy(true);
      const db = getDB();
      const allTxns = await db.transactions.toArray();
      const allSettings = await db.settings.toArray();

      const envelopeJson = createBackupEnvelope(allTxns, allSettings);
      const encrypted = await encryptData(envelopeJson, passphrase);

      const blob = new Blob([encrypted], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dailyledger_backup_${new Date().toISOString().slice(0, 10)}.dlb`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setSessionPassphrase(passphrase);
      toast.success('Encrypted backup (.dlb) downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Backup creation failed');
    } finally {
      setBusy(false);
    }
  };

  /**
   * Triggers immediate Google Drive sync after passphrase entry.
   */
  const handleDriveSyncWithPassphrase = async (passphrase: string) => {
    const token = getAccessToken();
    if (!token || !hasToken) {
      toast.error('Google Drive authorization token is expired. Please reconnect Drive.');
      return;
    }

    try {
      setBusy(true);
      setSessionPassphrase(passphrase);
      const res = await performAutoDriveSync(token, passphrase);

      setSettings({
        driveConfig: {
          ...driveCfg,
          lastBackupAt: res.lastBackupAt,
        },
      });

      toast.success(`Backed up to Google Drive: ${res.fileName}`);
    } catch (err) {
      console.error(err);
      toast.error(`Drive backup failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  /**
   * Restores an encrypted .dlb file securely.
   */
  const handleRestoreEncryptedFile = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.dlb';

    fileInput.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const passphrase = prompt('Enter your backup passphrase (min 12 characters):');
      if (!passphrase) return;

      try {
        setBusy(true);
        const buffer = await file.arrayBuffer();
        const decryptedText = await decryptData(buffer, passphrase);
        const payload = JSON.parse(decryptedText);

        const validation = validateBackupPayload(payload);
        if (!validation.valid) {
          toast.error(`Restore failed: ${validation.issues.join('; ')}`);
          return;
        }

        const confirmRestore = confirm(
          `Backup Date: ${validation.exportedAt || 'Unknown'}\n` +
          `Record Count: ${validation.recordCount} transactions\n\n` +
          `Do you want to restore this backup? Current local data will be replaced.`
        );

        if (!confirmRestore) return;

        await txRepo.atomicRestore(payload.transactions, payload.settings);
        triggerRefresh();
        setSessionPassphrase(passphrase);
        toast.success(`Successfully restored ${validation.recordCount} transactions!`);
      } catch (err) {
        console.error('Restore error:', err);
        toast.error('Restore failed. Incorrect passphrase, invalid format, or corrupted file.');
      } finally {
        setBusy(false);
      }
    };

    fileInput.click();
  };

  /**
   * Prompts for legacy unencrypted JSON import with explicit warning.
   */
  const handleRestoreLegacyJson = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';

    fileInput.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setPendingLegacyFile(file);
      setShowLegacyWarning(true);
    };

    fileInput.click();
  };

  const confirmLegacyImport = async () => {
    if (!pendingLegacyFile) return;
    setShowLegacyWarning(false);

    try {
      setBusy(true);
      const text = await pendingLegacyFile.text();
      const payload = JSON.parse(text);

      const validation = validateBackupPayload(payload);
      if (!validation.valid) {
        toast.error(`Legacy import failed validation: ${validation.issues.join('; ')}`);
        return;
      }

      await txRepo.atomicRestore(payload.transactions, payload.settings);
      triggerRefresh();
      toast.success(`Legacy import completed! ${validation.recordCount} records loaded.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to import legacy JSON file. Invalid format.');
    } finally {
      setPendingLegacyFile(null);
      setBusy(false);
    }
  };

  /**
   * Disconnects Google Drive, revokes token, and reverts status to Local Only.
   */
  const handleDisconnectDrive = async () => {
    const confirmDisconnect = confirm(
      'Disconnect Google Drive?\n\n' +
      'Your local financial data and existing Google Drive backup files will be preserved. ' +
      'Automatic sync will be stopped.'
    );
    if (!confirmDisconnect) return;

    try {
      setBusy(true);
      await revokeCurrentToken();
      clearAccessToken();

      const newDriveCfg = { connected: false };
      setSettings({ driveConfig: newDriveCfg });
      await setSetting('driveConfig', newDriveCfg);

      toast.info('Google Drive disconnected. App is in Local Only mode.');
    } catch (err) {
      console.error(err);
      toast.error('Disconnect failed');
    } finally {
      setBusy(false);
    }
  };

  /**
   * Clears all local financial data.
   */
  const handleClearData = async () => {
    if (!confirm('This will permanently delete ALL your local financial data. Are you sure?')) return;
    if (!confirm('FINAL WARNING: This action CANNOT be undone. Delete all transactions?')) return;

    const db = getDB();
    await db.transactions.clear();
    triggerRefresh();
    toast.success('All local financial data deleted');
  };

  if (!mounted) return null;

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  return (
    <div className="page-container space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings &amp; Data Management</h2>
        <p className="text-sm text-muted mt-1">Manage local storage, encrypted backups, and Drive connection</p>
      </div>

      {/* Backup & Sync Interface Card */}
      <div className="glass-card p-6 space-y-5 border-border bg-card">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="section-title">Backup &amp; Sync Status</h3>
              <p className="text-xs text-muted">AES-256-GCM encrypted backup control center</p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              driveStatus === 'Backed Up'
                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20'
                : driveStatus === 'Syncing'
                ? 'bg-blue-500/15 text-blue-500 border-blue-500/20 animate-pulse'
                : driveStatus === 'Backup Locked' || driveStatus === 'Local Changes Pending'
                ? 'bg-amber-500/15 text-amber-600 border-amber-500/20'
                : 'bg-muted/15 text-muted border-border'
            }`}
          >
            {driveStatus}
          </span>
        </div>

        {/* Real Status Detail Grid */}
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-surface-hover/60 space-y-1">
            <span className="text-muted block">Storage Mode</span>
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-primary" />
              {driveCfg.connected ? 'Google Drive + Local' : 'Local Only (Device)'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-hover/60 space-y-1">
            <span className="text-muted block">Drive Account</span>
            <span className="font-semibold text-foreground truncate block">
              {tokenEmail || (driveCfg.connected ? 'Connected Account' : 'Not Connected')}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-hover/60 space-y-1">
            <span className="text-muted block">Drive Backup Folder</span>
            <span className="font-semibold text-foreground">
              {driveCfg.folderName || DRIVE_FOLDER_NAME}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-hover/60 space-y-1">
            <span className="text-muted block">Last Successful Backup</span>
            <span className="font-semibold text-foreground">
              {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-hover/60 space-y-1">
            <span className="text-muted block">Session Passphrase Status</span>
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-500" />
              {sessionPassphrase ? 'Unlocked (Active Session)' : 'Locked'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-hover/60 space-y-1">
            <span className="text-muted block">Local Changes Pending</span>
            <span className={`font-semibold ${hasPendingChanges ? 'text-amber-500' : 'text-emerald-500'}`}>
              {hasPendingChanges ? 'Yes (Sync Pending)' : 'No (Up to Date)'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-3 pt-2">
          {driveCfg.connected ? (
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setPassphraseAction('drive');
                  setShowPassphraseModal(true);
                }}
                disabled={busy}
                className="btn-primary py-2.5 text-xs font-semibold"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                Back Up to Google Drive Now
              </button>

              <button
                onClick={handleDisconnectDrive}
                disabled={busy}
                className="btn-secondary py-2.5 text-xs font-semibold text-danger border-danger/20 hover:bg-danger/10"
              >
                <Unplug className="w-4 h-4" />
                Disconnect Drive
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDrivePopup(true)}
              className="btn-primary w-full py-3 text-sm font-semibold"
            >
              <Cloud className="w-4 h-4" />
              Connect Google Drive for Encrypted Backups
            </button>
          )}

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                setPassphraseAction('download');
                setShowPassphraseModal(true);
              }}
              disabled={busy}
              className="btn-secondary py-2.5 text-xs font-semibold"
            >
              <Download className="w-4 h-4 text-primary" />
              Download Encrypted Backup (.dlb)
            </button>

            <button
              onClick={handleRestoreEncryptedFile}
              disabled={busy}
              className="btn-secondary py-2.5 text-xs font-semibold"
            >
              <Upload className="w-4 h-4 text-emerald-500" />
              Restore from Encrypted File (.dlb)
            </button>
          </div>

          <div className="text-right">
            <button
              onClick={handleRestoreLegacyJson}
              className="text-[11px] text-muted hover:text-foreground font-medium underline"
            >
              Legacy Unencrypted Import (.json)
            </button>
          </div>
        </div>
      </div>

      {/* Security Architecture Information */}
      <div className="glass-card p-5 space-y-3 border-border bg-card">
        <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
          <Shield className="w-4 h-4 text-emerald-500" />
          Security Architecture
        </div>
        <ul className="grid sm:grid-cols-2 gap-2 text-xs text-muted">
          <li className="flex items-center gap-2 p-2 rounded-lg bg-surface">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            AES-256-GCM authenticated encryption
          </li>
          <li className="flex items-center gap-2 p-2 rounded-lg bg-surface">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            PBKDF2-SHA-256 (600,000 iterations)
          </li>
          <li className="flex items-center gap-2 p-2 rounded-lg bg-surface">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            Memory-only Google OAuth tokens
          </li>
          <li className="flex items-center gap-2 p-2 rounded-lg bg-surface">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            5-version backup retention in Drive
          </li>
        </ul>
      </div>

      {/* Theme Preferences */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Sun className="w-5 h-5 text-primary" />
          <h3 className="section-title">Appearance</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all cursor-pointer ${
                theme === t.value
                  ? 'bg-primary/10 text-primary ring-2 ring-primary/20'
                  : 'bg-surface-hover text-muted hover:text-foreground'
              }`}
            >
              <t.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-card p-5 border-danger/20">
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="w-5 h-5 text-danger" />
          <h3 className="text-lg font-semibold text-danger">Danger Zone</h3>
        </div>
        <p className="text-xs text-muted mb-4">Permanently delete all local financial data from this browser. This action cannot be undone.</p>
        <button onClick={handleClearData} className="btn-danger cursor-pointer">
          <Trash2 className="w-4 h-4" /> Clear All Local Data
        </button>
      </div>

      {/* Passphrase Entry Modal */}
      <BackupPassphraseModal
        isOpen={showPassphraseModal}
        onClose={() => {
          setShowPassphraseModal(false);
          setPassphraseAction(null);
        }}
        onSubmit={(passphrase) => {
          if (passphraseAction === 'download') {
            handleDownloadBackupWithPassphrase(passphrase);
          } else if (passphraseAction === 'drive') {
            handleDriveSyncWithPassphrase(passphrase);
          }
        }}
        title={passphraseAction === 'drive' ? 'Google Drive Encryption Passphrase' : 'Create Encrypted Backup'}
        submitLabel={passphraseAction === 'drive' ? 'Encrypt & Upload to Drive' : 'Encrypt & Download (.dlb)'}
        requireConfirm={!sessionPassphrase}
      />

      {/* Legacy JSON Warning Modal */}
      {showLegacyWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-md w-full glass-card p-6 bg-card border border-border rounded-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-500 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              Legacy Unencrypted Import Warning
            </div>
            <p className="text-xs text-muted leading-relaxed">
              You are importing an unencrypted JSON file. Unencrypted files do not contain integrity signatures and could be modified or corrupted.
            </p>
            <p className="text-xs font-semibold text-foreground">
              Are you sure you want to proceed with importing {pendingLegacyFile?.name}? Current local data will be replaced.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowLegacyWarning(false);
                  setPendingLegacyFile(null);
                }}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={confirmLegacyImport}
                className="btn-primary text-xs px-4 py-2 bg-amber-600 hover:bg-amber-700"
              >
                Import Unencrypted File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
