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
  Star, 
  Search, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ListOrdered
} from 'lucide-react';
import { marketManager } from '@/lib/market/polling';

export default function RightPanel() {
  const [activeTab, setActiveTab] = useState<'watchlist' | 'alerts'>('watchlist');
  const [expanded, setExpanded] = useState(false);

  // Watchlist hooks
  const { 
    watchlists, 
    activeWatchlistId, 
    symbols, 
    fetchWatchlists, 
    createWatchlist, 
    renameWatchlist, 
    deleteWatchlist, 
    setActiveWatchlistId, 
    addSymbol, 
    removeSymbol 
  } = useWatchlistStore();
  const [newSymbol, setNewSymbol] = useState('');

  // Watchlist local state
  const [isCreating, setIsCreating] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Alerts hooks
  const { alerts, history, fetchAlerts, createAlert, deleteAlert, checkAlerts } = useAlertStore();
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');
  const [alertValue, setAlertValue] = useState('');

  // Chart hooks
  const { charts, activeChartId, updateChartConfig } = useChartStore();
  const activeChart = charts.find(c => c.id === activeChartId) || charts[0];
  const activeSymbol = activeChart.symbol;

  // Live price tracking
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  // Initialize
  useEffect(() => {
    fetchWatchlists();
    fetchAlerts();
  }, [fetchWatchlists, fetchAlerts]);

  // Subscribe to live prices
  useEffect(() => {
    if (!marketManager || symbols.length === 0) return;
    const handleTick = (sym: string) => (candle: any) => {
      const price = candle.close;
      setLivePrices((prev) => ({ ...prev, [sym]: price }));
      checkAlerts(sym, price);
    };
    symbols.forEach((sym) => {
      marketManager?.subscribe(sym, '1m', handleTick(sym));
    });
    return () => {
      symbols.forEach((sym) => {
        marketManager?.unsubscribe(sym, '1m');
      });
    };
  }, [symbols, checkAlerts]);

  // Add symbol handler
  const handleAddSymbol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    let finalSymbol = newSymbol.toUpperCase().trim();
    if (!finalSymbol.includes('.')) finalSymbol += '.NS';
    addSymbol(finalSymbol);
    setNewSymbol('');
  };

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    const id = await createWatchlist(newWatchlistName.trim());
    if (id) {
      setNewWatchlistName('');
      setIsCreating(false);
    }
  };

  const handleRenameWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWatchlistId || !renameValue.trim()) return;
    await renameWatchlist(activeWatchlistId, renameValue.trim());
    setIsRenaming(false);
  };

  const handleDeleteWatchlist = async () => {
    if (!activeWatchlistId) return;
    await deleteWatchlist(activeWatchlistId);
    setShowDeleteConfirm(false);
  };

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

  // ─── Toggle trigger tab (always visible on right edge) ──────────────────────
  const triggerTab = (
    <button
      onClick={() => setExpanded(true)}
      title="Open Watchlist & Alerts"
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 py-3 px-1.5 bg-card border border-r-0 border-border rounded-l-xl shadow-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition cursor-pointer"
    >
      <Star className="h-4 w-4" />
      {symbols.length > 0 && (
        <span className="text-[9px] font-bold tabular-nums text-primary">{symbols.length}</span>
      )}
      <Bell className="h-4 w-4" />
      {alerts.length > 0 && (
        <span className="h-2 w-2 bg-primary rounded-full" />
      )}
      <ChevronLeft className="h-3.5 w-3.5 mt-1" />
    </button>
  );

  // ─── Collapsed: just show the trigger tab ─────────────────────────────────
  if (!expanded) {
    return triggerTab;
  }

  // ─── Expanded: overlay panel sliding from right ───────────────────────────
  return (
    <>
      {/* Backdrop — click outside to close */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={() => setExpanded(false)}
      />

      {/* Panel */}
      <aside className="fixed right-0 top-0 w-80 border-l border-border bg-card flex flex-col h-screen select-none z-50 shadow-2xl animate-slide-in-right">
      {/* Header: Tabs + Collapse button */}
      <div className="flex border-b border-border h-12 shrink-0 bg-secondary/20">
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'watchlist' 
              ? 'border-primary text-primary bg-secondary/10' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Star className="h-4 w-4" />
          <span>Watchlist</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold border-b-2 transition cursor-pointer relative ${
            activeTab === 'alerts' 
              ? 'border-primary text-primary bg-secondary/10' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Alerts</span>
          {alerts.length > 0 && (
            <span className="h-4 w-4 text-[9px] font-bold bg-primary text-white rounded-full flex items-center justify-center">
              {alerts.length}
            </span>
          )}
        </button>

        {/* Collapse button */}
        <button
          onClick={() => setExpanded(false)}
          title="Collapse panel"
          className="px-3 text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition cursor-pointer border-b-2 border-transparent"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Content wrapper */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        {activeTab === 'watchlist' ? (
          <div className="flex-1 flex flex-col gap-4">
            {/* Watchlist Selector + Actions */}
            <div className="flex flex-col gap-2 bg-secondary/20 p-3 rounded-xl border border-border/60">
              <div className="flex items-center justify-between gap-2">
                {isRenaming ? (
                  <form onSubmit={handleRenameWatchlist} className="flex-1 flex items-center gap-1">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary font-semibold"
                      autoFocus
                    />
                    <button type="submit" className="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/95 cursor-pointer">Save</button>
                    <button type="button" onClick={() => setIsRenaming(false)} className="px-2 py-1 bg-secondary text-muted-foreground text-[10px] font-bold rounded hover:bg-secondary/80 cursor-pointer">Cancel</button>
                  </form>
                ) : (
                  <div className="flex-1 flex items-center gap-2">
                    <select
                      value={activeWatchlistId || ''}
                      onChange={(e) => {
                        setActiveWatchlistId(e.target.value);
                        const wl = watchlists.find(w => w.id === e.target.value);
                        if (wl) setRenameValue(wl.name);
                        setShowDeleteConfirm(false);
                      }}
                      className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-foreground cursor-pointer focus:outline-none focus:border-primary"
                    >
                      {watchlists.map((wl) => (
                        <option key={wl.id} value={wl.id}>
                          {wl.name} ({wl.symbols.length})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreating(!isCreating);
                          setIsRenaming(false);
                          setShowDeleteConfirm(false);
                        }}
                        title="New Watchlist"
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const activeWl = watchlists.find(w => w.id === activeWatchlistId);
                          if (activeWl) {
                            setRenameValue(activeWl.name);
                            setIsRenaming(true);
                            setIsCreating(false);
                            setShowDeleteConfirm(false);
                          }
                        }}
                        title="Rename Watchlist"
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(!showDeleteConfirm);
                          setIsCreating(false);
                          setIsRenaming(false);
                        }}
                        title="Delete Watchlist"
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {isCreating && (
                <form onSubmit={handleCreateWatchlist} className="flex gap-1.5 mt-1 pt-2 border-t border-border/40">
                  <input
                    type="text"
                    value={newWatchlistName}
                    onChange={(e) => setNewWatchlistName(e.target.value)}
                    placeholder="New watchlist name"
                    className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary font-semibold"
                    autoFocus
                  />
                  <button type="submit" className="px-2.5 py-1 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary/95 cursor-pointer">
                    Create
                  </button>
                </form>
              )}

              {showDeleteConfirm && (
                <div className="mt-1 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-destructive font-semibold">
                  <span>Delete this watchlist?</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleDeleteWatchlist} className="px-2 py-0.5 bg-destructive text-white rounded hover:bg-destructive/90 cursor-pointer">Delete</button>
                    <button type="button" onClick={() => setShowDeleteConfirm(false)} className="px-2 py-0.5 bg-secondary text-foreground rounded hover:bg-secondary/80 cursor-pointer">Cancel</button>
                  </div>
                </div>
              )}
            </div>

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

            {/* Symbol list */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {symbols.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <Star className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No symbols yet.<br />Add one above or star a chart.</p>
                </div>
              )}
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
                      <span className="text-[10px] text-muted-foreground">NSE/BSE</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {price !== undefined ? price.toFixed(2) : '—'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeSymbol(sym); }}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition p-1 hover:bg-destructive/10 rounded cursor-pointer"
                        title="Remove from watchlist"
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
            {/* Create Alert */}
            <div className="p-4 rounded-xl border border-border bg-secondary/10 shrink-0">
              <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
                <BellRing className="h-4 w-4 text-primary" />
                <span>Create Alert — {activeSymbol}</span>
              </h3>

              <form onSubmit={handleCreateAlert} className="space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAlertCondition('above')}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                      alertCondition === 'above'
                        ? 'bg-bull/10 text-bull border-bull/20'
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
                        ? 'bg-bear/10 text-bear border-bear/20'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <TrendingDown className="h-3 w-3" />
                    <span>Price Below</span>
                  </button>
                </div>

                <input
                  type="number"
                  step="any"
                  required
                  placeholder={`Trigger price (e.g. ${livePrices[activeSymbol]?.toFixed(2) || '0.00'})`}
                  value={alertValue}
                  onChange={(e) => setAlertValue(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary font-mono font-semibold"
                />

                <button
                  type="submit"
                  className="w-full py-2 bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
                >
                  Create Price Alert
                </button>
              </form>
            </div>

            {/* Alert lists */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  Active Alerts
                  {alerts.length > 0 && (
                    <span className="h-4 px-1.5 text-[9px] font-bold bg-primary/10 text-primary rounded-full flex items-center justify-center">
                      {alerts.length}
                    </span>
                  )}
                </h4>
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
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Alert Log (History)
                </h4>
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
    </>
  );
}
