'use client';

import React from 'react';
import { useBacktestStore } from '@/lib/store/backtestStore';
import { 
  Trophy, 
  TrendingUp, 
  Percent, 
  DollarSign, 
  Calculator,
  ListOrdered
} from 'lucide-react';

export default function BacktestResults() {
  const { trades, getStatistics } = useBacktestStore();
  const stats = getStatistics();

  const getMetricCards = () => [
    {
      name: 'Net Profit',
      value: `$${stats.netProfit.toFixed(2)}`,
      subText: `${stats.netProfitPercent >= 0 ? '+' : ''}${stats.netProfitPercent.toFixed(2)}%`,
      icon: DollarSign,
      colorClass: stats.netProfit >= 0 ? 'text-bull bg-bull/10 border-bull/20' : 'text-bear bg-bear/10 border-bear/20',
    },
    {
      name: 'Win Rate',
      value: `${stats.winRate.toFixed(1)}%`,
      subText: `${trades.filter(t => t.pnl > 0).length} Wins / ${trades.filter(t => t.pnl <= 0).length} Losses`,
      icon: Trophy,
      colorClass: stats.winRate >= 50 ? 'text-bull bg-bull/10 border-bull/20' : 'text-bear bg-bear/10 border-bear/20',
    },
    {
      name: 'Profit Factor',
      value: stats.profitFactor.toFixed(2),
      subText: 'Gross Wins / Gross Losses',
      icon: Percent,
      colorClass: stats.profitFactor >= 1.5 ? 'text-bull bg-bull/10 border-bull/20' : stats.profitFactor >= 1.0 ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 'text-bear bg-bear/10 border-bear/20',
    },
    {
      name: 'Total Trades',
      value: stats.totalTrades,
      subText: 'Closed positions in session',
      icon: Calculator,
      colorClass: 'text-primary bg-primary/10 border-primary/20',
    },
  ];

  const metrics = getMetricCards();

  return (
    <div className="h-64 border-t border-border bg-card flex flex-col overflow-hidden shrink-0 select-none">
      {/* Tab Navigation header */}
      <div className="flex border-b border-border h-11 shrink-0 bg-secondary/15 px-6 items-center justify-between">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <ListOrdered className="h-4 w-4 text-primary" />
          <span>Simulation Metrics & Logs</span>
        </h3>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3">
        {/* Core Metrics Grid */}
        <div className="lg:col-span-1 p-4 border-r border-border grid grid-cols-2 gap-3 overflow-y-auto">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div 
                key={m.name} 
                className={`p-3 rounded-xl border flex flex-col justify-between ${m.colorClass}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">{m.name}</span>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="mt-2">
                  <div className="text-base font-extrabold text-foreground leading-tight">{m.value}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-semibold">{m.subText}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Trades Log */}
        <div className="lg:col-span-2 overflow-y-auto p-4">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Executed Trades History</h4>
          
          {trades.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-xs italic border border-dashed border-border rounded-xl">
              No simulated trades recorded in this session. Click Buy/Sell to trigger replay entries.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="text-[9px] uppercase font-bold text-muted-foreground border-b border-border">
                <tr>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Entry Price</th>
                  <th className="pb-2">Exit Price</th>
                  <th className="pb-2">Quantity</th>
                  <th className="pb-2">PnL ($)</th>
                  <th className="pb-2">PnL (%)</th>
                  <th className="pb-2">Trade Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {trades.slice().reverse().map((t) => {
                  const isWin = t.pnl > 0;
                  const durationBars = Math.floor((t.exitTime - t.entryTime) / 3600); // approx hours for hourly klines
                  
                  return (
                    <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                      <td className={`py-2 font-bold ${t.type === 'BUY' ? 'text-bull' : 'text-bear'}`}>{t.type}</td>
                      <td className="py-2 font-mono font-semibold">${t.entryPrice.toFixed(2)}</td>
                      <td className="py-2 font-mono font-semibold">${t.exitPrice.toFixed(2)}</td>
                      <td className="py-2 font-mono">{t.quantity}</td>
                      <td className={`py-2 font-mono font-bold ${isWin ? 'text-bull' : 'text-bear'}`}>
                        {isWin ? '+' : ''}{t.pnl.toFixed(2)}
                      </td>
                      <td className={`py-2 font-mono font-bold ${isWin ? 'text-bull' : 'text-bear'}`}>
                        {isWin ? '+' : ''}{t.pnlPercent.toFixed(2)}%
                      </td>
                      <td className="py-2 font-mono text-muted-foreground">
                        {durationBars > 0 ? `${durationBars} bars` : '1 bar'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
