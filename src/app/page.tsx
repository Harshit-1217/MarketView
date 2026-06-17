'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import { 
  TrendingUp, 
  LineChart, 
  Sliders, 
  BellRing, 
  History, 
  FolderHeart, 
  ArrowRight,
  Zap,
  Shield,
  Activity,
  BarChart3,
  Sparkles,
  ChevronRight
} from 'lucide-react';

/* ─── Fake ticker data ─────────────────────────────────────────────────────── */
const TICKER_ITEMS = [
  { sym: 'RELIANCE', price: '2,847.35', chg: '+1.24%', up: true },
  { sym: 'TCS', price: '3,956.10', chg: '-0.38%', up: false },
  { sym: 'INFY', price: '1,542.80', chg: '+2.17%', up: true },
  { sym: 'HDFC', price: '1,623.45', chg: '+0.91%', up: true },
  { sym: 'ICICI', price: '1,087.20', chg: '-0.52%', up: false },
  { sym: 'WIPRO', price: '462.35', chg: '+1.83%', up: true },
  { sym: 'NIFTY 50', price: '24,141.00', chg: '+0.67%', up: true },
  { sym: 'SENSEX', price: '79,443.00', chg: '+0.54%', up: true },
  { sym: 'SBIN', price: '824.65', chg: '-1.12%', up: false },
  { sym: 'LT', price: '3,618.90', chg: '+2.45%', up: true },
];

/* ─── Animated orbital orbs ──────────────────────────────────────────────── */
function OrbitalRing({ delay = 0, radius = 220, size = 8, color = '#3b82f6', speed = 8 }: {
  delay?: number; radius?: number; size?: number; color?: string; speed?: number;
}) {
  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        width: radius * 2, height: radius * 2,
        border: `1px solid ${color}18`,
      }}
    >
      <div
        className="absolute rounded-full"
        style={{
          width: size, height: size,
          background: color,
          boxShadow: `0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color}60`,
          top: '50%', left: '50%',
          marginTop: -size / 2, marginLeft: -radius - size / 2,
          animation: `orbit ${speed}s linear infinite`,
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  );
}

