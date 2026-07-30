'use client';

import Link from 'next/link';
import { Shield, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-lg">
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Page Not Found</h1>
          <p className="text-sm text-muted">
            The page or financial ledger section you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <Link href="/dashboard" className="btn-primary w-full flex items-center justify-center gap-2">
            <Home className="w-4 h-4" /> Go to Dashboard
          </Link>
          <Link href="/" className="btn-secondary w-full flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Return to Landing Page
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted pt-2 border-t border-border/60">
          <Shield className="w-3.5 h-3.5 text-emerald-500" /> DailyLedger Privacy-First Finance App
        </div>
      </div>
    </div>
  );
}
