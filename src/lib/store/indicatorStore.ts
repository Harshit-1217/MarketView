import { create } from 'zustand';

export type IndicatorType = 
  | 'sma' | 'ema' | 'wma' | 'hma' | 'vwap' | 'bb'   // Overlay MAs
  | 'rsi' | 'macd' | 'atr' | 'stochRsi'               // Oscillators (sub-chart)
  | 'cci' | 'williamsR' | 'obv';                       // Oscillators (overlay/new)

export interface IndicatorInstance {
  id: string;
  type: IndicatorType;
  name: string;
  color: string;
  params: {
    period?: number;
    multiplier?: number;      // BB
    fastPeriod?: number;      // MACD
    slowPeriod?: number;      // MACD
    signalPeriod?: number;    // MACD
    rsiPeriod?: number;       // StochRSI
    stochPeriod?: number;     // StochRSI
    kPeriod?: number;         // StochRSI
    dPeriod?: number;         // StochRSI
    tenkanPeriod?: number;    // Ichimoku
    kijunPeriod?: number;     // Ichimoku
    senkouBPeriod?: number;   // Ichimoku
  };
}

interface IndicatorState {
  chartIndicators: Record<string, IndicatorInstance[]>;
  addIndicator: (chartId: string, type: IndicatorType) => void;
  removeIndicator: (chartId: string, id: string) => void;
  updateIndicatorParams: (chartId: string, id: string, params: Partial<IndicatorInstance['params']>) => void;
  updateIndicatorColor: (chartId: string, id: string, color: string) => void;
}

const DEFAULT_INDICATORS: IndicatorInstance[] = [
  { id: 'ind-sma-9',  type: 'sma', name: 'SMA 9',  color: '#f2994a', params: { period: 9 } },
  { id: 'ind-ema-21', type: 'ema', name: 'EMA 21', color: '#2f80ed', params: { period: 21 } },
];

function makeIndicator(type: IndicatorType): IndicatorInstance {
  const id = `ind-${type}-${Date.now()}`;
  switch (type) {
    case 'sma':       return { id, type, name: 'SMA 50',          color: '#eb5757', params: { period: 50 } };
    case 'ema':       return { id, type, name: 'EMA 50',          color: '#9b51e0', params: { period: 50 } };
    case 'wma':       return { id, type, name: 'WMA 20',          color: '#f2c94c', params: { period: 20 } };
    case 'hma':       return { id, type, name: 'HMA 20',          color: '#6fcf97', params: { period: 20 } };
    case 'vwap':      return { id, type, name: 'VWAP',            color: '#27ae60', params: {} };
    case 'bb':        return { id, type, name: 'Bollinger Bands', color: '#2d9cdb', params: { period: 20, multiplier: 2 } };
    case 'rsi':       return { id, type, name: 'RSI 14',          color: '#e0e0e0', params: { period: 14 } };
    case 'macd':      return { id, type, name: 'MACD',            color: '#2962ff', params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 } };
    case 'atr':       return { id, type, name: 'ATR 14',          color: '#f2c94c', params: { period: 14 } };
    case 'stochRsi':  return { id, type, name: 'Stoch RSI',       color: '#2d9cdb', params: { rsiPeriod: 14, stochPeriod: 14, kPeriod: 3, dPeriod: 3 } };
    case 'cci':       return { id, type, name: 'CCI 20',          color: '#bb6bd9', params: { period: 20 } };
    case 'williamsR': return { id, type, name: 'Williams %R',     color: '#f97316', params: { period: 14 } };
    case 'obv':       return { id, type, name: 'OBV',             color: '#06b6d4', params: {} };
  }
}

export const useIndicatorStore = create<IndicatorState>((set, get) => ({
  chartIndicators: {
    'chart-0': DEFAULT_INDICATORS,
    'chart-1': [],
    'chart-2': [],
    'chart-3': [],
  },

  addIndicator: (chartId, type) => {
    const { chartIndicators } = get();
    const current = chartIndicators[chartId] || [];
    set({ chartIndicators: { ...chartIndicators, [chartId]: [...current, makeIndicator(type)] } });
  },

  removeIndicator: (chartId, id) => {
    const { chartIndicators } = get();
    const current = chartIndicators[chartId] || [];
    set({ chartIndicators: { ...chartIndicators, [chartId]: current.filter(ind => ind.id !== id) } });
  },

  updateIndicatorParams: (chartId, id, params) => {
    const { chartIndicators } = get();
    const current = chartIndicators[chartId] || [];
    set({
      chartIndicators: {
        ...chartIndicators,
        [chartId]: current.map(ind => {
          if (ind.id !== id) return ind;
          const newParams = { ...ind.params, ...params };
          let name = ind.name;
          if (ind.type === 'sma'  && params.period)  name = `SMA ${params.period}`;
          if (ind.type === 'ema'  && params.period)  name = `EMA ${params.period}`;
          if (ind.type === 'wma'  && params.period)  name = `WMA ${params.period}`;
          if (ind.type === 'hma'  && params.period)  name = `HMA ${params.period}`;
          if (ind.type === 'bb'   && params.period)  name = `BB ${params.period}`;
          if (ind.type === 'rsi'  && params.period)  name = `RSI ${params.period}`;
          if (ind.type === 'atr'  && params.period)  name = `ATR ${params.period}`;
          if (ind.type === 'cci'  && params.period)  name = `CCI ${params.period}`;
          if (ind.type === 'williamsR' && params.period) name = `Williams %R ${params.period}`;
          return { ...ind, name, params: newParams };
        }),
      }
    });
  },

  updateIndicatorColor: (chartId, id, color) => {
    const { chartIndicators } = get();
    const current = chartIndicators[chartId] || [];
    set({ chartIndicators: { ...chartIndicators, [chartId]: current.map(ind => ind.id === id ? { ...ind, color } : ind) } });
  },
}));
