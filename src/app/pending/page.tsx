'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, LogOut, TrendingUp, RefreshCw, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';

const STEPS = [
  { label: 'Account created', done: true },
  { label: 'Email verified', done: true },
  { label: 'Awaiting admin approval', done: false },
  { label: 'Access granted', done: false },
];

export default function PendingPage() {
  const [email, setEmail] = useState<string>('');
  const [dots, setDots] = useState('');
  const signOut = useAuthStore((state) => state.signOut);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email || '');
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => setDots((d) => d.length >= 3 ? '' : d + '.'), 600);
    return () => clearInterval(t);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden px-4">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-0 left-0 right-0 h-full bg-radial-blue opacity-50" />
        <div className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 rounded-full bg-amber-500/8 blur-[160px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 rounded-full bg-blue-600/8 blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: '0 0 25px rgba(59,130,246,0.5)' }}>
              <TrendingUp className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-black text-lg text-foreground tracking-tight">GravityCharts</span>
          </div>
        </div>

        {/* Main card */}
        <div className="glass-bright rounded-3xl p-8 text-center" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 40px 100px rgba(0,0,0,0.5)' }}>
          {/* Animated clock orb */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {/* Outer ring pulse */}
              <div className="absolute inset-0 rounded-full animate-breathe"
                style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.2), transparent)', transform: 'scale(1.6)' }} />
              <div
                className="relative h-20 w-20 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))',
                  border: '2px solid rgba(245,158,11,0.3)',
                  boxShadow: '0 0 30px rgba(245,158,11,0.3)',
                }}
              >
                <Clock className="h-9 w-9 text-amber-400" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-black text-foreground mb-2">
            Account Pending{dots}
          </h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            {email && <span className="text-foreground/70 font-medium">{email}</span>}
            {email && ' — '}
            Your account has been created and is awaiting administrator approval.
          </p>

          {/* Progress steps */}
          <div className="space-y-3 mb-8 text-left">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                  style={step.done
                    ? { background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 0 10px rgba(16,185,129,0.4)' }
                    : i === 2
                      ? { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  {step.done ? (
                    <svg viewBox="0 0 12 12" className="h-3 w-3 text-white fill-current">
                      <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : i === 2 ? (
                    <RefreshCw className="h-3 w-3 text-amber-400 animate-spin-slow" />
                  ) : (
                    <Shield className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  step.done ? 'text-foreground' : i === 2 ? 'text-amber-400' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
                {i === 2 && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                    In progress
                  </span>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--muted-foreground)'; }}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          You&apos;ll receive access as soon as an admin reviews your account.
        </p>
      </div>
    </div>
  );
}
