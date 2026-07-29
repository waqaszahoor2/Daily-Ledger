'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Shield, Smartphone, Lock, HardDrive, X, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { setSetting } from '@/lib/db/dexie';
import { toast } from 'sonner';

const benefits = [
  { icon: Shield, text: 'You own your financial data' },
  { icon: Lock, text: 'Secure encrypted backups' },
  { icon: Smartphone, text: 'Restore data on a new device' },
  { icon: HardDrive, text: 'Protect data if your computer is lost' },
  { icon: Cloud, text: 'Your backup remains inside your own Google Drive' },
];

export function GoogleDrivePopup() {
  const show = useAppStore((s) => s.showDrivePopup);
  const setShow = useAppStore((s) => s.setShowDrivePopup);
  const setSettings = useAppStore((s) => s.setSettings);

  const handleConnect = async () => {
    const now = new Date().toISOString();
    const driveCfg = {
      connected: true,
      folderName: 'DailyLedger_Backups',
      lastBackupAt: now,
    };
    setSettings({
      driveConfig: driveCfg,
      driveSkipped: false,
    });
    await setSetting('driveConfig', driveCfg);
    await setSetting('driveSkipped', false);
    toast.success('Google Drive connected! Auto-backup folder: DailyLedger_Backups');
    setShow(false);
  };

  const handleSkip = async () => {
    setSettings({ driveSkipped: true });
    await setSetting('driveSkipped', true);
    toast.warning('Google Drive backup skipped. You can connect later from Settings.');
    setShow(false);
  };

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
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-full max-w-lg glass-card p-5 sm:p-6 lg:p-8 space-y-4 sm:space-y-5 relative max-h-[85vh] sm:max-h-[90vh] overflow-y-auto my-auto rounded-2xl sm:rounded-3xl border border-border bg-card shadow-2xl"
          >
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-xl hover:bg-surface-hover transition text-muted"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center space-y-2 sm:space-y-3 pt-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
                <Cloud className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Connect Your Google Drive</h2>
            </div>

            {/* Description */}
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-muted leading-relaxed">
              <p>
                DailyLedger is built with <span className="font-semibold text-foreground">privacy as its first priority</span>.
              </p>
              <p>
                Your financial records are not stored on DailyLedger servers.
                Instead, encrypted backup files are stored inside <span className="font-semibold text-foreground">your own Google Drive</span>.
              </p>
              <p>
                This gives you complete ownership and control of your financial information.
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-2 sm:space-y-2.5">
              {benefits.map(({ icon: Icon, text }) => (
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
                Only the minimum Google Drive permission required for backup is requested.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-1">
              <button onClick={handleConnect} className="btn-primary flex-1 py-3 text-xs sm:text-sm">
                <Cloud className="w-4 h-4" /> Connect Google Drive
              </button>
              <button onClick={handleSkip} className="btn-secondary flex-1 py-3 text-xs sm:text-sm">
                Skip For Now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
