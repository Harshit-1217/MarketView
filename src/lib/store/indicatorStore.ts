import { create } from 'zustand';

export type IndicatorType = 'sma' | 'ema' | 'vwap' | 'bb' | 'rsi' | 'macd' | 'atr' | 'stochRsi';

export interface IndicatorInstance {
  id: string;
  type: IndicatorType;
  name: string;
  color: string;
  params: {
    period?: number;
    multiplier?: number; // BB
    fastPeriod?: number; // MACD
    slowPeriod?: number; // MACD
    signalPeriod?: number; // MACD
    rsiPeriod?: number; // StochRSI
    stochPeriod?: number; // StochRSI
    kPeriod?: number; // StochRSI
    dPeriod?: number; // StochRSI
  };
}

interface IndicatorState {
  chartIndicators: Record<string, IndicatorInstance[]>; // Map chartId -> list of indicators
  
  addIndicator: (chartId: string, type: IndicatorType) => void;
  removeIndicator: (chartId: string, id: string) => void;
  updateIndicatorParams: (chartId: string, id: string, params: Partial<IndicatorInstance['params']>) => void;
  updateIndicatorColor: (chartId: string, id: string, color: string) => void;
}

const DEFAULT_INDICATORS: IndicatorInstance[] = [
  { id: 'ind-sma-9', type: 'sma', name: 'SMA 9', color: '#f2994a', params: { period: 9 } },
  { id: 'ind-ema-21', type: 'ema', name: 'EMA 21', color: '#2f80ed', params: { period: 21 } },
];

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
    
    // Generate default settings based on type
    let newIndicator: IndicatorInstance;
    const randId = `ind-${type}-${Date.now()}`;
    
    switch (type) {
      case 'sma':
        newIndicator = { id: randId, type: 'sma', name: 'SMA 50', color: '#eb5757', params: { period: 50 } };
        break;
      case 'ema':
        newIndicator = { id: randId, type: 'ema', name: 'EMA 50', color: '#9b51e0', params: { period: 50 } };
        break;
      case 'vwap':
        newIndicator = { id: randId, type: 'vwap', name: 'VWAP', color: '#27ae60', params: {} };
        break;
      case 'bb':
        newIndicator = { id: randId, type: 'bb', name: 'Bollinger Bands', color: '#2d9cdb', params: { period: 20, multiplier: 2 } };
        break;
      case 'rsi':
        newIndicator = { id: randId, type: 'rsi', name: 'RSI', color: '#e0e0e0', params: { period: 14 } };
        break;
      case 'macd':
        newIndicator = { id: randId, type: 'macd', name: 'MACD', color: '#2962ff', params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 } };
        break;
      case 'atr':
        newIndicator = { id: randId, type: 'atr', name: 'ATR', color: '#f2c94c', params: { period: 14 } };
        break;
      case 'stochRsi':
        newIndicator = { id: randId, type: 'stochRsi', name: 'Stoch RSI', color: '#2d9cdb', params: { rsiPeriod: 14, stochPeriod: 14, kPeriod: 3, dPeriod: 3 } };
        break;
    }

    set({
      chartIndicators: {
        ...chartIndicators,
        [chartId]: [...current, newIndicator],
      }
    });
  },

  removeIndicator: (chartId, id) => {
    const { chartIndicators } = get();
    const current = chartIndicators[chartId] || [];
    
    set({
      chartIndicators: {
        ...chartIndicators,
        [chartId]: current.filter((ind) => ind.id !== id),
      }
    });
  },

  updateIndicatorParams: (chartId, id, params) => {
    const { chartIndicators } = get();
    const current = chartIndicators[chartId] || [];
    
    set({
      chartIndicators: {
        ...chartIndicators,
        [chartId]: current.map((ind) => {
          if (ind.id !== id) return ind;
          const newParams = { ...ind.params, ...params };
          let name = ind.name;
          
          if (ind.type === 'sma' && params.period) name = `SMA ${params.period}`;
          if (ind.type === 'ema' && params.period) name = `EMA ${params.period}`;
          if (ind.type === 'bb' && params.period) name = `BB ${params.period}`;
          if (ind.type === 'rsi' && params.period) name = `RSI ${params.period}`;
          if (ind.type === 'atr' && params.period) name = `ATR ${params.period}`;
          
          return {
            ...ind,
            name,
            params: newParams,
          };
        }),
      }
    });
  },

  updateIndicatorColor: (chartId, id, color) => {
    const { chartIndicators } = get();
    const current = chartIndicators[chartId] || [];
    
    set({
      chartIndicators: {
        ...chartIndicators,
        [chartId]: current.map((ind) => 
          ind.id === id ? { ...ind, color } : ind
        ),
      }
    });
  }
}));
