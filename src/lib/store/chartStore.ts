import { create } from 'zustand';

export type ChartLayoutType = '1' | '2' | '4';
export type ChartSeriesType = 'candlestick' | 'line' | 'area';

export interface ChartConfig {
  id: string;
  symbol: string;
  timeframe: string;
  chartType: ChartSeriesType;
}

interface ChartState {
  layout: ChartLayoutType;
  charts: ChartConfig[];
  activeChartId: string;
  syncCrosshair: boolean;
  syncTimeframe: boolean;
  crosshairPosition: { time: number; price: number } | null;
  
  // Setters
  setLayout: (layout: ChartLayoutType) => void;
  setActiveChartId: (id: string) => void;
  updateChartConfig: (id: string, updates: Partial<Omit<ChartConfig, 'id'>>) => void;
  setSyncCrosshair: (sync: boolean) => void;
  setSyncTimeframe: (sync: boolean) => void;
  setCrosshairPosition: (pos: { time: number; price: number } | null) => void;
}

const DEFAULT_CHARTS: ChartConfig[] = [
  { id: 'chart-0', symbol: 'BTCUSDT', timeframe: '1h', chartType: 'candlestick' },
  { id: 'chart-1', symbol: 'ETHUSDT', timeframe: '1h', chartType: 'candlestick' },
  { id: 'chart-2', symbol: 'SOLUSDT', timeframe: '1h', chartType: 'candlestick' },
  { id: 'chart-3', symbol: 'BNBUSDT', timeframe: '1h', chartType: 'candlestick' },
];

export const useChartStore = create<ChartState>((set, get) => ({
  layout: '1',
  charts: DEFAULT_CHARTS,
  activeChartId: 'chart-0',
  syncCrosshair: true,
  syncTimeframe: false,
  crosshairPosition: null,

  setLayout: (layout) => {
    set({ layout });
  },
  
  setActiveChartId: (activeChartId) => {
    set({ activeChartId });
  },

  updateChartConfig: (id, updates) => {
    const { charts, syncTimeframe } = get();
    const targetChart = charts.find(c => c.id === id);
    if (!targetChart) return;

    let updatedCharts = charts.map((c) => {
      if (c.id === id) {
        return { ...c, ...updates };
      }
      
      // If syncTimeframe is active and we are updating timeframe, apply to all charts
      if (syncTimeframe && updates.timeframe && c.id !== id) {
        return { ...c, timeframe: updates.timeframe };
      }
      
      return c;
    });

    set({ charts: updatedCharts });
  },

  setSyncCrosshair: (syncCrosshair) => {
    set({ syncCrosshair });
  },

  setSyncTimeframe: (syncTimeframe) => {
    const { charts, activeChartId } = get();
    const activeChart = charts.find(c => c.id === activeChartId);
    
    set({ syncTimeframe });
    
    // If sync becomes active, align all timeframes to active chart timeframe
    if (syncTimeframe && activeChart) {
      set({
        charts: charts.map((c) => ({
          ...c,
          timeframe: activeChart.timeframe,
        })),
      });
    }
  },

  setCrosshairPosition: (crosshairPosition) => {
    set({ crosshairPosition });
  },
}));
