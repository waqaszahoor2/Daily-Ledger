// ============================================================
// DailyLedger — components/auth/GoogleDrivePopup.tsx
// Real Google Drive connection via Google Identity Services (GIS).
// Uses memory-only token storage and creates/locates DailyLedger_Backups.
// ============================================================

'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Shield, Smartphone, Lock, HardDrive, X, CheckCircle2, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { setSetting } from '@/lib/db/dexie';
import { getOrCreateDriveFolder, DRIVE_FOLDER_NAME } from '@/lib/drive/drive';
import { connectDrive, isTokenValid, getGoogleClientId, loadGISScript } from '@/lib/gis/tokenClient';
import { toast } from 'sonner';

const benefits = [
  { icon: Shield, text: 'You own your financial data' },
  { icon: Lock, text: 'AES-256-GCM encrypted backups' },
  { icon: Smartphone, text: 'Restore data on a new device' },
  { icon: HardDrive, text: 'Protect data if your device is lost' },
  { icon: Cloud, text: 'Your backup stays inside your own Google Drive' },
];

export function GoogleDrivePopup() {
  const show = useAppStore((s) => s.showDrivePopup);
  const setShow = useAppStore((s) => s.setShowDrivePopup);
  const setSettings = useAppStore((s) => s.setSettings);

  const [connecting, setConnecting] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);

  // Preload GIS script when popup opens
  useEffect(() => {
    if (show) {
      loadGISScript().catch(() => {});
    }
  }, [show]);

  /**
   * Synchronous click handler — calls connectDrive() synchronously in line 1
   * of the mouse click event stack tick to satisfy strict browser popup policies.
   */
  const handleConnect = () => {
    setConfigError(null);
    setPopupBlocked(false);

    const clientId = getGoogleClientId();
    if (!clientId || clientId.trim() === '' || clientId === 'your_google_web_client_id') {
      const msg = 'Google Drive connection is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to the production environment.';
      setConfigError(msg);
      toast.error(msg);
      return;
    }

    setConnecting(true);

    // Call connectDrive() synchronously in click event thread
    connectDrive()
      .then(async (accessToken) => {
        // 2. Perform authentic Google Drive API request to locate/create backup folder
        const folderId = await getOrCreateDriveFolder(accessToken);

        // 3. Save connection metadata
        const driveCfg = {
          connected: true,
          folderId,
          folderName: DRIVE_FOLDER_NAME,
        };

        setSettings({ driveConfig: driveCfg, driveSkipped: false });
        await setSetting('driveConfig', driveCfg);
        await setSetting('driveSkipped', false);

        toast.success(`Google Drive connected! Backup folder: ${DRIVE_FOLDER_NAME}`);
        setShow(false);
      })
      .catch((err) => {
        console.error('Drive connect error:', err);
        const message = err instanceof Error ? err.message : String(err);
        if (message.toLowerCase().includes('popup') || message.toLowerCase().includes('blocked')) {
          setPopupBlocked(true);
        }
        setConfigError(message);
        toast.error(`Drive connection failed: ${message}`);
      })
      .finally(() => {
        setConnecting(false);
      });
  };

  const handleSkip = useCallback(async () => {
    setSettings({ driveSkipped: true });
    await setSetting('driveSkipped', true);
    toast.warning('Google Drive backup skipped. You can connect later from Settings.');
    setShow(false);
  }, [setSettings, setShow]);

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, handleSkip]);

  const hasToken = isTokenValid();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) handleSkip(); }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="drive-popup-title"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-full max-w-lg glass-card p-5 sm:p-6 lg:p-8 space-y-4 sm:space-y-5 relative max-h-[85vh] sm:max-h-[90vh] overflow-y-auto my-auto rounded-2xl sm:rounded-3xl border border-border bg-card shadow-2xl"
          >
            <button
              onClick={handleSkip}
              aria-label="Close dialog"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-xl hover:bg-surface-hover transition text-muted"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center space-y-2 sm:space-y-3 pt-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
                <Cloud className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
              </div>
              <h2 id="drive-popup-title" className="text-xl sm:text-2xl font-bold text-foreground">
                Connect Your Google Drive
              </h2>
              {hasToken && (
                <p className="text-xs text-emerald-500 font-medium">
                  ✓ Active session — ready to link backup folder
                </p>
              )}
            </div>

            {configError && (
              <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-xs text-danger font-medium leading-relaxed">
                  {configError}
                </p>
              </div>
            )}

            {popupBlocked && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
                <Info className="w-4.5 h-4.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-1">Your browser blocked the Google popup window:</span>
                  <ol className="list-decimal ml-4 space-y-1 text-[11px] leading-relaxed">
                    <li>Look at your browser address bar (top right) for the blocked popup icon (🚫 or 🔒).</li>
                    <li>Click the icon and select <strong>&quot;Always allow popups from this site&quot;</strong>.</li>
                    <li>Click <strong>Connect Google Drive</strong> below to open Google authorization.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
              <p>
                DailyLedger stores your financial records locally on this device.
                You can optionally connect Google Drive to create encrypted backups.
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-2 sm:space-y-2.5">
              {benefits.map(({ text }) => (
                <div key={text} className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                  </div>
                  <span className="text-xs sm:text-sm text-foreground font-medium">{text}</span>
                </div>
              ))}
            </div>

            {/* Privacy Notice */}
            <div className="bg-surface rounded-xl p-3 sm:p-4 flex items-start gap-2.5 sm:gap-3">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-xs text-muted leading-relaxed">
                <span className="font-semibold text-foreground">Privacy Notice: </span>
                DailyLedger never stores your financial records on company servers.
                Only the minimum Google Drive permission required for backup is requested
                (<code className="text-primary">drive.file</code> scope).
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-1">
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="btn-primary flex-1 py-3 text-xs sm:text-sm disabled:opacity-60 cursor-pointer"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Connecting to Google Drive…
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    Connect Google Drive
                  </>
                )}
              </button>
              <button onClick={handleSkip} disabled={connecting} className="btn-secondary flex-1 py-3 text-xs sm:text-sm cursor-pointer">
                Start Using DailyLedger
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
