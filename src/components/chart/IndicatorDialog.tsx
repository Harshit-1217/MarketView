'use client';

import React from 'react';
import { useIndicatorStore, IndicatorType, IndicatorInstance } from '@/lib/store/indicatorStore';
import { X, Plus, Trash2, Settings2 } from 'lucide-react';

interface IndicatorDialogProps {
  chartId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function IndicatorDialog({ chartId, isOpen, onClose }: IndicatorDialogProps) {
  const { chartIndicators, addIndicator, removeIndicator, updateIndicatorParams } = useIndicatorStore();
  const activeIndicators = chartIndicators[chartId] || [];

  if (!isOpen) return null;

  const availableIndicators: { type: IndicatorType; label: string; desc: string }[] = [
    { type: 'sma', label: 'Simple Moving Average (SMA)', desc: 'Overlay. Calculates simple moving average.' },
    { type: 'ema', label: 'Exponential Moving Average (EMA)', desc: 'Overlay. Exponentially weighted average.' },
    { type: 'vwap', label: 'Volume Weighted Average Price (VWAP)', desc: 'Overlay. Volume-weighted price reset daily.' },
    { type: 'bb', label: 'Bollinger Bands (BB)', desc: 'Overlay. Volatility bands around an SMA.' },
    { type: 'rsi', label: 'Relative Strength Index (RSI)', desc: 'Oscillator. Momentum indicator measuring overbought/oversold.' },
    { type: 'macd', label: 'Moving Average Convergence Divergence', desc: 'Oscillator. Trend-following momentum indicator.' },
    { type: 'atr', label: 'Average True Range (ATR)', desc: 'Oscillator. Volatility measurement indicator.' },
    { type: 'stochRsi', label: 'Stochastic RSI', desc: 'Oscillator. Stochastic calculation applied to RSI.' },
  ];

  const handleAdd = (type: IndicatorType) => {
    addIndicator(chartId, type);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass w-full max-w-3xl rounded-2xl shadow-2xl border border-border bg-card max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Technical Indicators</h2>
            <p className="text-xs text-muted-foreground mt-1">Add or adjust overlays and oscillators for this chart instance.</p>
          </div>
          <button 
            onClick={onClose} 
            className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body (Split columns) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2">
          {/* Available Indicators List */}
          <div className="p-6 border-r border-border overflow-y-auto max-h-[55vh]">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Available Indicators</h3>
            <div className="space-y-3">
              {availableIndicators.map((ind) => (
                <div 
                  key={ind.type} 
                  className="p-4 rounded-xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition flex items-center justify-between group"
                >
                  <div className="pr-4">
                    <h4 className="font-semibold text-sm text-foreground">{ind.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{ind.desc}</p>
                  </div>
                  <button
                    onClick={() => handleAdd(ind.type)}
                    className="h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition shrink-0 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Active Indicators Configuration */}
          <div className="p-6 overflow-y-auto max-h-[55vh]">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Active on Chart</h3>
            
            {activeIndicators.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2 border border-dashed border-border rounded-xl">
                <Settings2 className="h-8 w-8 stroke-[1.5]" />
                <span className="text-sm">No active indicators</span>
              </div>
            ) : (
              <div className="space-y-4">
                {activeIndicators.map((ind) => (
                  <div key={ind.id} className="p-4 rounded-xl border border-border bg-background flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full shrink-0" 
                          style={{ backgroundColor: ind.color }}
                        />
                        <span className="font-semibold text-sm text-foreground">{ind.name}</span>
                      </div>
                      
                      <button
                        onClick={() => removeIndicator(chartId, ind.id)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 transition cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Parameter inputs depending on indicator type */}
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {ind.params.period !== undefined && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">Length</label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={ind.params.period}
                            onChange={(e) => updateIndicatorParams(chartId, ind.id, { period: parseInt(e.target.value) || 1 })}
                            className="bg-secondary/40 border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                      )}

                      {ind.params.multiplier !== undefined && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">StdDev Mult</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="10"
                            value={ind.params.multiplier}
                            onChange={(e) => updateIndicatorParams(chartId, ind.id, { multiplier: parseFloat(e.target.value) || 1.0 })}
                            className="bg-secondary/40 border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                      )}

                      {ind.params.fastPeriod !== undefined && (
                        <>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Fast EMA</label>
                            <input
                              type="number"
                              value={ind.params.fastPeriod}
                              onChange={(e) => updateIndicatorParams(chartId, ind.id, { fastPeriod: parseInt(e.target.value) || 1 })}
                              className="bg-secondary/40 border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Slow EMA</label>
                            <input
                              type="number"
                              value={ind.params.slowPeriod}
                              onChange={(e) => updateIndicatorParams(chartId, ind.id, { slowPeriod: parseInt(e.target.value) || 1 })}
                              className="bg-secondary/40 border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div className="flex flex-col gap-1 col-span-2">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Signal Period</label>
                            <input
                              type="number"
                              value={ind.params.signalPeriod}
                              onChange={(e) => updateIndicatorParams(chartId, ind.id, { signalPeriod: parseInt(e.target.value) || 1 })}
                              className="bg-secondary/40 border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                            />
                          </div>
                        </>
                      )}

                      {ind.params.rsiPeriod !== undefined && (
                        <>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">RSI Period</label>
                            <input
                              type="number"
                              value={ind.params.rsiPeriod}
                              onChange={(e) => updateIndicatorParams(chartId, ind.id, { rsiPeriod: parseInt(e.target.value) || 1 })}
                              className="bg-secondary/40 border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Stoch Period</label>
                            <input
                              type="number"
                              value={ind.params.stochPeriod}
                              onChange={(e) => updateIndicatorParams(chartId, ind.id, { stochPeriod: parseInt(e.target.value) || 1 })}
                              className="bg-secondary/40 border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-border bg-secondary/10 gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 border border-border hover:bg-secondary rounded-xl text-sm font-medium transition cursor-pointer"
          >
            Close Dialog
          </button>
        </div>
      </div>
    </div>
  );
}
