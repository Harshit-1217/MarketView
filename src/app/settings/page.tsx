'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/shared/Sidebar';
import { useAuthStore } from '@/lib/store/authStore';
import { useChartStore } from '@/lib/store/chartStore';
import { 
  Settings, 
  Sun, 
  Moon, 
  Keyboard, 
  User, 
  Monitor, 
  LogOut,
  AppWindow,
  CircleAlert
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, signOut } = useAuthStore();
  const { layout, setLayout, syncCrosshair, setSyncCrosshair, syncTimeframe, setSyncTimeframe } = useChartStore();

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Load theme from localStorage / classList on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLight = document.documentElement.classList.contains('light');
      setTheme(isLight ? 'light' : 'dark');
    }
  }, []);

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      if (newTheme === 'light') {
        document.documentElement.classList.add('light');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.classList.remove('light');
        localStorage.setItem('theme', 'dark');
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
    router.push('/');
  };

  const keyboardShortcuts = [
    { key: 'Ctrl + S', desc: 'Save current active drawings layout' },
    { key: 'Ctrl + F', desc: 'Focus symbol search box' },
    { key: '1, 5, 15', desc: 'Instantly toggle timeframes (1m, 5m, 15m)' },
    { key: 'Alt + C', desc: 'Toggle cursor crosshairs sync' },
    { key: 'Alt + T', desc: 'Toggle timeframe intervals sync' },
    { key: 'Alt + W', desc: 'Clear all active drawings' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* 1. Settings main container */}
      <div className="flex-grow min-w-0 flex flex-col h-full bg-background overflow-y-auto">
        {/* Header */}
        <div className="h-16 border-b border-border bg-card/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10 w-full select-none">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <Settings className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Global Settings</h1>
              <p className="text-[10px] text-muted-foreground">Adjust display parameters, terminal presets, and account sessions.</p>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="max-w-4xl p-6 md:p-8 space-y-8">
          {/* Section: Themes */}
          <section className="space-y-4">
            <h2 className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
              <Monitor className="h-4 w-4" />
              <span>Appearance & Themes</span>
            </h2>
            
            <div className="p-5 rounded-2xl glass bg-card/45 border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-foreground">Terminal Theme Style</h3>
                <p className="text-xs text-muted-foreground mt-1">Select the background styling preference for the terminal charts.</p>
              </div>

              <div className="flex bg-secondary/60 p-1 rounded-xl border border-border shrink-0">
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-primary text-white shadow shadow-primary/10'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Moon className="h-4 w-4" />
                  <span>Signature Dark</span>
                </button>

                <button
                  onClick={() => handleThemeChange('light')}
                  className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    theme === 'light'
                      ? 'bg-primary text-white shadow shadow-primary/10'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sun className="h-4 w-4" />
                  <span>Classic Light</span>
                </button>
              </div>
            </div>
          </section>

          {/* Section: Workspace Configuration */}
          <section className="space-y-4">
            <h2 className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
              <AppWindow className="h-4 w-4" />
              <span>Workspace Configurations</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl glass bg-card/45 border-border flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Grid Splits</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">Set default grid alignment layout on startup.</p>
                </div>
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value as any)}
                  className="bg-secondary border border-border rounded-lg text-xs font-bold px-3 py-2 text-foreground focus:outline-none focus:border-primary w-full"
                >
                  <option value="1">1 Chart (Maximize view)</option>
                  <option value="2">2 Charts (Double split column)</option>
                  <option value="4">4 Charts (Quad grid layout)</option>
                </select>
              </div>

              <div className="p-5 rounded-2xl glass bg-card/45 border-border flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Synchronization</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">Coordinate multiple charts concurrently.</p>
                </div>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncCrosshair}
                      onChange={(e) => setSyncCrosshair(e.target.checked)}
                      className="rounded accent-primary text-primary focus:ring-primary h-4 w-4 bg-secondary border-border"
                    />
                    <span>Synchronize crosshair pointers</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncTimeframe}
                      onChange={(e) => setSyncTimeframe(e.target.checked)}
                      className="rounded accent-primary text-primary focus:ring-primary h-4 w-4 bg-secondary border-border"
                    />
                    <span>Synchronize timeframe changes</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Shortcuts Cheat Sheet */}
          <section className="space-y-4">
            <h2 className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
              <Keyboard className="h-4 w-4" />
              <span>Keyboard Shortcuts Quick Sheet</span>
            </h2>

            <div className="glass rounded-2xl bg-card/45 border-border overflow-hidden">
              <div className="divide-y divide-border/60">
                {keyboardShortcuts.map((sc) => (
                  <div key={sc.key} className="flex justify-between items-center p-4 text-xs">
                    <span className="font-semibold text-foreground">{sc.desc}</span>
                    <span className="font-mono bg-secondary border border-border px-2.5 py-1 rounded-lg text-primary font-bold shadow-sm">
                      {sc.key}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section: Accounts */}
          <section className="space-y-4">
            <h2 className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
              <User className="h-4 w-4" />
              <span>Account Status & Session</span>
            </h2>

            <div className="p-5 rounded-2xl glass bg-card/45 border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-foreground">Logged in as {profile?.username || 'Trader'}</h3>
                <p className="text-xs text-muted-foreground mt-1">Email address: {user?.email}</p>
                <div className="mt-3 text-[10px] text-muted-foreground flex items-center gap-1">
                  <CircleAlert className="h-3 w-3 text-primary" />
                  <span>Authenticated via Supabase Secure token tokens</span>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="px-4 py-2.5 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border border-destructive/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out of Workspace</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* 2. Sidebar Nav */}
      <Sidebar />
    </div>
  );
}