/* ─── Floating stat card ──────────────────────────────────────────────────── */
function StatCard({ label, value, sub, color, delay }: {
  label: string; value: string; sub: string; color: string; delay: number;
}) {
  return (
    <div
      className="glass-card rounded-2xl p-4 min-w-[140px] animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color }}>
        {label}
      </div>
      <div className="text-2xl font-black text-foreground tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}

/* ─── Feature card ────────────────────────────────────────────────────────── */
function FeatureCard({ icon: Icon, title, desc, color, gradFrom, gradTo, delay }: {
  icon: React.ElementType; title: string; desc: string;
  color: string; gradFrom: string; gradTo: string; delay: number;
}) {
  return (
    <div
      className="feature-card glass-card rounded-2xl p-6 border border-white/[0.06] animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center mb-5"
        style={{ background: `linear-gradient(135deg, ${gradFrom}25, ${gradTo}15)`, border: `1px solid ${color}30` }}
      >
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
      <h3 className="font-bold text-base text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);

  /* Particle canvas */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.5 + 0.1,
      });
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59,130,246,${p.a})`;
        ctx.fill();
      });
      // Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(59,130,246,${0.12 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  /* Ticker animation tick */
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const features = [
    { icon: LineChart, title: 'Advanced Charting', desc: 'Interactive candlesticks, multi-split layouts, drawing tools and dual/quad chart views.', color: '#3b82f6', gradFrom: '#3b82f6', gradTo: '#6366f1' },
    { icon: Sliders, title: 'Technical Indicators', desc: 'SMA, EMA, VWAP, RSI, MACD, Bollinger Bands, ATR and custom overlays with real-time data.', color: '#10b981', gradFrom: '#10b981', gradTo: '#06b6d4' },
    { icon: BellRing, title: 'Smart Alerts', desc: 'Live in-browser price level alerts with sound notifications and persistent trigger history.', color: '#8b5cf6', gradFrom: '#8b5cf6', gradTo: '#ec4899' },
    { icon: History, title: 'Backtest Replays', desc: 'Build visual rules, replay market history tick-by-tick, measure win rates and profit factors.', color: '#f59e0b', gradFrom: '#f59e0b', gradTo: '#f97316' },
    { icon: FolderHeart, title: 'Portfolio Journal', desc: 'Log trades manually, track P&L, monitor cumulative performance and drawdown metrics.', color: '#06b6d4', gradFrom: '#06b6d4', gradTo: '#3b82f6' },
    { icon: Activity, title: 'Live Market Data', desc: 'Direct WebSocket + REST feeds from Yahoo Finance for all NSE/BSE listed instruments.', color: '#ec4899', gradFrom: '#ec4899', gradTo: '#8b5cf6' },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* ─── Particle canvas ──────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ opacity: 0.6 }}
      />

      {/* ─── Deep space background layers ────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute top-0 left-0 right-0 h-[70vh] bg-radial-blue" />
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[60%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-[30%] -right-[10%] w-[40%] h-[50%] rounded-full bg-purple-600/8 blur-[140px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[40%] rounded-full bg-cyan-500/5 blur-[120px]" />
      </div>

      {/* ─── Ticker bar ───────────────────────────────────────────────── */}
      <div className="relative z-20 border-b border-white/5 bg-black/30 backdrop-blur py-1.5 overflow-hidden">
        <div className="ticker-wrap">
          <div className="ticker-inner gap-8 px-4">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-2 mr-10 text-xs font-mono">
                <span className="font-bold text-foreground/80">{item.sym}</span>
                <span className="text-foreground/60">{item.price}</span>
                <span className={item.up ? 'text-bull' : 'text-bear'} style={{ textShadow: item.up ? '0 0 10px rgba(16,185,129,0.6)' : '0 0 10px rgba(239,68,68,0.6)' }}>
                  {item.chg}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Header ───────────────────────────────────────────────────── */}
      <header className="relative z-20 py-4 px-6 md:px-14 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-xl flex items-center justify-center spin-border"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
            <TrendingUp className="h-4.5 w-4.5 text-white relative z-10" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-base text-foreground tracking-tight leading-none">GravityCharts</span>
            <span className="text-[10px] font-semibold text-primary/70 tracking-widest uppercase">Trading Terminal</span>
          </div>
        </div>

        <nav className="flex items-center gap-3">
          {loading ? (
            <div className="h-4 w-20 rounded-full bg-white/5 animate-pulse" />
          ) : user ? (
            <Link href="/chart" className="btn-primary text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Open Terminal
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition px-3 py-2">
                Sign In
              </Link>
              <Link href="/register" className="btn-primary text-sm flex items-center gap-2">
                Get Started <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-12 pb-20 max-w-6xl mx-auto">
        {/* Orbital decoration */}
        <div className="relative h-60 w-60 mx-auto mb-4 flex items-center justify-center">
          <OrbitalRing radius={90}  size={6}  color="#3b82f6" speed={8}  delay={0} />
          <OrbitalRing radius={120} size={4}  color="#8b5cf6" speed={12} delay={-4} />
          <OrbitalRing radius={150} size={5}  color="#06b6d4" speed={16} delay={-8} />

          {/* Center logo */}
          <div className="relative z-10 h-20 w-20 rounded-2xl flex items-center justify-center animate-pulse-glow"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #4f46e5)', boxShadow: '0 0 60px rgba(59,130,246,0.5), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
            <TrendingUp className="h-9 w-9 text-white" />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/25 bg-primary/8 text-xs text-primary font-semibold mb-6 animate-slide-up"
          style={{ animationFillMode: 'both' }}>
          <Sparkles className="h-3.5 w-3.5" />
          Advanced Trading Terminal · Real-time NSE/BSE Data
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.95] mb-6 animate-slide-up delay-100"
          style={{ animationFillMode: 'both' }}>
          <span className="text-foreground">Trade Smarter.</span>
          <br />
          <span className="gradient-text text-glow-blue">Analyze Deeper.</span>
        </h1>

        <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed mb-10 animate-slide-up delay-200"
          style={{ animationFillMode: 'both' }}>
          A blazing-fast trading terminal with real-time charts, 10+ indicators, multi-split layouts, 
          drawing tools, price alerts, backtesting, and a personal portfolio journal.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 animate-slide-up delay-300"
          style={{ animationFillMode: 'both' }}>
          <Link
            href={user ? '/chart' : '/login'}
            className="btn-primary flex items-center gap-2.5 text-sm px-8 py-3.5 w-full sm:w-auto justify-center"
          >
            <Zap className="h-4 w-4" />
            Launch Terminal
            <ArrowRight className="h-4 w-4" />
          </Link>
          {!user && (
            <Link href="/register" className="btn-ghost text-sm px-8 py-3.5 w-full sm:w-auto text-center flex items-center justify-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Create Free Account
            </Link>
          )}
        </div>

        {/* Live stats row */}
        <div className="flex flex-wrap justify-center gap-4 mb-20 animate-slide-up delay-400"
          style={{ animationFillMode: 'both' }}>
          <StatCard label="Indicators"  value="10+"  sub="Built-in formulas"     color="#3b82f6" delay={0} />
          <StatCard label="Chart Types" value="3"    sub="Candle, Line, Area"    color="#8b5cf6" delay={100} />
          <StatCard label="Layouts"     value="1-4"  sub="Split view grids"      color="#06b6d4" delay={200} />
          <StatCard label="Data"        value="Live" sub="WebSocket feeds"       color="#10b981" delay={300} />
        </div>

        {/* ─── Feature grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full text-left">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={i * 80 + 500} />
          ))}
        </div>
      </main>

      {/* ─── Bottom CTA band ──────────────────────────────────────────── */}
      <section className="relative z-10 mx-6 mb-10 rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(59,130,246,0.2)' }}>
        <div className="absolute inset-0 animate-shimmer" />
        <div className="relative px-10 py-14 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left max-w-5xl mx-auto">
          <div>
            <div className="flex items-center gap-2 mb-3 justify-center md:justify-start">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Ready to trade?</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">Your personal market terminal</h2>
            <p className="text-sm text-muted-foreground max-w-lg">Get full access to charts, indicators, watchlists, alerts, and portfolio tracking — all in one place.</p>
          </div>
          <Link
            href={user ? '/chart' : '/login'}
            className="btn-primary text-sm px-10 py-4 whitespace-nowrap flex items-center gap-2 shrink-0"
          >
            <Zap className="h-4 w-4" />
            {user ? 'Open Terminal' : 'Sign In to Start'}
          </Link>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
            <TrendingUp className="h-3 w-3 text-white" />
          </div>
          <span className="text-xs font-bold text-foreground/60">GravityCharts</span>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 GravityCharts · Personal Trading Sandbox</p>
      </footer>
    </div>
  );
}
