'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { 
  TrendingUp, 
  LineChart, 
  SearchCode, 
  History, 
  FolderHeart, 
  Newspaper, 
  Settings, 
  LogOut,
  User,
  ChevronRight,
  ChevronLeft,
  Zap
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuthStore();
  const [expanded, setExpanded] = useState(false);

  const navItems = [
    { name: 'Charts',      path: '/chart',     icon: LineChart,   color: '#3b82f6' },
    { name: 'Screener',    path: '/screener',  icon: SearchCode,  color: '#8b5cf6' },
    { name: 'Backtesting', path: '/backtest',  icon: History,     color: '#f59e0b', comingSoon: true },
    { name: 'Portfolio',   path: '/portfolio', icon: FolderHeart, color: '#10b981' },
    { name: 'News',        path: '/news',      icon: Newspaper,   color: '#06b6d4' },
    { name: 'Settings',    path: '/settings',  icon: Settings,    color: '#64748b' },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
    router.push('/');
  };

  return (
    <aside
      style={{
        width: expanded ? '200px' : '58px',
        transition: 'width 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}
      className="relative flex flex-col items-center py-4 justify-between h-screen shrink-0 select-none z-30 overflow-hidden bg-background/90 backdrop-blur-xl border-r border-border"
    >
      {/* Top section */}
      <div className="flex flex-col items-center gap-5 w-full">
        {/* Brand */}
        <div className={`flex items-center gap-2.5 w-full px-3 ${expanded ? 'justify-start' : 'justify-center'}`}>
          <Link href="/" className="relative h-8 w-8 rounded-xl flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: '0 0 16px rgba(59,130,246,0.5)' }}>
            <TrendingUp className="h-4 w-4 text-white" />
          </Link>
          {expanded && (
            <div className="flex flex-col min-w-0 animate-fade-in">
              <span className="text-xs font-black text-foreground tracking-tight leading-none truncate">GravityCharts</span>
              <span className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: '#3b82f6' }}>Terminal</span>
            </div>
          )}
        </div>

        <div className="w-full px-3">
          <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)' }} />
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1 w-full px-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.comingSoon ? '#' : item.path}
                onClick={(e) => {
                  if (item.comingSoon) {
                    e.preventDefault();
                    alert('Coming soon');
                  }
                }}
                title={!expanded ? item.name : undefined}
                className={`flex items-center gap-3 py-2.5 px-2 rounded-xl transition-all cursor-pointer group relative overflow-hidden ${
                  expanded ? 'justify-start' : 'justify-center'
                } ${item.comingSoon ? 'opacity-50' : ''}`}
                style={isActive
                  ? {
                    background: `linear-gradient(90deg, ${item.color}20, ${item.color}08)`,
                    borderLeft: `2px solid ${item.color}`,
                    boxShadow: `inset 0 0 20px ${item.color}05`,
                  }
                  : { borderLeft: '2px solid transparent' }
                }
              >
                {/* Hover shimmer */}
                {!isActive && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                    style={{ background: `radial-gradient(circle at center, ${item.color}10, transparent 70%)` }} />
                )}

                <Icon
                  className="h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110 relative z-10"
                  style={{ color: isActive ? item.color : '#64748b' }}
                />
                {expanded && (
                  <span className="text-sm font-semibold truncate relative z-10 animate-fade-in"
                    style={{ color: isActive ? item.color : '#94a3b8' }}>
                    {item.name}
                  </span>
                )}
                {isActive && !expanded && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full"
                    style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-2 w-full px-2">
        <div className="w-full px-1 mb-1">
          <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)' }} />
        </div>

        {/* User avatar */}
        {user && (
          <div className={`flex items-center gap-2.5 w-full px-1 py-2 rounded-xl group cursor-default ${expanded ? 'justify-start' : 'justify-center'}`}
            title={`${profile?.username || user.email}`}>
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                boxShadow: '0 0 10px rgba(99,102,241,0.4)',
                color: 'white',
              }}>
              {profile?.username ? profile.username.slice(0, 2).toUpperCase() : <User className="h-3.5 w-3.5" />}
            </div>
            {expanded && (
              <div className="flex flex-col min-w-0 animate-fade-in">
                <span className="text-xs font-bold text-foreground/90 truncate">{profile?.username || 'User'}</span>
                <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
              </div>
            )}
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          title="Sign Out"
          className={`flex items-center gap-2.5 w-full px-1 py-2 rounded-xl transition-all cursor-pointer group ${expanded ? 'justify-start' : 'justify-center'}`}
          style={{ color: '#64748b' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
        >
          <LogOut className="h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110" />
          {expanded && <span className="text-sm font-semibold animate-fade-in">Sign Out</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Collapse' : 'Expand'}
          className="flex items-center justify-center w-full py-2 rounded-xl transition-all cursor-pointer group"
          style={{ color: '#475569' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; e.currentTarget.style.color = '#3b82f6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
        >
          {expanded ? (
            <><ChevronLeft className="h-4 w-4" /><span className="ml-2 text-xs font-semibold animate-fade-in">Collapse</span></>
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
