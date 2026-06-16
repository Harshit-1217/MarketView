'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChartStore, ChartLayoutType, ChartSeriesType } from '@/lib/store/chartStore';
import { 
  Layout, 
  Grid2X2, 
  Square, 
  LineChart as LineChartIcon,
  Eye,
  Sliders,
  RefreshCw,
  Search,
  Loader2
} from 'lucide-react';

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
  
  // Search state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];
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
    <div className="h-14 border-b border-border bg-card/40 backdrop-blur-md flex items-center justify-between px-4 select-none shrink-0 z-10 w-full relative">
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

          {/* Search Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
              <div className="max-h-64 overflow-y-auto">
                {searchResults.map((res: any, i: number) => (
                  <div
                    key={i}
                    onClick={() => handleSelectSymbol(res.symbol)}
                    className="px-3 py-2 hover:bg-secondary/60 cursor-pointer flex flex-col transition border-b border-border/50 last:border-0"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-foreground">{res.symbol}</span>
                      <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{res.exchDisp || res.exchange}</span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{res.longname || res.shortname}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-border hidden sm:block" />

        {/* Timeframe selector */}
        <div className="hidden sm:flex items-center bg-secondary/60 p-0.5 rounded-lg border border-border">
          {timeframes.map((tf) => {
            const isSelected = activeChart.timeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => updateChartConfig(activeChartId, { timeframe: tf })}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  isSelected 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tf}
              </button>
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
      <div className="flex items-center gap-4">
        {/* Series Types */}
        <div className="hidden md:flex items-center bg-secondary/60 p-0.5 rounded-lg border border-border">
          {chartTypes.map((t) => {
            const isSelected = activeChart.chartType === t.id;
            return (
              <button
                key={t.id}
                onClick={() => updateChartConfig(activeChartId, { chartType: t.id })}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  isSelected 
                    ? 'bg-primary/20 text-primary border border-primary/20' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Technical Indicators */}
        <button
          onClick={onOpenIndicators}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Indicators</span>
        </button>

        <div className="h-5 w-px bg-border" />

        {/* Grid layouts configuration */}
        <div className="flex items-center bg-secondary/60 p-0.5 rounded-lg border border-border">
          <button
            onClick={() => setLayout('1')}
            title="Single Chart Layout"
            className={`p-1.5 rounded-md transition cursor-pointer ${
              layout === '1' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Square className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setLayout('2')}
            title="Split Chart Layout"
            className={`p-1.5 rounded-md transition cursor-pointer ${
              layout === '2' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layout className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setLayout('4')}
            title="4 Chart Grid Layout"
            className={`p-1.5 rounded-md transition cursor-pointer ${
              layout === '4' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Grid2X2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Sync Toggles */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => setSyncCrosshair(!syncCrosshair)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              syncCrosshair 
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                : 'text-muted-foreground border-border hover:bg-secondary'
            }`}
            title="Synchronize cursor crosshairs across splits"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Sync Crosshair</span>
          </button>

          <button
            onClick={() => setSyncTimeframe(!syncTimeframe)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              syncTimeframe 
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                : 'text-muted-foreground border-border hover:bg-secondary'
            }`}
            title="Synchronize timeframe interval changes across splits"
          >
            <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
            <span>Sync Timeframe</span>
          </button>
        </div>
      </div>
    </div>
  );
}
