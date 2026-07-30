'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, ShieldCheck, Cloud, HardDrive, Database, Clock,
  Folder, CheckCircle2, AlertTriangle, RefreshCw, LogOut
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { useDriveSync } from '@/hooks/useDriveSync';
import { setSetting } from '@/lib/db/dexie';
import { toast } from 'sonner';

export default function AccountPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const { syncing, lastSyncTime, triggerAutoSync } = useDriveSync();

  const [user, setUser] = useState<{ id?: string; name: string; email: string; provider?: string } | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<{ usageKB: number; quotaMB: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read local session or NextAuth session
    if (session?.user) {
      setUser({
        name: session.user.name || 'User',
        email: session.user.email || '',
        provider: 'Google OAuth 2.0',
      });
    } else {
      const stored = localStorage.getItem('dl_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUser({
            ...parsed,
            provider: parsed.provider === 'google' ? 'Google OAuth 2.0' : 'Email Authentication',
          });
        } catch {}
      }
    }

    // Estimate storage usage
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        const usageKB = Math.round((est.usage || 0) / 1024);
        const quotaMB = Math.round((est.quota || 0) / (1024 * 1024));
        setStorageEstimate({ usageKB, quotaMB });
      });
    }
  }, [session]);

  const handleDisconnectDrive = async () => {
    if (confirm('Disconnect Google Drive backup? Auto-backup will pause.')) {
      const updatedConfig = { connected: false };
      setSettings({ driveConfig: updatedConfig });
      await setSetting('driveConfig', updatedConfig);
      toast.info('Google Drive disconnected');
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem('dl_user');
    await signOut({ callbackUrl: '/' });
    toast.success('Signed out cleanly');
    router.push('/login');
  };

  if (!mounted) return null;

  return (
    <div className="page-container space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Account & Storage Details</h2>
        <p className="text-sm text-muted mt-1">Manage user identity, sync status, and storage metrics</p>
      </div>

      {/* User Profile Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <User className="w-4 h-4" /> Identity & Credentials
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-2xl shadow-md">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="space-y-1 flex-1 min-w-[200px]">
            <h3 className="text-xl font-bold text-foreground">{user?.name || 'Local Ledger User'}</h3>
            <p className="text-sm text-muted flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {user?.email || 'privacy@localdevice'}
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> {user?.provider || 'Privacy-First Anonymous'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Storage Used Metric Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Database className="w-4 h-4" /> Local IndexedDB Storage
          </div>
          <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            Encrypted Client Storage
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-surface-hover/70 border border-border">
            <span className="text-xs text-muted block">Storage Used</span>
            <span className="text-2xl font-bold text-foreground mt-1 block">
              {storageEstimate ? `${storageEstimate.usageKB} KB` : 'Calculating...'}
            </span>
            <span className="text-[10px] text-muted">Financial records & settings</span>
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

      {/* Google Drive Status & Backup Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Cloud className="w-4 h-4" /> Google Drive Cloud Backup Status
          </div>
          {settings.driveConfig.connected ? (
            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connected
            </span>
          ) : (
            <span className="text-xs font-bold text-warning bg-warning/10 px-2.5 py-1 rounded-full border border-warning/20 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Disconnected
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-surface-hover/50 border border-border">
              <span className="text-muted block flex items-center gap-1.5 mb-1">
                <Folder className="w-3.5 h-3.5 text-primary" /> Target Backup Folder
              </span>
              <span className="font-bold text-foreground text-sm">
                {settings.driveConfig.folderName || 'DailyLedger_Backups'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-hover/50 border border-border">
              <span className="text-muted block flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-primary" /> Last Auto Sync
              </span>
              <span className="font-bold text-foreground text-sm">
                {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Not synced yet'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <button
              onClick={() => triggerAutoSync()}
              disabled={syncing}
              className="btn-primary py-2.5 text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing Now...' : 'Trigger Sync Now'}
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
      </motion.div>

      {/* Logout Action */}
      <button onClick={handleSignOut} className="btn-secondary w-full py-3 text-sm flex items-center justify-center gap-2 cursor-pointer">
        <LogOut className="w-4 h-4" /> Sign Out of Account
      </button>
    </div>
  );
}
