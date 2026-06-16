'use client';

import React from 'react';
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
  User
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuthStore();

  const navItems = [
    { name: 'Charts', path: '/chart', icon: LineChart },
    { name: 'Screener', path: '/screener', icon: SearchCode },
    { name: 'Backtesting', path: '/backtest', icon: History },
    { name: 'Portfolio', path: '/portfolio', icon: FolderHeart },
    { name: 'News', path: '/news', icon: Newspaper },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
    router.push('/');
  };

  return (
    <aside className="w-16 md:w-20 border-r border-border bg-card flex flex-col items-center py-4 justify-between h-screen shrink-0 select-none z-20">
      {/* Brand logo */}
      <div className="flex flex-col items-center gap-1">
        <Link 
          href="/" 
          className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition cursor-pointer"
        >
          <TrendingUp className="h-5 w-5 text-white" />
        </Link>
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider hidden md:block">Gravity</span>
      </div>

      {/* Navigation list */}
      <nav className="flex flex-col gap-3 w-full px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.path}
              title={item.name}
              className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all cursor-pointer group relative ${
                isActive 
                  ? 'bg-primary/10 text-primary border-l-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
              }`}
            >
              <Icon className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] mt-1 hidden md:block">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile & logout */}
      <div className="flex flex-col items-center gap-4 w-full px-2">
        {user && (
          <div 
            className="flex flex-col items-center justify-center cursor-default group relative"
            title={`${profile?.username || user.email}`}
          >
            <div className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground font-semibold text-xs uppercase shadow-sm">
              {profile?.username ? profile.username.slice(0, 2) : <User className="h-4 w-4" />}
            </div>
          </div>
        )}

        <button
          onClick={handleSignOut}
          title="Sign Out"
          className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition cursor-pointer"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}
