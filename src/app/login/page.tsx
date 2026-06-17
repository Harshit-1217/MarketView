'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';
import { TrendingUp, Mail, Lock, AlertCircle, Eye, EyeOff, Zap, ArrowRight, Activity } from 'lucide-react';

const MARKET_QUOTES = [
  { q: '"The stock market is a device for transferring money from the impatient to the patient."', a: '— Warren Buffett' },
  { q: '"In investing, what is comfortable is rarely profitable."', a: '— Robert Arnott' },
  { q: '"The four most dangerous words in investing are: this time it\'s different."', a: '— Sir John Templeton' },
  { q: '"Risk comes from not knowing what you\'re doing."', a: '— Warren Buffett' },
];

const MINI_CHART = [40,55,48,62,58,70,65,80,74,85,78,92,88,95,90,100];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const t = setInterval(() => setQuoteIdx((i) => (i + 1) % MARKET_QUOTES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError(authError.message); setLoading(false); return; }
      if (data?.user) { setUser(data.user); window.location.href = '/chart'; }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const quote = MARKET_QUOTES[quoteIdx];

  return (
    <div className="relative min-h-screen flex bg-background overflow-hidden">
      {/* ─── Left panel — branding + quote ───────────────────────────── */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-14 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #060b18 0%, #0a1628 100%)' }}>

        {/* BG decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute top-0 left-0 right-0 h-full bg-radial-blue opacity-60" />
          <div className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4 rounded-full bg-blue-600/15 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-purple-600/10 blur-[100px]" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 0 30px rgba(59,130,246,0.5)' }}>
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-black text-lg text-white tracking-tight leading-none">GravityCharts</div>
            <div className="text-[10px] font-semibold text-blue-400/70 tracking-widest uppercase">Trading Terminal</div>
          </div>
        </div>

        {/* Mini sparkline */}
        <div className="relative z-10 flex flex-col gap-6">
          <div className="glass-card rounded-2xl p-6 border-white/8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">NIFTY 50</div>
                <div className="text-3xl font-black text-white tabular-nums">24,141</div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-bull font-bold text-lg" style={{ textShadow: '0 0 12px rgba(16,185,129,0.7)' }}>+0.67%</span>
                <span className="text-xs text-muted-foreground">+161 pts</span>
              </div>
            </div>
            {/* SVG sparkline */}
            <svg viewBox="0 0 160 60" className="w-full h-14" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                points={MINI_CHART.map((v, i) => `${(i / (MINI_CHART.length - 1)) * 160},${60 - v * 0.58}`).join(' ')}
                style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.8))' }}
              />
              <polygon
                fill="url(#chartGrad)"
                points={[
                  ...MINI_CHART.map((v, i) => `${(i / (MINI_CHART.length - 1)) * 160},${60 - v * 0.58}`),
                  '160,60', '0,60'
                ].join(' ')}
              />
            </svg>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: 'Volume', v: '₹8.4K Cr', c: '#3b82f6' },
              { l: 'Advancing', v: '1,247', c: '#10b981' },
              { l: 'Declining', v: '892', c: '#ef4444' },
            ].map((s) => (
              <div key={s.l} className="glass-card rounded-xl p-3 border-white/5">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{s.l}</div>
                <div className="text-sm font-bold" style={{ color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div className="glass-card rounded-2xl p-6 border-white/5 min-h-[110px] flex flex-col justify-between" key={quoteIdx}>
            <div className="flex gap-2 mb-3">
              {[0,1,2].map((i) => <Activity key={i} className="h-3.5 w-3.5 text-primary/40" />)}
            </div>
            <p className="text-sm text-foreground/80 italic leading-relaxed animate-fade-in">{quote.q}</p>
            <p className="text-xs text-muted-foreground mt-3 font-semibold animate-fade-in">{quote.a}</p>
          </div>
        </div>

        <p className="relative z-10 text-xs text-muted-foreground">© 2026 GravityCharts · Personal Trading Sandbox</p>
      </div>

      {/* ─── Right panel — form ───────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        {/* BG */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute -top-1/2 -right-1/4 w-3/4 h-3/4 rounded-full bg-purple-600/8 blur-[140px]" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-10 justify-center">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: '0 0 20px rgba(59,130,246,0.4)' }}>
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="font-black text-lg text-foreground">GravityCharts</span>
          </div>

          {/* Card */}
          <div className="glass-bright rounded-3xl p-8 md:p-10 shadow-2xl" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 40px 100px rgba(0,0,0,0.5)' }}>
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mb-2">Welcome back</h1>
              <p className="text-sm text-muted-foreground">Sign in to your trading workspace</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl border border-destructive/25 bg-destructive/8 text-destructive text-sm flex items-start gap-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 transition disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-12 py-3.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 transition disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60 flex items-center justify-center gap-2.5 cursor-pointer mt-2"
                style={{
                  background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  boxShadow: loading ? 'none' : '0 4px 24px rgba(59,130,246,0.4)',
                }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-primary font-semibold hover:text-blue-400 transition">
                Create one free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
