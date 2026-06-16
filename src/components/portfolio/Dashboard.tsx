'use client';

import React from 'react';
import { usePortfolioStore } from '@/lib/store/portfolioStore';
import { 
  Briefcase, 
  TrendingUp, 
  Coins, 
  Activity, 
  LineChart, 
  Award 
} from 'lucide-react';

export default function Dashboard() {
  const { getSummary } = usePortfolioStore();
  const summary = getSummary();

  const cards = [
    {
      name: 'Net Realized Profit',
      value: `$${summary.netProfit.toFixed(2)}`,
      subText: 'Cumulative realized closed trades PnL',
      icon: Coins,
      colorClass: summary.netProfit >= 0 ? 'text-bull bg-bull/10 border-bull/20' : 'text-bear bg-bear/10 border-bear/20',
    },
    {
      name: 'Win Rate',
      value: `${summary.winRate.toFixed(1)}%`,
      subText: 'Percentage of profitable trades',
      icon: Award,
      colorClass: summary.winRate >= 50 ? 'text-bull bg-bull/10 border-bull/20' : 'text-bear bg-bear/10 border-bear/20',
    },
    {
      name: 'Active Positions',
      value: summary.openPositionsCount,
      subText: 'Currently open floating entries',
      icon: Activity,
      colorClass: 'text-primary bg-primary/10 border-primary/20',
    },
    {
      name: 'Profit Factor',
      value: summary.profitFactor.toFixed(2),
      subText: 'Ratio of gross wins over gross losses',
      icon: LineChart,
      colorClass: summary.profitFactor >= 1.5 ? 'text-bull bg-bull/10 border-bull/20' : summary.profitFactor >= 1.0 ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 'text-bear bg-bear/10 border-bear/20',
    },
  ];

  return (
    <div className="p-6 bg-background shrink-0 select-none">
      {/* Title */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Briefcase className="h-4.5 w-4.5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfolio Performance</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Summary metrics computed from your manual trade logs journal.</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div 
              key={c.name} 
              className={`p-4 rounded-xl border flex justify-between items-center bg-card/60 backdrop-blur ${c.colorClass}`}
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">{c.name}</span>
                <div className="text-2xl font-extrabold text-foreground mt-1.5 leading-none">{c.value}</div>
                <p className="text-[10px] text-muted-foreground mt-2 font-medium">{c.subText}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-background/50 flex items-center justify-center border border-border/50 shrink-0">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
