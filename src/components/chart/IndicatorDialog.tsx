'use client';

import React, { useState } from 'react';
import { useIndicatorStore, IndicatorType, IndicatorInstance } from '@/lib/store/indicatorStore';
import { X, Plus, Trash2, Search, TrendingUp, BarChart2, Activity, Layers } from 'lucide-react';

interface IndicatorDialogProps {
  chartId: string;
  isOpen: boolean;
  onClose: () => void;
}

const INDICATOR_CATALOG: {
  type: IndicatorType;
  label: string;
  short: string;
  desc: string;
  category: 'overlay' | 'oscillator' | 'volume';
  color: string;
}[] = [
  // ─── Overlays ────────────────────────────────────────────────────────
  { type: 'sma',       label: 'Simple Moving Average',          short: 'SMA',       desc: 'Arithmetic mean of closing prices over N periods. Classic trend-following overlay.',             category: 'overlay',    color: '#f2994a' },
  { type: 'ema',       label: 'Exponential Moving Average',     short: 'EMA',       desc: 'Exponentially-weighted average giving more weight to recent closes. Reacts faster than SMA.',    category: 'overlay',    color: '#9b51e0' },
  { type: 'wma',       label: 'Weighted Moving Average',        short: 'WMA',       desc: 'Linearly-weighted MA giving the latest bar the highest weight.',                                  category: 'overlay',    color: '#f2c94c' },
  { type: 'hma',       label: 'Hull Moving Average',            short: 'HMA',       desc: 'Smooth, low-lag MA by Alan Hull. Excellent for trend direction and entry timing.',               category: 'overlay',    color: '#6fcf97' },
  { type: 'vwap',      label: 'Volume Weighted Avg Price',      short: 'VWAP',      desc: 'Daily reset price weighted by volume. Used by institutions as a fair-value benchmark.',          category: 'overlay',    color: '#27ae60' },
  { type: 'bb',        label: 'Bollinger Bands',                short: 'BB',        desc: 'Upper & lower bands at ±N std deviations around SMA. Measures volatility and mean-reversion.',  category: 'overlay',    color: '#2d9cdb' },
  // ─── Oscillators ─────────────────────────────────────────────────────
  { type: 'rsi',       label: 'Relative Strength Index',        short: 'RSI',       desc: 'Momentum oscillator 0–100. >70 overbought, <30 oversold (Wilder smoothing).',                   category: 'oscillator', color: '#e0e0e0' },
  { type: 'macd',      label: 'MACD',                           short: 'MACD',      desc: 'Difference of fast/slow EMAs with a signal EMA and histogram. Classic trend momentum.',         category: 'oscillator', color: '#2962ff' },
  { type: 'atr',       label: 'Average True Range',             short: 'ATR',       desc: 'Wilder\'s volatility measure using the true range of each bar. Essential for position sizing.',  category: 'oscillator', color: '#f2c94c' },
  { type: 'stochRsi',  label: 'Stochastic RSI',                 short: 'Stoch RSI', desc: 'Stochastic formula applied to RSI. Faster than RSI alone — %K and %D lines.',                  category: 'oscillator', color: '#2d9cdb' },
  { type: 'cci',       label: 'Commodity Channel Index',        short: 'CCI',       desc: 'Measures deviation from typical price mean. >100 signals strong trend, <-100 reversal zone.',  category: 'oscillator', color: '#bb6bd9' },
  { type: 'williamsR', label: 'Williams %R',                    short: '%R',        desc: 'Momentum oscillator -100–0. Near 0 = overbought, near -100 = oversold.',                        category: 'oscillator', color: '#f97316' },
  // ─── Volume ──────────────────────────────────────────────────────────
  { type: 'obv',       label: 'On-Balance Volume',              short: 'OBV',       desc: 'Cumulative volume direction indicator. Divergence from price often precedes reversals.',        category: 'volume',     color: '#06b6d4' },
];

const CATEGORY_META = {
  overlay:    { label: 'Moving Averages & Overlays', icon: TrendingUp,  color: '#3b82f6' },
  oscillator: { label: 'Oscillators',                icon: Activity,    color: '#8b5cf6' },
  volume:     { label: 'Volume',                     icon: BarChart2,   color: '#06b6d4' },
};

