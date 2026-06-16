'use client';

import React, { useState } from 'react';
import { useChartStore, ChartLayoutType, ChartSeriesType } from '@/lib/store/chartStore';
import { 
  Layout, 
  Grid2X2, 
  Square, 
  LineChart as LineChartIcon,
  Eye,
  Sliders,
  RefreshCw,
  Search
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

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];
  const chartTypes: { id: ChartSeriesType; label: string }[] = [
    { id: 'candlestick', label: 'Candles' },
    { id: 'line', label: 'Line' },
    { id: 'area', label: 'Area' },
  ];

  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbolInput.trim()) return;
    updateChartConfig(activeChartId, { symbol: symbolInput.toUpperCase().trim() });
  };

  // Sync state if active chart changes
  React.useEffect(() => {
    if (activeChart) {
      setSymbolInput(activeChart.symbol);
    }
  }, [activeChart]);

  return (
    <div className="h-14 border-b border-border bg-card/40 backdrop-blur-md flex items-center justify-between px-4 select-none shrink-0 z-10 w-full">
      {/* Left items: Symbol input & Timeframes */}
      <div className="flex items-center gap-3">
        {/* Symbol Search Form */}
        <form onSubmit={handleSymbolSubmit} className="relative flex items-center">
          <input
            type="text"
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value)}
            placeholder="Search pair..."
            className="w-32 bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition font-bold"
          />
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <button type="submit" className="hidden" />
        </form>

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
