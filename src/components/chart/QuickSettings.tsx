'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChartStore, ChartLayoutType, ChartSeriesType } from '@/lib/store/chartStore';
import { useWatchlistStore } from '@/lib/store/watchlistStore';
import { 
  Layout, 
  Grid2X2, 
  Square, 
  LineChart as LineChartIcon,
  Eye,
  Sliders,
  RefreshCw,
  Search,
  Loader2,
  Star,
  Columns2
} from 'lucide-react';

/* ─── Reusable tooltip ──────────────────────────────────────────────────── */
function QSTooltip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative group/qstip">
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 pointer-events-none
        opacity-0 group-hover/qstip:opacity-100 transition-all duration-150
        translate-y-1 group-hover/qstip:translate-y-0 z-[60] whitespace-nowrap">
        <div className="px-2 py-1 rounded-lg text-[11px] font-semibold shadow-xl bg-card border border-border text-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}

interface QuickSettingsProps {
  onOpenIndicators: () => void;
}

export default function QuickSettings({ onOpenIndicators }: QuickSettingsProps) {
  const { 
    layout, 
    setLayout, 
    charts, 
    activeChartId, 
    updateChartConfig,
    syncCrosshair,
    setSyncCrosshair,
    syncTimeframe,
    setSyncTimeframe
  } = useChartStore();

  const activeChart = charts.find(c => c.id === activeChartId) || charts[0];
  const [symbolInput, setSymbolInput] = useState(activeChart.symbol);

  const { symbols, addSymbol, removeSymbol } = useWatchlistStore();
  const isStarred = symbols.includes(activeChart.symbol);

  const toggleStarred = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isStarred) {
      removeSymbol(activeChart.symbol);
    } else {
      addSymbol(activeChart.symbol);
    }
  };
  
  // Search state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M'];
  const chartTypes: { id: ChartSeriesType; label: string }[] = [
    { id: 'candlestick', label: 'Candles' },
    { id: 'line', label: 'Line' },
    { id: 'area', label: 'Area' },
  ];

  // Debounced Search
  useEffect(() => {
    if (!symbolInput.trim() || symbolInput === activeChart.symbol) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
       
      setShowDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(symbolInput)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [symbolInput, activeChart.symbol]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbolInput.trim()) return;
    
    // If they just hit enter, we auto-append .NS if it lacks a suffix
    let finalSymbol = symbolInput.toUpperCase().trim();
    if (!finalSymbol.includes('.')) {
      finalSymbol += '.NS';
    }
    
    updateChartConfig(activeChartId, { symbol: finalSymbol });
    setShowDropdown(false);
  };

  const handleSelectSymbol = (sym: string) => {
    setSymbolInput(sym);
    updateChartConfig(activeChartId, { symbol: sym });
    setShowDropdown(false);
  };

  // Sync state if active chart changes
  useEffect(() => {
    if (activeChart) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSymbolInput(activeChart.symbol);
    }
  }, [activeChart]);

  return (
    <div className="h-14 flex items-center justify-between px-4 select-none shrink-0 z-40 w-full relative bg-card/85 backdrop-blur border-b border-border">
      {/* Left items: Symbol input & Timeframes */}
      <div className="flex items-center gap-3">
        {/* Symbol Search Form */}
        <div className="relative flex items-center" ref={dropdownRef}>
          <form onSubmit={handleSymbolSubmit} className="relative flex items-center">
            <input
              type="text"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="e.g. RELIANCE"
              className="w-48 bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition font-bold"
            />
            {isSearching ? (
              <Loader2 className="absolute left-2.5 h-4 w-4 text-muted-foreground animate-spin pointer-events-none" />
            ) : (
              <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            )}
            <button type="submit" className="hidden" />
          </form>

          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl shadow-2xl overflow-hidden z-50 bg-card/95 border border-border">
              <div className="max-h-72 overflow-y-auto">
                {searchResults.map((res: any, i: number) => (
                  <div
                    key={i}
                    onClick={() => handleSelectSymbol(res.symbol)}
                    className="px-4 py-3 cursor-pointer flex flex-col transition"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-foreground">{res.symbol}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                        style={{ background:'rgba(59,130,246,0.12)', color:'#3b82f6' }}>
                        {res.exchDisp || res.exchange}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate mt-0.5">{res.longname || res.shortname}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Watchlist Star Button */}
        <QSTooltip label={isStarred ? 'Remove from Watchlist' : 'Add to Watchlist'}>
          <button
            onClick={toggleStarred}
            className="p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center"
            style={isStarred
              ? { background:'rgba(245,158,11,0.12)', borderColor:'rgba(245,158,11,0.3)', color:'#f59e0b', boxShadow:'0 0 10px rgba(245,158,11,0.2)' }
              : { background:'transparent', borderColor:'rgba(255,255,255,0.08)', color:'#64748b' }
            }
            onMouseEnter={e => { if (!isStarred) { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='#e2e8f0'; }}}
            onMouseLeave={e => { if (!isStarred) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#64748b'; }}}
          >
            <Star className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
          </button>
        </QSTooltip>

        <div className="h-5 w-px hidden sm:block bg-border" />

        {/* Timeframe selector */}
        <div className="hidden sm:flex items-center p-0.5 rounded-xl border border-border bg-black/5 dark:bg-white/5">
          {timeframes.map((tf) => {
            const isSelected = activeChart.timeframe === tf;
            return (
              <QSTooltip key={tf} label={`${tf} interval`}>
                <button
                  onClick={() => updateChartConfig(activeChartId, { timeframe: tf })}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer"
                  style={isSelected
                    ? { background:'rgba(59,130,246,0.25)', color:'#60a5fa', boxShadow:'0 0 10px rgba(59,130,246,0.2)' }
                    : { color:'#64748b' }
                  }
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.color='#94a3b8'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.color='#64748b'; }}
                >
                  {tf}
                </button>
              </QSTooltip>
            );
          })}
        </div>

        {/* Mobile Timeframe Dropdown */}
        <div className="flex sm:hidden">
          <select
            value={activeChart.timeframe}
            onChange={(e) => updateChartConfig(activeChartId, { timeframe: e.target.value })}
            className="bg-secondary border border-border rounded-lg text-xs font-semibold px-2 py-1 text-foreground"
          >
            {timeframes.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Right items: Chart Types, Layout grid, sync options, indicators */}
      <div className="flex items-center gap-3">
        {/* Series Types */}
        <div className="hidden md:flex items-center p-0.5 rounded-xl border border-border bg-black/5 dark:bg-white/5">
          {chartTypes.map((t) => {
            const isSelected = activeChart.chartType === t.id;
            return (
              <QSTooltip key={t.id} label={`${t.label} chart`}>
                <button
                  onClick={() => updateChartConfig(activeChartId, { chartType: t.id })}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer"
                  style={isSelected
                    ? { background:'rgba(59,130,246,0.2)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.3)' }
                    : { color:'#64748b', border:'1px solid transparent' }
                  }
                  onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#94a3b8'; }}}
                  onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#64748b'; }}}
                >
                  {t.label}
                </button>
              </QSTooltip>
            );
          })}
        </div>

        {/* Technical Indicators */}
        <QSTooltip label="Manage Indicators">
          <button
            onClick={onOpenIndicators}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            style={{ background:'rgba(59,130,246,0.12)', color:'#3b82f6', border:'1px solid rgba(59,130,246,0.2)' }}
            onMouseEnter={e => { e.currentTarget.style.background='#3b82f6'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='transparent'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(59,130,246,0.12)'; e.currentTarget.style.color='#3b82f6'; e.currentTarget.style.borderColor='rgba(59,130,246,0.2)'; }}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Indicators</span>
          </button>
        </QSTooltip>

        <div className="h-5 w-px bg-border" />

        {/* Grid layouts configuration */}
        <div className="flex items-center p-0.5 rounded-xl border border-border bg-black/5 dark:bg-white/5">
          {([{ id: '1', label: 'Single chart', Icon: Square }, { id: '2', label: 'Split 2 charts', Icon: Columns2 }, { id: '4', label: '4-grid charts', Icon: Grid2X2 }] as const).map(({ id, label, Icon }) => (
            <QSTooltip key={id} label={label}>
              <button
                onClick={() => setLayout(id)}
                className="p-1.5 rounded-lg transition cursor-pointer"
                style={layout === id
                  ? { background:'rgba(59,130,246,0.25)', color:'#60a5fa' }
                  : { color:'#64748b' }
                }
                onMouseEnter={e => { if (layout !== id) { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='#94a3b8'; }}}
                onMouseLeave={e => { if (layout !== id) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#64748b'; }}}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            </QSTooltip>
          ))}
        </div>

        {/* Sync Toggles */}
        <div className="hidden lg:flex items-center gap-1.5">
          <QSTooltip label="Sync crosshair across all charts">
            <button
              onClick={() => setSyncCrosshair(!syncCrosshair)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
              style={syncCrosshair
                ? { background:'rgba(16,185,129,0.12)', color:'#10b981', border:'1px solid rgba(16,185,129,0.25)' }
                : { background:'transparent', color:'#64748b', border:'1px solid rgba(255,255,255,0.07)' }
              }
              onMouseEnter={e => { if (!syncCrosshair) { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#94a3b8'; }}}
              onMouseLeave={e => { if (!syncCrosshair) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#64748b'; }}}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden 2xl:inline">Crosshair</span>
            </button>
          </QSTooltip>

          <QSTooltip label="Sync timeframe across all charts">
            <button
              onClick={() => setSyncTimeframe(!syncTimeframe)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
              style={syncTimeframe
                ? { background:'rgba(16,185,129,0.12)', color:'#10b981', border:'1px solid rgba(16,185,129,0.25)' }
                : { background:'transparent', color:'#64748b', border:'1px solid rgba(255,255,255,0.07)' }
              }
              onMouseEnter={e => { if (!syncTimeframe) { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#94a3b8'; }}}
              onMouseLeave={e => { if (!syncTimeframe) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#64748b'; }}}
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
              <span className="hidden 2xl:inline">Timeframe</span>
            </button>
          </QSTooltip>
        </div>
      </div>
    </div>
  );
}
