// ============================================================
// DailyLedger — app/login/page.tsx
// Google OAuth sign-in page. Email/password auth has been
// removed to eliminate the fake in-memory authentication
// system that lost user accounts on server restart.
// ============================================================

'use client';

import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      toast.loading('Redirecting to Google Sign-In…', { id: 'google-login' });
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (err) {
      console.error('Google Sign-In error:', err);
      toast.dismiss('google-login');
      toast.error('Google Sign-In failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="glass-card p-8 space-y-6">
          {/* Logo & Title */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-3xl mx-auto shadow-lg">
              D
            </div>
            <h1 className="text-2xl font-bold text-foreground">Welcome to DailyLedger</h1>
            <p className="text-sm text-muted">
              Sign in with Google to access your private financial ledger
            </p>
          </div>

          {/* Google Sign In */}
          <button
            id="btn-google-signin"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-13 rounded-xl border border-border bg-card hover:bg-surface-hover active:scale-[0.98] transition-all duration-200 text-sm font-semibold text-foreground disabled:opacity-50 cursor-pointer shadow-sm hover:shadow-md"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Privacy Notice */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 justify-center text-xs text-muted">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              Your financial data never leaves your device
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs text-muted">
              {[
                { icon: '🔒', text: 'AES-256-GCM encrypted local storage' },
                { icon: '☁️', text: 'Backups stored in YOUR Google Drive only' },
                { icon: '🚫', text: 'No DailyLedger servers store financial data' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-hover/60">
                  <span>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Google OAuth Scope Transparency */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted leading-relaxed">
              <span className="font-semibold text-foreground">Permissions requested: </span>
              Basic profile (name &amp; email) and{' '}
              <code className="text-primary text-[10px]">drive.file</code> scope — limited to files DailyLedger creates. We cannot read other Drive files.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
