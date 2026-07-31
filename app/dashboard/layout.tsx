'use client';

// ============================================================
// DailyLedger — app/dashboard/layout.tsx
// Dashboard shell: sidebar nav, mobile drawer, topbar.
// Local-first application — works fully without an account.
// Handles URL OAuth fragment redirect callback for Google Drive.
// ============================================================

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, BarChart3, Settings, Menu, X,
  Sun, Moon, Cloud, AlertTriangle, ChevronRight, Shield, HandCoins, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { GoogleDrivePopup } from '@/components/auth/GoogleDrivePopup';
import { useAppStore } from '@/store/useAppStore';
import { useDriveSync } from '@/hooks/useDriveSync';
import { getAppSettings, setSetting } from '@/lib/db/dexie';
import { runMigrationIfNeeded } from '@/lib/db/migration';
import { isTokenValid, getTokenEmail, setAccessToken } from '@/lib/gis/tokenClient';
import { getOrCreateDriveFolder, DRIVE_FOLDER_NAME } from '@/lib/drive/drive';
import { toast } from 'sonner';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/dashboard/debts', label: 'Debts', icon: HandCoins },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setShowDrivePopup = useAppStore((s) => s.setShowDrivePopup);
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const { syncing } = useDriveSync();

  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    // 1. Check for Google OAuth hash fragment redirect callback (#access_token=...)
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const token = params.get('access_token');
      const expiresIn = parseInt(params.get('expires_in') || '3600', 10);

      if (token) {
        setAccessToken(token, expiresIn);
        // Strip access token from address bar immediately to secure URL
        window.history.replaceState(null, '', window.location.pathname);

        getOrCreateDriveFolder(token)
          .then(async (folderId) => {
            const driveCfg = {
              connected: true,
              folderId,
              folderName: DRIVE_FOLDER_NAME,
            };
            setSettings({ driveConfig: driveCfg, driveSkipped: false });
            await setSetting('driveConfig', driveCfg);
            await setSetting('driveSkipped', false);
            toast.success(`Google Drive connected! Backup folder: ${DRIVE_FOLDER_NAME}`);
          })
          .catch((err) => {
            toast.error(`Drive setup error: ${err.message}`);
          });
      }
    }

    // 2. Run one-time DB migration and load settings
    runMigrationIfNeeded()
      .then(() => getAppSettings())
      .then((s) => setSettings(s))
      .catch(() => {});
  }, [setSettings]);

  const hasToken = isTokenValid();
  const tokenEmail = getTokenEmail();

  const displayUser = {
    name: tokenEmail ? tokenEmail.split('@')[0] : 'Local Ledger',
    email: tokenEmail || 'Stored on this device',
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar — Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card fixed inset-y-0 left-0 z-30">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-foreground block leading-tight">DailyLedger</span>
            <span className="text-[10px] text-muted">Your money. Your phone. Your Drive.</span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted hover:bg-surface-hover hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Drive Status */}
        {!settings.driveConfig.connected && (
          <div className="mx-3 mb-3 p-3 rounded-xl bg-warning/10 border border-warning/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-foreground">Drive Not Connected</p>
                <p className="text-[10px] text-muted mt-0.5">Data stored only on this device.</p>
                <button onClick={() => setShowDrivePopup(true)} className="text-[11px] text-primary font-medium mt-1.5 flex items-center gap-0.5 hover:underline">
                  Connect <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Profile */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-sm">
              {displayUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayUser.name}</p>
              <p className="text-xs text-muted truncate">{displayUser.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={toggleSidebar} className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col"
            >
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-bold text-foreground">DailyLedger</span>
                </div>
                <button onClick={toggleSidebar} className="p-2 rounded-xl hover:bg-surface-hover"><X className="w-5 h-5" /></button>
              </div>
              <nav className="flex-1 px-3 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} onClick={toggleSidebar} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted hover:bg-surface-hover'}`}>
                      <item.icon className="w-5 h-5" /> {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="p-3 border-t border-border">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-sm">
                    {displayUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{displayUser.name}</p>
                    <p className="text-xs text-muted truncate">{displayUser.email}</p>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-xl hover:bg-surface-hover transition">
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-foreground capitalize">
                {pathname === '/dashboard' ? 'Dashboard' : pathname.split('/').pop()?.replace('-', ' ')}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {settings.driveConfig.connected && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                  <Cloud className="w-3.5 h-3.5" />
                  {syncing ? (
                    <span className="flex items-center gap-1 font-medium">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
                    </span>
                  ) : (
                    <span className="font-medium">{hasToken ? 'Drive Connected' : 'Reconnection Required'}</span>
                  )}
                </div>
              )}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2.5 rounded-xl hover:bg-surface-hover transition"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-xs lg:hidden">
                {displayUser.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>

      <GoogleDrivePopup />
    </div>
  );
}
