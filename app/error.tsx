'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mx-auto border border-danger/20">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Something Went Wrong</h1>
          <p className="text-sm text-muted">
            An unexpected error occurred in your local ledger session. Your financial records in IndexedDB are safe.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <button onClick={() => reset()} className="btn-primary w-full flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> Reload & Try Again
          </button>
          <Link href="/dashboard" className="btn-secondary w-full flex items-center justify-center gap-2">
            <Home className="w-4 h-4" /> Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
