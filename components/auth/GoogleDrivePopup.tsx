'use client';

// ============================================================
// DailyLedger — components/auth/GoogleDrivePopup.tsx
// Real Google Drive connection via OAuth session token.
// The "Connect" button uses the existing NextAuth session's
// accessToken to call the real Drive API and create/find the
// DailyLedger_Backups folder. If no token is present, it
// redirects to Google OAuth first.
// ============================================================

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Shield, Smartphone, Lock, HardDrive, X, CheckCircle2, RefreshCw } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';
import { useAppStore } from '@/store/useAppStore';
import { setSetting } from '@/lib/db/dexie';
import { getOrCreateDriveFolder, DRIVE_FOLDER_NAME } from '@/lib/drive/drive';
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
  const { data: session } = useSession();

  const [connecting, setConnecting] = useState(false);

  /**
   * Real Drive connection:
   * 1. If we already have a session.accessToken, call Drive API to
   *    find-or-create the DailyLedger_Backups folder, then persist.
   * 2. If no token, redirect to Google OAuth (which returns with token).
   */
  const handleConnect = async () => {
    const accessToken = (session as { accessToken?: string })?.accessToken;

    if (!accessToken) {
      // No Google session — trigger OAuth flow. After sign-in the user
      // returns to /dashboard where the popup will re-open if needed.
      toast.info('Redirecting to Google Sign-In to authorize Drive access…');
      await signIn('google', { callbackUrl: '/dashboard' });
      return;
    }

    setConnecting(true);
    try {
      // Call the REAL Drive API — creates/finds DailyLedger_Backups folder
      const folderId = await getOrCreateDriveFolder(accessToken);

      const driveCfg = {
        connected: true,
        folderId,
        folderName: DRIVE_FOLDER_NAME,
        // lastBackupAt intentionally NOT set here — it is set only after a
        // successful backup upload in performAutoDriveSync.
      };

      setSettings({ driveConfig: driveCfg, driveSkipped: false });
      await setSetting('driveConfig', driveCfg);
      await setSetting('driveSkipped', false);

      toast.success(`Google Drive connected! Backup folder: ${DRIVE_FOLDER_NAME}`);
      setShow(false);
    } catch (err) {
      console.error('Drive connect error:', err);
      toast.error('Failed to connect Google Drive. Please check your account permissions and try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSkip = useCallback(async () => {
    setSettings({ driveSkipped: true });
    await setSetting('driveSkipped', true);
    toast.warning('Google Drive backup skipped. You can connect later from Account settings.');
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

  const hasGoogleSession = !!(session as { accessToken?: string })?.accessToken;

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
              {hasGoogleSession && (
                <p className="text-xs text-emerald-500 font-medium">
                  ✓ Google account authenticated — Drive access is ready to enable
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
              <p>
                DailyLedger is built with <span className="font-semibold text-foreground">privacy as its first priority</span>.
              </p>
              <p>
                Your financial records are not stored on DailyLedger servers.
                Instead, AES-256-GCM encrypted backup files are stored inside{' '}
                <span className="font-semibold text-foreground">your own Google Drive</span>.
              </p>
              <p>
                This gives you complete ownership and control of your financial information.
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
                (<code className="text-primary">drive.file</code> scope — access limited to files DailyLedger creates).
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-1">
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="btn-primary flex-1 py-3 text-xs sm:text-sm disabled:opacity-60"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Connecting to Drive…
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    {hasGoogleSession ? 'Connect Google Drive' : 'Sign in with Google & Connect Drive'}
                  </>
                )}
              </button>
              <button onClick={handleSkip} disabled={connecting} className="btn-secondary flex-1 py-3 text-xs sm:text-sm">
                Skip For Now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
