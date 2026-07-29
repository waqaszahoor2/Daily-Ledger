'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Cloud, Download, Upload, Sun, Moon, Monitor, LogOut,
  Shield, ChevronRight, AlertTriangle, CheckCircle2, Trash2
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { setSetting, getDB, getAppSettings } from '@/lib/db/dexie';
import { encryptData, decryptData } from '@/lib/encryption/crypto';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const setShowDrivePopup = useAppStore((s) => s.setShowDrivePopup);

  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('dl_user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('dl_user');
    toast.success('Logged out');
    router.push('/');
  };

  const handleBackup = async () => {
    try {
      const db = getDB();
      const allTxns = await db.transactions.toArray();
      const allSettings = await db.settings.toArray();

      const data = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        transactions: allTxns,
        settings: allSettings,
      });

      // Prompt for password
      const password = prompt('Enter a password to encrypt your backup:');
      if (!password || password.length < 4) {
        toast.error('Password must be at least 4 characters');
        return;
      }

      const encrypted = await encryptData(data, password);
      const blob = new Blob([encrypted], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dailyledger-backup-${new Date().toISOString().slice(0, 10)}.dlb`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Encrypted backup downloaded!');
    } catch {
      toast.error('Backup failed');
    }
  };

  const handleRestore = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.dlb,.json';
    fileInput.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        if (file.name.endsWith('.dlb')) {
          const password = prompt('Enter your backup password:');
          if (!password) return;

          const buffer = await file.arrayBuffer();
          const decrypted = await decryptData(buffer, password);
          const data = JSON.parse(decrypted);

          const db = getDB();
          await db.transactions.clear();
          await db.settings.clear();
          if (data.transactions) await db.transactions.bulkAdd(data.transactions);
          if (data.settings) await db.settings.bulkAdd(data.settings);

          toast.success('Backup restored successfully!');
        } else {
          const text = await file.text();
          const data = JSON.parse(text);

          const db = getDB();
          await db.transactions.clear();
          if (data.transactions) await db.transactions.bulkAdd(data.transactions);

          toast.success('JSON backup restored!');
        }
      } catch {
        toast.error('Restore failed. Incorrect password or corrupted file.');
      }
    };
    fileInput.click();
  };

  const handleClearData = async () => {
    if (!confirm('This will permanently delete ALL your financial data. Are you sure?')) return;
    if (!confirm('This action CANNOT be undone. Delete everything?')) return;

    const db = getDB();
    await db.transactions.clear();
    toast.success('All data cleared');
  };

  if (!mounted) return null;

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  return (
    <div className="page-container space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted mt-1">Manage your preferences & data</p>
      </div>

      {/* Profile */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-primary" />
          <h3 className="section-title">Profile</h3>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-xl">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground">{user.name}</p>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Google Drive */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Cloud className="w-5 h-5 text-primary" />
          <h3 className="section-title">Google Drive Connection</h3>
        </div>
        {settings.driveConfig.connected ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Google Drive Connected</p>
              <p className="text-xs text-muted mt-0.5">
                Folder: {settings.driveConfig.folderName || 'DailyLedger'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/5 border border-warning/15">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Drive Backup Not Connected</p>
                <p className="text-xs text-muted mt-1">Your data is stored only on this device. Connect Google Drive for automatic encrypted backups.</p>
              </div>
            </div>
            <button onClick={() => setShowDrivePopup(true)} className="btn-primary w-full">
              <Cloud className="w-4 h-4" /> Connect Google Drive
            </button>
          </div>
        )}
      </div>

      {/* Backup & Restore */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="section-title">Backup & Restore</h3>
        </div>
        <p className="text-xs text-muted mb-4">Export AES-256-GCM encrypted backup files or restore from a previous backup.</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleBackup} className="btn-primary">
            <Download className="w-4 h-4" /> Backup Now
          </button>
          <button onClick={handleRestore} className="btn-secondary">
            <Upload className="w-4 h-4" /> Restore
          </button>
        </div>
      </div>

      {/* Theme */}
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
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
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
        <p className="text-xs text-muted mb-4">Permanently delete all local financial data. This cannot be undone.</p>
        <button onClick={handleClearData} className="btn-danger">
          <Trash2 className="w-4 h-4" /> Clear All Data
        </button>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="btn-secondary w-full">
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}
