'use client';

import React, { useState, useEffect } from 'react';
import { useWatchlistStore } from '@/lib/store/watchlistStore';
import { useAlertStore } from '@/lib/store/alertStore';
import { useChartStore } from '@/lib/store/chartStore';
import { 
  Plus, 
  Trash2, 
  Bell, 
  BellRing, 
  ListMusic, 
  Search, 
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { binanceWSManager } from '@/lib/binance/websocket';

export default function RightPanel() {
  const [activeTab, setActiveTab] = useState<'watchlist' | 'alerts'>('watchlist');

  // Watchlist hooks
  const { symbols, fetchWatchlist, addSymbol, removeSymbol } = useWatchlistStore();
  const [newSymbol, setNewSymbol] = useState('');

  // Alerts hooks
  const { alerts, history, fetchAlerts, createAlert, deleteAlert, checkAlerts } = useAlertStore();
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');
  const [alertValue, setAlertValue] = useState('');

  // Chart hooks
  const { charts, activeChartId, updateChartConfig } = useChartStore();
  const activeChart = charts.find(c => c.id === activeChartId) || charts[0];
  const activeSymbol = activeChart.symbol;

  // Live price tracking for watchlist/alerts checking
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  // Initialize
  useEffect(() => {
    fetchWatchlist();
    fetchAlerts();
  }, [fetchWatchlist, fetchAlerts]);

  // Subscribe to live prices for all symbols in the watchlist
  useEffect(() => {
    if (!binanceWSManager || symbols.length === 0) return;

    // Local function to update state on tick
    const handleTick = (sym: string) => (candle: any) => {
      const price = candle.close;
      setLivePrices((prev) => ({ ...prev, [sym]: price }));
      
      // Live check active alerts
      checkAlerts(sym, price);
    };

    // Subscribe to all watchlist symbols
    symbols.forEach((sym) => {
      binanceWSManager.subscribe(sym, '1m', handleTick(sym));
    });

    return () => {
      symbols.forEach((sym) => {
        binanceWSManager.unsubscribe(sym, '1m');
      });
    };
  }, [symbols, checkAlerts]);

  // Add symbol handler
  const handleAddSymbol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    addSymbol(newSymbol.toUpperCase().trim());
    setNewSymbol('');
  };

  // Create alert handler
  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(alertValue);
    if (isNaN(val) || val <= 0) return;

    createAlert({
      symbol: activeSymbol,
      type: 'price',
      condition: alertCondition,
      value: val,
    });
    setAlertValue('');
  };

  const selectSymbol = (sym: string) => {
    updateChartConfig(activeChartId, { symbol: sym });
  };

  return (
    <aside className="w-80 border-l border-border bg-card flex flex-col h-screen shrink-0 select-none z-10">
      {/* Tabs Header */}
      <div className="flex border-b border-border h-12 shrink-0 bg-secondary/20">
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'watchlist' 
              ? 'border-primary text-primary bg-secondary/10' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ListMusic className="h-4 w-4" />
          <span>Watchlist</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'alerts' 
              ? 'border-primary text-primary bg-secondary/10' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Alerts</span>
        </button>
      </div>

      {/* Content wrapper */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        {activeTab === 'watchlist' ? (
          <div className="flex-1 flex flex-col gap-4">
            {/* Add symbol form */}
            <form onSubmit={handleAddSymbol} className="relative flex items-center shrink-0">
              <input
                type="text"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                placeholder="Add symbol (e.g. SOLUSDT)"
                className="w-full bg-secondary border border-border rounded-xl pl-8 pr-10 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition font-bold"
              />
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <button 
                type="submit" 
                className="absolute right-2 h-6 w-6 rounded-md bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </form>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {symbols.map((sym) => {
                const isSelected = activeSymbol === sym;
                const price = livePrices[sym];
                
                return (
                  <div
                    key={sym}
                    onClick={() => selectSymbol(sym)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition group ${
                      isSelected 
                        ? 'bg-primary/10 border-primary/20 text-primary' 
                        : 'border-transparent hover:bg-secondary/40 text-foreground'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-xs tracking-wide">{sym}</span>
                      <span className="text-[10px] text-muted-foreground">Binance</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {price !== undefined ? price.toFixed(2) : '---'}
                      </span>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSymbol(sym);
                        }}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition p-1 hover:bg-destructive/10 rounded cursor-pointer"
                        title="Delete from Watchlist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-5 overflow-hidden">
            {/* Create Alert section */}
            <div className="p-4 rounded-xl border border-border bg-secondary/10 shrink-0">
              <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
                <BellRing className="h-4 w-4 text-primary" />
                <span>Create Alert for {activeSymbol}</span>
              </h3>

              <form onSubmit={handleCreateAlert} className="space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAlertCondition('above')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                      alertCondition === 'above'
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <TrendingUp className="h-3 w-3" />
                    <span>Price Above</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAlertCondition('below')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                      alertCondition === 'below'
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <TrendingDown className="h-3 w-3" />
                    <span>Price Below</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder={`Trigger price (e.g. ${livePrices[activeSymbol]?.toFixed(2) || '70000'})`}
                    value={alertValue}
                    onChange={(e) => setAlertValue(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary font-mono font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
                >
                  Create Price Alert
                </button>
              </form>
            </div>

            {/* Alerts Tabs Lists */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Active Alerts</h4>
                {alerts.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic pl-1">No active alerts</p>
                ) : (
                  <div className="space-y-1.5">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-xs">{alert.symbol}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            Price {alert.condition} {alert.value}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Alert Log (History)</h4>
                {history.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic pl-1">No triggered alerts</p>
                ) : (
                  <div className="space-y-1.5">
                    {history.map((alert) => (
                      <div key={alert.id} className="flex flex-col p-2.5 rounded-lg border border-border bg-[#131722]/40 opacity-70">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-destructive" />
                            {alert.symbol}
                          </span>
                          <button
                            onClick={() => deleteAlert(alert.id)}
                            className="text-muted-foreground hover:text-destructive p-0.5 rounded transition cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          Price triggered {alert.condition} {alert.value}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-mono mt-1">
                          {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleTimeString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