export default function IndicatorDialog({ chartId, isOpen, onClose }: IndicatorDialogProps) {
  const { chartIndicators, addIndicator, removeIndicator, updateIndicatorParams, updateIndicatorColor } = useIndicatorStore();
  const activeIndicators = chartIndicators[chartId] || [];
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'overlay' | 'oscillator' | 'volume'>('all');

  if (!isOpen) return null;

  const filtered = INDICATOR_CATALOG.filter(ind => {
    const matchSearch = search === '' ||
      ind.label.toLowerCase().includes(search.toLowerCase()) ||
      ind.short.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'all' || ind.category === activeCategory;
    return matchSearch && matchCat;
  });

  const grouped = (['overlay', 'oscillator', 'volume'] as const).map(cat => ({
    cat,
    items: filtered.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,17,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-4xl rounded-3xl flex flex-col animate-slide-up overflow-hidden"
        style={{
          maxHeight: '88vh',
          background: 'rgba(13,17,23,0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 0 0 1px rgba(59,130,246,0.1), 0 40px 100px rgba(0,0,0,0.7)',
        }}
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-start justify-between p-6 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: '0 0 16px rgba(59,130,246,0.4)' }}>
                <Layers className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">Technical Indicators</h2>
            </div>
            <p className="text-xs text-muted-foreground ml-10">Add overlays and oscillators · {activeIndicators.length} active</p>
          </div>
          <button onClick={onClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white transition cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Search + Category Filter ───────────────────────────── */}
        <div className="px-6 pt-4 pb-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search indicators…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              autoFocus
            />
          </div>
          <div className="flex items-center gap-1.5 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {(['all', 'overlay', 'oscillator', 'volume'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition cursor-pointer"
                style={activeCategory === cat
                  ? { background: 'rgba(59,130,246,0.2)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }
                  : { color: '#64748b', border: '1px solid transparent' }
                }
              >
                {cat === 'all' ? 'All' : CATEGORY_META[cat].label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-0">
          {/* Left: Catalog */}
          <div className="overflow-y-auto p-4 pt-2" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            {grouped.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Search className="h-8 w-8 opacity-30" />
                <p className="text-sm">No indicators match &ldquo;{search}&rdquo;</p>
              </div>
            )}
            {grouped.map(({ cat, items }) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              return (
                <div key={cat} className="mb-5">
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {items.map(ind => {
                      const alreadyActive = activeIndicators.some(a => a.type === ind.type);
                      return (
                        <div
                          key={ind.type}
                          className="flex items-center gap-3 p-3 rounded-xl group cursor-pointer transition-all"
                          style={{ border: '1px solid rgba(255,255,255,0.04)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
                        >
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 font-black text-[10px]"
                            style={{ background: `${ind.color}18`, color: ind.color, border: `1px solid ${ind.color}30` }}>
                            {ind.short.slice(0, 3)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-foreground/90">{ind.label}</span>
                              {alreadyActive && (
                                <span className="text-[9px] font-bold px-1.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{ind.desc}</p>
                          </div>
                          <button
                            onClick={() => addIndicator(chartId, ind.type)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition cursor-pointer"
                            style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.color = '#3b82f6'; }}
                            title={`Add ${ind.label}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Active indicators config */}
          <div className="overflow-y-auto p-4 pt-2">
            <div className="flex items-center gap-2 px-1 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Active on this chart
              </span>
              {activeIndicators.length > 0 && (
                <span className="h-4 px-1.5 text-[9px] font-bold rounded-full flex items-center"
                  style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                  {activeIndicators.length}
                </span>
              )}
            </div>

            {activeIndicators.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground rounded-2xl"
                style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
                <Layers className="h-8 w-8 opacity-30" />
                <span className="text-sm">No active indicators</span>
                <span className="text-xs opacity-60">Click + to add from the list</span>
              </div>
            ) : (
              <div className="space-y-2">
                {activeIndicators.map(ind => (
                  <div key={ind.id} className="rounded-xl p-4"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {/* Clickable color swatch */}
                        <label className="relative cursor-pointer group">
                          <input
                            type="color"
                            value={ind.color}
                            onChange={e => updateIndicatorColor(chartId, ind.id, e.target.value)}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            title="Change color"
                          />
                          <div className="h-4 w-4 rounded-full border-2 border-white/20 transition group-hover:scale-110"
                            style={{ background: ind.color, boxShadow: `0 0 8px ${ind.color}60` }} />
                        </label>
                        <span className="text-sm font-bold text-foreground">{ind.name}</span>
                      </div>
                      <button
                        onClick={() => removeIndicator(chartId, ind.id)}
                        className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground transition cursor-pointer"
                        style={{ border: '1px solid transparent' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = ''; e.currentTarget.style.borderColor = 'transparent'; }}
                        title="Remove indicator"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Parameter inputs */}
                    <div className="grid grid-cols-2 gap-2">
                      {ind.params.period !== undefined && (
                        <ParamInput label="Length" value={ind.params.period} min={1} max={500}
                          onChange={v => updateIndicatorParams(chartId, ind.id, { period: v })} />
                      )}
                      {ind.params.multiplier !== undefined && (
                        <ParamInput label="Std Dev" value={ind.params.multiplier} step={0.1} min={0.1} max={10} float
                          onChange={v => updateIndicatorParams(chartId, ind.id, { multiplier: v })} />
                      )}
                      {ind.params.fastPeriod !== undefined && <>
                        <ParamInput label="Fast EMA" value={ind.params.fastPeriod!} min={1} max={200}
                          onChange={v => updateIndicatorParams(chartId, ind.id, { fastPeriod: v })} />
                        <ParamInput label="Slow EMA" value={ind.params.slowPeriod!} min={1} max={200}
                          onChange={v => updateIndicatorParams(chartId, ind.id, { slowPeriod: v })} />
                        <ParamInput label="Signal" value={ind.params.signalPeriod!} min={1} max={100}
                          onChange={v => updateIndicatorParams(chartId, ind.id, { signalPeriod: v })} />
                      </>}
                      {ind.params.rsiPeriod !== undefined && <>
                        <ParamInput label="RSI Period" value={ind.params.rsiPeriod!} min={1} max={100}
                          onChange={v => updateIndicatorParams(chartId, ind.id, { rsiPeriod: v })} />
                        <ParamInput label="Stoch Period" value={ind.params.stochPeriod!} min={1} max={100}
                          onChange={v => updateIndicatorParams(chartId, ind.id, { stochPeriod: v })} />
                        <ParamInput label="%K Period" value={ind.params.kPeriod!} min={1} max={50}
                          onChange={v => updateIndicatorParams(chartId, ind.id, { kPeriod: v })} />
                        <ParamInput label="%D Period" value={ind.params.dPeriod!} min={1} max={50}
                          onChange={v => updateIndicatorParams(chartId, ind.id, { dPeriod: v })} />
                      </>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="flex justify-end px-6 py-4 gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable param input ───────────────────────────────────────────────── */
function ParamInput({ label, value, min, max, step, float, onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number; float?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? (float ? 0.1 : 1)}
        onChange={e => onChange(float ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 1)}
        className="w-full px-2.5 py-1.5 rounded-lg text-xs text-foreground font-mono"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
        onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
      />
    </div>
  );
}
