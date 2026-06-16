'use client';

import React from 'react';
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
  ShieldCheck
} from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuthStore();

  return (
    <div className="flex-1 flex flex-col relative min-h-screen overflow-x-hidden bg-background">
      {/* Visual background lights */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-bull/5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="w-full border-b border-border glass bg-card/20 py-4 px-6 md:px-12 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg text-foreground tracking-wider">GravityCharts</span>
        </div>
        
        <nav className="flex items-center gap-4">
          {loading ? (
            <div className="h-4 w-12 bg-muted rounded animate-pulse" />
          ) : user ? (
            <Link 
              href="/chart" 
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/95 shadow-md shadow-primary/10 transition cursor-pointer"
            >
              Enter Terminal
            </Link>
          ) : (
            <>
              <Link 
                href="/login" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                Sign In
              </Link>
              <Link 
                href="/register" 
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/95 shadow-md shadow-primary/10 transition cursor-pointer"
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 text-center max-w-5xl mx-auto z-10 py-16 md:py-24">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary font-medium mb-6">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Personal Trading Workspace</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-foreground tracking-tight leading-tight max-w-4xl">
          Track, Analyze & Backtest with{' '}
          <span className="bg-gradient-to-r from-primary via-bull to-primary bg-clip-text text-transparent">
            GravityCharts
          </span>
        </h1>
        
        <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          An advanced trading terminal inspired by TradingView. Powered by real-time Binance data feeds, technical analysis drawing tools, backtesting replays, and manual portfolio journal.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href={user ? '/chart' : '/login'}
            className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 shadow-xl shadow-primary/15 transition flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Open Terminal</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          {!user && (
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-card/60 hover:bg-card border border-border text-foreground font-medium rounded-xl transition cursor-pointer"
            >
              Create Free Account
            </Link>
          )}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full text-left">
          <div className="p-6 rounded-2xl glass border-border bg-card/35">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <LineChart className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Advanced Charting</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Fully interactive candlesticks, lines, and area layouts, with customizable timeframes and dual or quad splits.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass border-border bg-card/35">
            <div className="h-10 w-10 rounded-xl bg-bull/10 text-bull flex items-center justify-center mb-4">
              <Sliders className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Technical Indicators</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Built-in formulas for SMA, EMA, VWAP, RSI, MACD, Bollinger Bands, and Average True Range (ATR).
            </p>
          </div>

          <div className="p-6 rounded-2xl glass border-border bg-card/35">
            <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4">
              <BellRing className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Realtime Alerts</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Create alerts on indicators or price levels. Receive live in-browser overlay sounds and tracking logs.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass border-border bg-card/35">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
              <History className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Backtest Replays</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Build custom visual trading rules, replay history tick-by-tick, and check metrics like win rates or profit factor.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass border-border bg-card/35">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
              <FolderHeart className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Portfolio Tracker</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Manually log entry/exit pricing in a secure trading journal. Instantly monitor cumulative metrics and statistics.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass border-border bg-card/35">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Binance Feeds</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Direct WebSocket connection and historical candlestick fetching for all pairs available on Binance.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border mt-auto text-center text-xs text-muted-foreground z-10 bg-card/10">
        <p>© 2026 GravityCharts. Personal Sandbox Trading Interface.</p>
      </footer>
    </div>
  );
}
