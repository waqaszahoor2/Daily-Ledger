// ============================================================
// DailyLedger — components/backup/BackupPassphraseModal.tsx
// Modal for setting/entering the user-created backup passphrase.
// Enforces min 12 chars, confirmation, strength indicator, show/hide,
// and prominent recovery warning.
// ============================================================

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, EyeOff, Lock, AlertTriangle, X } from 'lucide-react';
import { validatePassphrase } from '@/lib/backup/schema';

interface BackupPassphraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (passphrase: string) => void;
  title?: string;
  description?: string;
  submitLabel?: string;
  requireConfirm?: boolean;
}

export function BackupPassphraseModal({
  isOpen,
  onClose,
  onSubmit,
  title = 'Create Backup Passphrase',
  description = 'Your passphrase encrypts all local financial data before uploading to Google Drive or downloading a backup file.',
  submitLabel = 'Encrypt & Backup',
  requireConfirm = true,
}: BackupPassphraseModalProps) {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validation = validatePassphrase(passphrase);
  const passMatch = !requireConfirm || passphrase === confirmPassphrase;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid) {
      setError(validation.issues.join('. '));
      return;
    }
    if (requireConfirm && !passMatch) {
      setError('Passphrases do not match');
      return;
    }

    setError(null);
    onSubmit(passphrase);
    setPassphrase('');
    setConfirmPassphrase('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md glass-card p-6 space-y-5 bg-card border border-border rounded-2xl shadow-2xl relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-surface-hover transition text-muted"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{title}</h3>
                <p className="text-xs text-muted mt-0.5">{description}</p>
              </div>
            </div>

            {/* Forgotten passphrase warning */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
                Warning: DailyLedger does not store your passphrase. If lost, your encrypted backups CANNOT be recovered.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Passphrase field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex justify-between">
                  <span>Backup Passphrase</span>
                  <span className="text-[10px] text-muted font-normal">Min 12 characters</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter strong passphrase..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-sm pr-10 text-foreground"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-3 top-2.5 text-muted hover:text-foreground"
                  >
                    {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm field */}
              {requireConfirm && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Confirm Passphrase</label>
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                    placeholder="Re-enter passphrase..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
                  />
                </div>
              )}

              {/* Requirements & strength indicator */}
              <div className="space-y-1">
                <div className="text-[11px] font-medium text-muted">Passphrase Requirements:</div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <span className={passphrase.length >= 12 ? 'text-emerald-500 font-semibold' : 'text-muted'}>
                    ✓ 12+ Characters
                  </span>
                  <span className={/[A-Z]/.test(passphrase) ? 'text-emerald-500 font-semibold' : 'text-muted'}>
                    ✓ Uppercase Letter
                  </span>
                  <span className={/[a-z]/.test(passphrase) ? 'text-emerald-500 font-semibold' : 'text-muted'}>
                    ✓ Lowercase Letter
                  </span>
                  <span className={/[0-9]/.test(passphrase) ? 'text-emerald-500 font-semibold' : 'text-muted'}>
                    ✓ Number (0-9)
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-danger/10 text-danger text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary flex-1 py-2.5 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!validation.valid || (requireConfirm && !passMatch)}
                  className="btn-primary flex-1 py-2.5 text-xs font-semibold disabled:opacity-50"
                >
                  <Shield className="w-4 h-4" />
                  {submitLabel}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
