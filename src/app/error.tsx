'use client';

import React, { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an analytics service or dashboard
    console.error('Terminal runtime error caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#131722] text-foreground p-6">
      <div className="glass max-w-md w-full p-8 rounded-2xl border border-border text-center shadow-2xl bg-card">
        <div className="h-12 w-12 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          The trading terminal encountered a rendering exception. This could be due to network changes or data sync issues.
        </p>

        {error.message && (
          <div className="my-5 p-3 rounded-lg bg-secondary/50 border border-border text-left">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Error details</span>
            <span className="font-mono text-xs text-destructive break-words">{error.message}</span>
          </div>
        )}

        <button
          onClick={() => reset()}
          className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/95 shadow-lg shadow-primary/20 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Reset and Try Again</span>
        </button>
      </div>
    </div>
  );
}
