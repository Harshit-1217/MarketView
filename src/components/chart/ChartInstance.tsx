'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useWatchlistStore } from '@/lib/store/watchlistStore';
import { useChartStore, ChartConfig, ChartSeriesType } from '@/lib/store/chartStore';
import { useIndicatorStore, IndicatorInstance } from '@/lib/store/indicatorStore';
import { useDrawingStore, Drawing, DrawingPoint, DrawingProperties } from '@/lib/store/drawingStore';
import { fetchHistoricalCandles, Candle } from '@/lib/market/client';
import { marketManager } from '@/lib/market/polling';
import { 
  calculateSMA, 
  calculateEMA, 
  calculateWMA,
  calculateHMA,
  calculateVWAP, 
  calculateBollingerBands, 
  calculateRSI, 
  calculateMACD,
  calculateATR,
  calculateStochRSI,
  calculateCCI,
  calculateWilliamsR,
  calculateOBV,
  calculateSupertrend,
  calculateStochastic,
  calculatePivotPoints,
} from '@/lib/indicators/technicals';
import { Star } from 'lucide-react';
import { findClosestDrawing as findClosestDrawingLib, findClosestDrawingPoint } from '@/lib/drawing/hitDetection';
import { renderAllDrawings } from '@/lib/drawing/renderers';
import { FloatingToolbar } from './FloatingToolbar';

interface ChartInstanceProps {
  config: ChartConfig;
  onOpenIndicators: () => void;
}

export default function ChartInstance({ config, onOpenIndicators }: ChartInstanceProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Measured container size (pixels) — chart only renders when > 0
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // States
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ohlc, setOhlc] = useState<{ o: number; h: number; l: number; c: number; v: number; t?: number } | null>(null);

  // Store bindings
  const { activeChartId, setActiveChartId, syncCrosshair, crosshairPosition, setCrosshairPosition } = useChartStore();
  const { indicators } = useIndicatorStore();
  const { drawings, activeTool, setActiveTool, currentColor, currentWidth, addDrawing, updateDrawing, deleteDrawing, fetchDrawings, isMagnetModeEnabled, isDrawingModeLocked, areDrawingsLocked, areDrawingsHidden, setCurrentColor, setCurrentWidth } = useDrawingStore();
  const { symbols, addSymbol, removeSymbol } = useWatchlistStore();

  const isStarred = symbols.includes(config.symbol);

  const toggleStarred = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isStarred) {
      removeSymbol(config.symbol);
    } else {
      addSymbol(config.symbol);
    }
  };

  // Active drawings for this symbol
  const activeDrawings = drawings.filter((d) => d.symbol === config.symbol);

  // Active chart objects
  const chartObj = useRef<any>(null);
  const mainSeriesObj = useRef<any>(null);

  // Dynamic oscillator sub-panel system
  const oscPanelRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const oscChartObjs = useRef<Map<string, any>>(new Map());

  // Indicators overlay series objects map
  const indicatorSeriesMap = useRef<Map<string, any[]>>(new Map());

  // Drawing state tracking
  const [drawingPoints, setDrawingPoints] = useState<DrawingPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textModal, setTextModal] = useState<{ open: boolean; x: number; y: number; time: number; price: number } | null>(null);
  const [textInput, setTextInput] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectedDrawing, setSelectedDrawing] = useState<{ id: string; x: number; y: number } | null>(null);
  const [isDraggingUI, setIsDraggingUI] = useState(false);
  const dragStateRef = useRef<{
    id: string;
    type: 'point' | 'body';
    pointIndex?: number;
    startX: number;
    startY: number;
    originalPoints: DrawingPoint[];
    currentPoints: DrawingPoint[];
  } | null>(null);
  const isCrosshairActiveRef = useRef(false);
  const isCanvasInteractiveRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  const drawDrawingsRef = useRef<(() => void) | null>(null);

  const isActive = activeChartId === config.id;

  const activeDrawingsRef = useRef(activeDrawings);
  const drawingPointsRef = useRef(drawingPoints);
  const isDrawingRef = useRef(isDrawing);
  const activeToolRef = useRef(activeTool);
  const currentColorRef = useRef(currentColor);
  const currentWidthRef = useRef(currentWidth);
  const areDrawingsHiddenRef = useRef(areDrawingsHidden);

  useEffect(() => {
    activeDrawingsRef.current = activeDrawings;
    drawingPointsRef.current = drawingPoints;
    isDrawingRef.current = isDrawing;
    activeToolRef.current = activeTool;
    currentColorRef.current = currentColor;
    currentWidthRef.current = currentWidth;
    areDrawingsHiddenRef.current = areDrawingsHidden;
  }, [activeDrawings, drawingPoints, isDrawing, activeTool, currentColor, currentWidth, areDrawingsHidden]);

  useEffect(() => {
    if (canvasRef.current) {
      const isDrawingTool = activeTool && !['crosshair', 'dot', 'arrowCursor'].includes(activeTool as string);
      if (isDrawingTool && !areDrawingsLocked) {
        canvasRef.current.style.pointerEvents = 'auto';
      } else if (!isCanvasInteractiveRef.current) {
        canvasRef.current.style.pointerEvents = 'none';
      }
    }
  }, [activeTool, areDrawingsLocked]);

  // Oscillator types that need sub-panels (not overlays)
  const OSCILLATOR_TYPES = ['rsi', 'macd', 'atr', 'stochRsi', 'stochastic', 'cci', 'williamsR', 'obv'];
  const oscIndicators = indicators.filter(ind => OSCILLATOR_TYPES.includes(ind.type));
  const hasOscillators = oscIndicators.length > 0;

  // ─── Measure the outer container to get real pixel dimensions ───
  useEffect(() => {
    if (!outerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        console.log('[ChartInstance] ResizeObserver contentRect:', width, height);
        if (width > 0 && height > 0) {
          setContainerSize({ w: Math.floor(width), h: Math.floor(height) });
        }
      }
    });
    ro.observe(outerRef.current);
    // Initial measurement
    const rect = outerRef.current.getBoundingClientRect();
    console.log('[ChartInstance] Initial getBoundingClientRect:', rect.width, rect.height);
    if (rect.width > 0 && rect.height > 0) {
      setContainerSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    }
    return () => ro.disconnect();
  }, []);

  // Load Drawings for symbol on mount/change
  useEffect(() => {
    fetchDrawings(config.symbol);
  }, [config.symbol, fetchDrawings]);

  // Redraw when drawing points or active drawings update
  useEffect(() => {
    if (drawDrawingsRef.current) {
      drawDrawingsRef.current();
    }
  }, [drawingPoints, activeDrawings, isDrawing, areDrawingsHidden]);

  // Main Chart instantiation & Historical Loading
  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchHistoricalCandles(config.symbol, config.timeframe, 1000);
        if (!active) return;
        setCandles(data);
        if (data.length > 0) {
          const last = data[data.length - 1];
          setOhlc({ o: last.open, h: last.high, l: last.low, c: last.close, v: last.volume });
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to fetch market data from Binance.');
      } finally {
        setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [config.symbol, config.timeframe]);

  // ─── Construct / update charts when we have data AND a measured container ───
  const [initialSizeSet, setInitialSizeSet] = useState(false);
  useEffect(() => {
    if (containerSize.w > 0 && containerSize.h > 0 && !initialSizeSet) {
      const timer = setTimeout(() => {
        setInitialSizeSet(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [containerSize.w, containerSize.h, initialSizeSet]);

  useEffect(() => {
    console.log('[ChartInstance] Chart effect: loading=', loading, 'candles=', candles.length, 'containerSize=', containerSize, 'mainChartRef=', !!mainChartRef.current);
    if (loading || candles.length === 0) return;
    if (!initialSizeSet) return;
    if (!mainChartRef.current) return;
    console.log('[ChartInstance] Creating chart with dimensions:', containerSize.w, 'x', containerSize.h);

    // Dynamically load Lightweight Charts library
    let destroyed = false;
    import('lightweight-charts').then((LW) => {
      if (destroyed || !mainChartRef.current) return;

      // Clean existing container children
      mainChartRef.current.innerHTML = '';
      oscChartObjs.current.forEach((chart) => { try { chart.remove(); } catch(e) {} });
      oscChartObjs.current.clear();
      oscPanelRefs.current.forEach((el) => { el.innerHTML = ''; });

      const isLight = document.documentElement.classList.contains('light');

      const baseChartOptions: any = {
        layout: {
          background: { type: LW.ColorType.Solid, color: isLight ? '#ffffff' : '#131722' },
          textColor: isLight ? '#0f172a' : '#d1d4dc',
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: isLight ? 'rgba(0,0,0,0.06)' : '#2a2e39' },
          horzLines: { color: isLight ? 'rgba(0,0,0,0.06)' : '#2a2e39' },
        },
        crosshair: {
          mode: LW.CrosshairMode.Normal,
          vertLine: {
            labelBackgroundColor: '#2962ff',
          },
          horzLine: {
            labelBackgroundColor: '#2962ff',
          },
        },
        timeScale: {
          borderColor: isLight ? 'rgba(0,0,0,0.1)' : '#2a2e39',
          timeVisible: true,
          secondsVisible: false,
        },
      };

      // Compute explicit pixel heights for sub-panels (dynamic)
      const totalHeight = containerSize.h;
      const numOsc = oscIndicators.length;
      const mainHeightPct = numOsc === 0 ? 1.0 : Math.max(0.45, 0.75 - numOsc * 0.08);
      const mainHeight = Math.floor(totalHeight * mainHeightPct);
      const oscTotalHeight = totalHeight - mainHeight;
      const oscPanelHeight = numOsc > 0 ? Math.floor(oscTotalHeight / numOsc) : 0;

      // Create main chart with EXPLICIT pixel dimensions
      const chart = LW.createChart(mainChartRef.current!, {
        ...baseChartOptions,
        width: containerSize.w,
        height: mainHeight,
      });
      chartObj.current = chart;

      // Add Series based on selected chart type (v5 API: chart.addSeries)
      let mainSeries: any;
      if (config.chartType === 'candlestick') {
        mainSeries = chart.addSeries(LW.CandlestickSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });
      } else if (config.chartType === 'area') {
        mainSeries = chart.addSeries(LW.AreaSeries, {
          topColor: 'rgba(41, 98, 255, 0.56)',
          bottomColor: 'rgba(41, 98, 255, 0.04)',
          lineColor: 'rgba(41, 98, 255, 1)',
          lineWidth: 2,
        });
      } else {
        mainSeries = chart.addSeries(LW.LineSeries, {
          color: 'rgba(41, 98, 255, 1)',
          lineWidth: 2,
        });
      }

      if (config.chartType === 'candlestick') {
        const validCandles = candles.filter(c => c && (typeof c.time === 'number' || typeof c.time === 'string') && typeof c.close === 'number');
        mainSeries.setData(validCandles);
      } else {
        // Area and Line series require { time, value } format
        const validLineData = candles
          .filter(c => c && (typeof c.time === 'number' || typeof c.time === 'string') && typeof c.close === 'number')
          .map(c => ({ time: c.time, value: c.close }));
        mainSeries.setData(validLineData);
      }
      mainSeriesObj.current = mainSeries;

      // Reset indicator map
      indicatorSeriesMap.current.clear();

      // Render Overlay Indicators (on main chart)
      indicators.forEach((ind) => {
        try {
          if (ind.type === 'sma') {
            const data = calculateSMA(candles, ind.params.period || 9);
            if (data.length > 0) {
              const series = chart.addSeries(LW.LineSeries, { color: ind.color, lineWidth: 2, title: ind.name });
              series.setData(data as any);
              indicatorSeriesMap.current.set(ind.id, [series]);
            }
          } else if (ind.type === 'ema') {
            const data = calculateEMA(candles, ind.params.period || 21);
            if (data.length > 0) {
              const series = chart.addSeries(LW.LineSeries, { color: ind.color, lineWidth: 2, title: ind.name });
              series.setData(data as any);
              indicatorSeriesMap.current.set(ind.id, [series]);
            }
          } else if (ind.type === 'wma') {
            const data = calculateWMA(candles, ind.params.period || 20);
            if (data.length > 0) {
              const series = chart.addSeries(LW.LineSeries, { color: ind.color, lineWidth: 2, title: ind.name });
              series.setData(data as any);
              indicatorSeriesMap.current.set(ind.id, [series]);
            }
          } else if (ind.type === 'hma') {
            const data = calculateHMA(candles, ind.params.period || 20);
            if (data.length > 0) {
              const series = chart.addSeries(LW.LineSeries, { color: ind.color, lineWidth: 2, title: ind.name });
              series.setData(data as any);
              indicatorSeriesMap.current.set(ind.id, [series]);
            }
          } else if (ind.type === 'vwap') {
            const data = calculateVWAP(candles);
            if (data.length > 0) {
              const series = chart.addSeries(LW.LineSeries, { color: ind.color, lineWidth: 2, title: ind.name });
              series.setData(data as any);
              indicatorSeriesMap.current.set(ind.id, [series]);
            }
          } else if (ind.type === 'bb') {
            const data = calculateBollingerBands(candles, ind.params.period || 20, ind.params.multiplier || 2);
            if (data.length > 0) {
              const upperSeries = chart.addSeries(LW.LineSeries, { color: ind.color, lineWidth: 1, lineStyle: LW.LineStyle.Dashed, title: 'BB Upper' });
              const middleSeries = chart.addSeries(LW.LineSeries, { color: ind.color, lineWidth: 2, title: 'BB Middle' });
              const lowerSeries = chart.addSeries(LW.LineSeries, { color: ind.color, lineWidth: 1, lineStyle: LW.LineStyle.Dashed, title: 'BB Lower' });
              upperSeries.setData(data.map(d => ({ time: d.time, value: d.upper })) as any);
              middleSeries.setData(data.map(d => ({ time: d.time, value: d.middle })) as any);
              lowerSeries.setData(data.map(d => ({ time: d.time, value: d.lower })) as any);
              indicatorSeriesMap.current.set(ind.id, [upperSeries, middleSeries, lowerSeries]);
            }
          } else if (ind.type === 'supertrend') {
            const data = calculateSupertrend(candles, ind.params.period || 10, ind.params.multiplier || 3);
            if (data.length > 0) {
              const series = chart.addSeries(LW.LineSeries, { color: ind.color, lineWidth: 2, title: ind.name });
              series.setData(data.map(d => ({ time: d.time, value: d.value, color: d.direction === 'up' ? '#26a69a' : '#ef5350' })) as any);
              indicatorSeriesMap.current.set(ind.id, [series]);
            }
          } else if (ind.type === 'pivotPoints') {
            const data = calculatePivotPoints(candles);
            if (data.length > 0) {
              const ppSeries = chart.addSeries(LW.LineSeries, { color: '#a78bfa', lineWidth: 1, title: 'PP' });
              const r1Series = chart.addSeries(LW.LineSeries, { color: '#f23645', lineWidth: 1, lineStyle: LW.LineStyle.Dashed, title: 'R1' });
              const s1Series = chart.addSeries(LW.LineSeries, { color: '#089981', lineWidth: 1, lineStyle: LW.LineStyle.Dashed, title: 'S1' });
              const r2Series = chart.addSeries(LW.LineSeries, { color: '#f2384580', lineWidth: 1, lineStyle: LW.LineStyle.Dotted, title: 'R2' });
              const s2Series = chart.addSeries(LW.LineSeries, { color: '#08998180', lineWidth: 1, lineStyle: LW.LineStyle.Dotted, title: 'S2' });
              ppSeries.setData(data.map(d => ({ time: d.time, value: d.pp })) as any);
              r1Series.setData(data.map(d => ({ time: d.time, value: d.r1 })) as any);
              s1Series.setData(data.map(d => ({ time: d.time, value: d.s1 })) as any);
              r2Series.setData(data.map(d => ({ time: d.time, value: d.r2 })) as any);
              s2Series.setData(data.map(d => ({ time: d.time, value: d.s2 })) as any);
              indicatorSeriesMap.current.set(ind.id, [ppSeries, r1Series, s1Series, r2Series, s2Series]);
            }
          }
        } catch (err) {
          console.warn(`[ChartInstance] Failed to render overlay indicator ${ind.type}:`, err);
        }
      });

      // ─── Render Dynamic Oscillator Sub-panels ─────────────────────────
      const allOscCharts: any[] = [];
      oscIndicators.forEach((ind, idx) => {
        const panelEl = oscPanelRefs.current.get(ind.id);
        if (!panelEl) return;
        panelEl.innerHTML = '';

        const isLast = idx === oscIndicators.length - 1;
        try {
          const oscChart = LW.createChart(panelEl, {
            ...baseChartOptions,
            width: containerSize.w,
            height: oscPanelHeight,
            timeScale: { ...baseChartOptions.timeScale, visible: isLast },
          });
          oscChartObjs.current.set(ind.id, oscChart);
          allOscCharts.push(oscChart);

          if (ind.type === 'rsi') {
            const data = calculateRSI(candles, ind.params.period || 14);
            if (data.length > 0) {
              const rsiSeries = oscChart.addSeries(LW.LineSeries, { color: ind.color || '#9b51e0', lineWidth: 2, title: 'RSI' });
              rsiSeries.setData(data.filter(d => !isNaN(d.value)) as any);
              const lineUpper = oscChart.addSeries(LW.LineSeries, { color: '#f23645', lineWidth: 1, lineStyle: LW.LineStyle.Dashed });
              const lineLower = oscChart.addSeries(LW.LineSeries, { color: '#089981', lineWidth: 1, lineStyle: LW.LineStyle.Dashed });
              lineUpper.setData(data.map(d => ({ time: d.time, value: 70 })) as any);
              lineLower.setData(data.map(d => ({ time: d.time, value: 30 })) as any);
            }
          } else if (ind.type === 'macd') {
            const macdConfig = ind.params;
            const data = calculateMACD(candles, macdConfig.fastPeriod || 12, macdConfig.slowPeriod || 26, macdConfig.signalPeriod || 9);
            if (data.length > 0) {
              const macdLine = oscChart.addSeries(LW.LineSeries, { color: '#2f80ed', lineWidth: 2, title: 'MACD' });
              const signalLine = oscChart.addSeries(LW.LineSeries, { color: '#f2994a', lineWidth: 2, title: 'Signal' });
              const histLine = oscChart.addSeries(LW.HistogramSeries, { color: '#27ae60', title: 'Histogram' });
              macdLine.setData(data.map(d => ({ time: d.time, value: d.macd })) as any);
              signalLine.setData(data.map(d => ({ time: d.time, value: d.signal })) as any);
              histLine.setData(data.map(d => ({ time: d.time, value: d.histogram, color: d.histogram >= 0 ? '#26a69a' : '#ef5350' })) as any);
            }
          } else if (ind.type === 'atr') {
            const data = calculateATR(candles, ind.params.period || 14);
            if (data.length > 0) {
              const series = oscChart.addSeries(LW.LineSeries, { color: ind.color || '#f2c94c', lineWidth: 2, title: ind.name });
              series.setData(data as any);
            }
          } else if (ind.type === 'stochRsi') {
            const data = calculateStochRSI(candles, ind.params.rsiPeriod || 14, ind.params.stochPeriod || 14, ind.params.kPeriod || 3, ind.params.dPeriod || 3);
            if (data.length > 0) {
              const kLine = oscChart.addSeries(LW.LineSeries, { color: '#2d9cdb', lineWidth: 2, title: '%K' });
              const dLine = oscChart.addSeries(LW.LineSeries, { color: '#f2994a', lineWidth: 2, title: '%D' });
              kLine.setData(data.map(d => ({ time: d.time, value: d.k })) as any);
              dLine.setData(data.map(d => ({ time: d.time, value: d.d })) as any);
              const lineUpper = oscChart.addSeries(LW.LineSeries, { color: '#f23645', lineWidth: 1, lineStyle: LW.LineStyle.Dashed });
              const lineLower = oscChart.addSeries(LW.LineSeries, { color: '#089981', lineWidth: 1, lineStyle: LW.LineStyle.Dashed });
              lineUpper.setData(data.map(d => ({ time: d.time, value: 80 })) as any);
              lineLower.setData(data.map(d => ({ time: d.time, value: 20 })) as any);
            }
          } else if (ind.type === 'stochastic') {
            const data = calculateStochastic(candles, ind.params.kPeriod || 14, ind.params.dPeriod || 3);
            if (data.length > 0) {
              const kLine = oscChart.addSeries(LW.LineSeries, { color: ind.color || '#f59e0b', lineWidth: 2, title: '%K' });
              const dLine = oscChart.addSeries(LW.LineSeries, { color: '#ef4444', lineWidth: 2, title: '%D' });
              kLine.setData(data.map(d => ({ time: d.time, value: d.k })) as any);
              dLine.setData(data.map(d => ({ time: d.time, value: d.d })) as any);
              const lineUpper = oscChart.addSeries(LW.LineSeries, { color: '#f23645', lineWidth: 1, lineStyle: LW.LineStyle.Dashed });
              const lineLower = oscChart.addSeries(LW.LineSeries, { color: '#089981', lineWidth: 1, lineStyle: LW.LineStyle.Dashed });
              lineUpper.setData(data.map(d => ({ time: d.time, value: 80 })) as any);
              lineLower.setData(data.map(d => ({ time: d.time, value: 20 })) as any);
            }
          } else if (ind.type === 'cci') {
            const data = calculateCCI(candles, ind.params.period || 20);
            if (data.length > 0) {
              const series = oscChart.addSeries(LW.LineSeries, { color: ind.color || '#bb6bd9', lineWidth: 2, title: ind.name });
              series.setData(data as any);
              const lineUpper = oscChart.addSeries(LW.LineSeries, { color: '#f23645', lineWidth: 1, lineStyle: LW.LineStyle.Dashed });
              const lineLower = oscChart.addSeries(LW.LineSeries, { color: '#089981', lineWidth: 1, lineStyle: LW.LineStyle.Dashed });
              lineUpper.setData(data.map(d => ({ time: d.time, value: 100 })) as any);
              lineLower.setData(data.map(d => ({ time: d.time, value: -100 })) as any);
            }
          } else if (ind.type === 'williamsR') {
            const data = calculateWilliamsR(candles, ind.params.period || 14);
            if (data.length > 0) {
              const series = oscChart.addSeries(LW.LineSeries, { color: ind.color || '#f97316', lineWidth: 2, title: ind.name });
              series.setData(data as any);
              const lineUpper = oscChart.addSeries(LW.LineSeries, { color: '#f23645', lineWidth: 1, lineStyle: LW.LineStyle.Dashed });
              const lineLower = oscChart.addSeries(LW.LineSeries, { color: '#089981', lineWidth: 1, lineStyle: LW.LineStyle.Dashed });
              lineUpper.setData(data.map(d => ({ time: d.time, value: -20 })) as any);
              lineLower.setData(data.map(d => ({ time: d.time, value: -80 })) as any);
            }
          } else if (ind.type === 'obv') {
            const data = calculateOBV(candles);
            if (data.length > 0) {
              const series = oscChart.addSeries(LW.LineSeries, { color: ind.color || '#06b6d4', lineWidth: 2, title: ind.name });
              series.setData(data as any);
            }
          }

          // Sync timescale with main chart
          chart.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
            if (range) { try { oscChart.timeScale().setVisibleLogicalRange(range); } catch(e) {} }
          });
          oscChart.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
            if (range) { try { chart.timeScale().setVisibleLogicalRange(range); } catch(e) {} }
          });
        } catch (err) {
          console.warn(`[ChartInstance] Failed to render oscillator ${ind.type}:`, err);
        }
      });

      // Cross-sync all oscillator panels with each other
      allOscCharts.forEach((oc, i) => {
        allOscCharts.forEach((oc2, j) => {
          if (i !== j) {
            oc.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
              if (range) { try { oc2.timeScale().setVisibleLogicalRange(range); } catch(e) {} }
            });
          }
        });
      });

      // Handle Crosshair Position updates for Legend and Crosshair Sync
      chart.subscribeCrosshairMove((param: any) => {
        if (!param || !param.time || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
          isCrosshairActiveRef.current = false;
          setCandles(prev => {
            if (prev.length > 0) {
              const last = prev[prev.length - 1];
              setOhlc({ o: last.open, h: last.high, l: last.low, c: last.close, v: last.volume });
            }
            return prev;
          });
          return;
        }
        isCrosshairActiveRef.current = true;
        
        // Find candle at crosshair time
        const priceData = param.seriesData.get(mainSeries);
        if (priceData) {
          setOhlc({
            o: priceData.open ?? priceData.value,
            h: priceData.high ?? priceData.value,
            l: priceData.low ?? priceData.value,
            c: priceData.close ?? priceData.value,
            v: priceData.volume ?? 0,
          });
        }
        
        if (syncCrosshair) {
          const coordPrice = mainSeries.coordinateToPrice(param.point.y);
          if (coordPrice) {
            setCrosshairPosition({ time: param.time, price: coordPrice });
          }
        }
      });

      // Draw all drawings overlay
      const drawAllDrawings = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let drawingsToRender = activeDrawingsRef.current;
        if (dragStateRef.current) {
          drawingsToRender = drawingsToRender.map(d => 
            d.id === dragStateRef.current!.id 
              ? { ...d, points: dragStateRef.current!.currentPoints } 
              : d
          );
        }

        renderAllDrawings(
          canvas,
          ctx,
          drawingsToRender,
          chart,
          mainSeries,
          areDrawingsHiddenRef.current,
          isDrawingRef.current,
          drawingPointsRef.current,
          activeToolRef.current,
          currentColorRef.current,
          currentWidthRef.current,
          candles
        );
      };

      drawDrawingsRef.current = drawAllDrawings;

      // Subscribe to visible range to trigger drawings redraws
      chart.timeScale().subscribeVisibleLogicalRangeChange(drawAllDrawings);
      chart.timeScale().subscribeVisibleTimeRangeChange(drawAllDrawings);

      // Redraw drawings on dynamic resize — chart resize is handled by containerSize state
      if (canvasRef.current) {
        canvasRef.current.width = containerSize.w;
        canvasRef.current.height = mainHeight;
      }
      drawAllDrawings();

      // Hook Polling Manager
      let unsubPolling: (() => void) | undefined;
      if (marketManager) {
        unsubPolling = marketManager.subscribe(config.symbol, config.timeframe, (realtimeCandle, isFinal) => {
          if (realtimeCandle && typeof realtimeCandle.time === 'number' && typeof realtimeCandle.close === 'number') {
            if (config.chartType === 'candlestick') {
              mainSeries.update(realtimeCandle);
            } else {
              mainSeries.update({ time: realtimeCandle.time, value: realtimeCandle.close });
            }
          }
          
          setCandles((prev) => {
            if (prev.length === 0) return [realtimeCandle];
            const last = prev[prev.length - 1];
            if (last.time === realtimeCandle.time) {
              const updated = [...prev.slice(0, -1), realtimeCandle];
              return updated;
            } else {
              const appended = [...prev, realtimeCandle];
              return appended;
            }
          });

          if (!isCrosshairActiveRef.current) {
            setOhlc({
              o: realtimeCandle.open,
              h: realtimeCandle.high,
              l: realtimeCandle.low,
              c: realtimeCandle.close,
              v: realtimeCandle.volume,
            });
          }
        });
      }

      // Cleanup
      return () => {
        destroyed = true;
        if (unsubPolling) {
          unsubPolling();
        }
        try { chart.remove(); } catch (e) { /* ignore */ }
        oscChartObjs.current.forEach((c) => { try { c.remove(); } catch (e) { /* ignore */ } });
      };
    });

    // The dynamic import returns a promise; we can't return the cleanup directly.
    // Instead we track `destroyed` flag and clean up from within the .then()
    return () => {
      destroyed = true;
      // unsubPolling is handled inside the then() block cleanup.
      // If we need to unsubscribe immediately before then() finishes,
      // it's tricky, but usually destroyed flag covers it.
      try { if (chartObj.current) chartObj.current.remove(); } catch (e) { /* ignore */ }
      oscChartObjs.current.forEach((c) => { try { c.remove(); } catch (e) { /* ignore */ } });
      chartObj.current = null;
      oscChartObjs.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, candles.length, config.chartType, config.symbol, config.timeframe, initialSizeSet, indicators.length, oscIndicators.length, JSON.stringify(indicators)]);

  // Resize existing chart when container size changes (without full rebuild)
  useEffect(() => {
    if (containerSize.w === 0 || containerSize.h === 0) return;
    
    const numOsc = oscIndicators.length;
    const mainHeightPct = numOsc === 0 ? 1.0 : Math.max(0.45, 0.75 - numOsc * 0.08);
    const mainHeight = Math.floor(containerSize.h * mainHeightPct);
    const oscTotalHeight = containerSize.h - mainHeight;
    const oscPanelHeight = numOsc > 0 ? Math.floor(oscTotalHeight / numOsc) : 0;

    if (chartObj.current) {
      try { chartObj.current.resize(containerSize.w, mainHeight); } catch (e) { /* ignore */ }
    }
    
    oscChartObjs.current.forEach((chart) => {
      try { chart.resize(containerSize.w, oscPanelHeight); } catch (e) { /* ignore */ }
    });
    
    if (canvasRef.current) {
      canvasRef.current.width = containerSize.w;
      canvasRef.current.height = mainHeight;
    }
  }, [containerSize.w, containerSize.h, oscIndicators.length]);

  // Update crosshair visibility based on active tool
  useEffect(() => {
    if (!chartObj.current) return;
    const hideCrosshair = ['arrowCursor', 'eraser'].includes(activeTool as string);
    try {
      chartObj.current.applyOptions({
        crosshair: {
          // 0 is Normal, 1 is Magnet, 2 is Hidden
          mode: hideCrosshair ? 2 : 0,
        }
      });
    } catch (e) {
      /* ignore */
    }
  }, [activeTool]);

  const findClosestDrawing = useCallback((x: number, y: number) => {
    if (!chartObj.current || !mainSeriesObj.current) return null;
    return findClosestDrawingLib(
      x, 
      y, 
      activeDrawingsRef.current, 
      chartObj.current, 
      mainSeriesObj.current,
      candles
    );
  }, [candles]);

  const findClosestDrawingPointCb = useCallback((x: number, y: number) => {
    if (!chartObj.current || !mainSeriesObj.current) return null;
    return findClosestDrawingPoint(
      x,
      y,
      activeDrawingsRef.current,
      chartObj.current,
      mainSeriesObj.current,
      candles
    );
  }, [candles]);

  const getTimeFromCoordinate = (x: number): number | null => {
    if (!chartObj.current) return null;
    const timeScale = chartObj.current.timeScale();
    let t = timeScale.coordinateToTime(x) as number | null;
    if (t === null && candles.length >= 2) {
      const logical = timeScale.coordinateToLogical(x);
      if (logical !== null) {
        if (logical > candles.length - 1) {
          const last = candles[candles.length - 1];
          const prev = candles[candles.length - 2];
          const dt = (last.time as number) - (prev.time as number);
          t = (last.time as number) + Math.round(logical - (candles.length - 1)) * dt;
        } else if (logical < 0) {
          const first = candles[0];
          const second = candles[1];
          const dt = (second.time as number) - (first.time as number);
          t = (first.time as number) + Math.round(logical) * dt;
        }
      }
    }
    return t;
  };

  // Handle Drawings Canvas Clicks
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeTool || !chartObj.current || !mainSeriesObj.current || !canvasRef.current || areDrawingsLocked) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const time = getTimeFromCoordinate(x);
    let price = mainSeriesObj.current.coordinateToPrice(y);

    if (time === null || price === null) return;
    
    if (isMagnetModeEnabled) {
      const candle = candles.find(c => c.time === time);
      if (candle) {
        const ohlc = [candle.open, candle.high, candle.low, candle.close];
        price = ohlc.reduce((prev, curr) => Math.abs(curr - price!) < Math.abs(prev - price!) ? curr : prev);
      }
    }

    const point = { time, price };

    if (!activeTool || activeTool === 'crosshair' || activeTool === 'arrowCursor' || activeTool === 'eraser') {
      const closestPoint = findClosestDrawingPointCb(x, y);
      if (closestPoint && activeTool !== 'eraser') {
        const d = activeDrawingsRef.current.find(d => d.id === closestPoint.id);
        if (d) {
          dragStateRef.current = {
            id: d.id,
            type: 'point',
            pointIndex: closestPoint.pointIndex,
            startX: x,
            startY: y,
            originalPoints: [...d.points],
            currentPoints: [...d.points]
          };
          setSelectedDrawing({ id: d.id, x: e.clientX, y: e.clientY });
          setIsDraggingUI(true);
        }
        return;
      }

      const closestId = findClosestDrawing(x, y);

      if (closestId) {
        if (activeTool === 'eraser') {
          deleteDrawing(closestId);
        } else {
          const d = activeDrawingsRef.current.find(d => d.id === closestId);
          if (d) {
            dragStateRef.current = {
              id: d.id,
              type: 'body',
              startX: x,
              startY: y,
              originalPoints: [...d.points],
              currentPoints: [...d.points]
            };
            setIsDraggingUI(true);
          }
          setSelectedDrawing({ id: closestId, x: e.clientX, y: e.clientY });
        }
      } else {
        if (activeTool !== 'eraser') {
          setSelectedDrawing(null);
          dragStateRef.current = null;
        }
      }
      return; // Stop further processing
    }

    if (['trend', 'rectangle', 'fib', 'fibExtension', 'pitchfork', 'ellipse', 'ray', 'arrow', 'extendedLine', 'ruler', 'brush', 'infoLine', 'trendAngle'].includes(activeTool as string)) {
      if (!isDrawing) {
        setIsDrawing(true);
        setDrawingPoints(activeTool === 'brush' ? [point] : [point, point]);
      }
    } else if (['parallelChannel', 'triangle', 'curve'].includes(activeTool as string)) {
      if (!isDrawing) {
        setIsDrawing(true);
        setDrawingPoints([point, point]);
      } else if (drawingPoints.length === 2) {
        setDrawingPoints([drawingPoints[0], drawingPoints[1], point]);
      } else if (drawingPoints.length === 3) {
        addDrawing({
          symbol: config.symbol,
          type: activeTool as any,
          points: [drawingPoints[0], drawingPoints[1], point],
          properties: { color: currentColor, width: currentWidth, fillColor: 'rgba(41, 98, 255, 0.12)' },
        });
        setIsDrawing(false);
        setDrawingPoints([]);
        if (!isDrawingModeLocked) setActiveTool(null);
      }
    } else if (activeTool === 'path') {
      if (!isDrawing) {
        setIsDrawing(true);
        setDrawingPoints([point, point]);
      } else {
        setDrawingPoints([...drawingPoints, point]);
      }
    } else if (activeTool === 'horizontal') {
      addDrawing({
        symbol: config.symbol,
        type: 'horizontal',
        points: [point],
        properties: { color: currentColor, width: currentWidth },
      });
      if (!isDrawingModeLocked) setActiveTool(null);
    } else if (activeTool === 'vertical') {
      addDrawing({
        symbol: config.symbol,
        type: 'vertical',
        points: [point],
        properties: { color: currentColor, width: currentWidth },
      });
      if (!isDrawingModeLocked) setActiveTool(null);
    } else if (activeTool === 'horizontalRay') {
      addDrawing({
        symbol: config.symbol,
        type: 'horizontalRay',
        points: [point],
        properties: { color: currentColor, width: currentWidth },
      });
      if (!isDrawingModeLocked) setActiveTool(null);
    } else if (activeTool === 'crossLine') {
      addDrawing({
        symbol: config.symbol,
        type: 'crossLine',
        points: [point],
        properties: { color: currentColor, width: currentWidth },
      });
      if (!isDrawingModeLocked) setActiveTool(null);
    } else if (activeTool === 'text') {
      setTextModal({ open: true, x: e.clientX, y: e.clientY, time, price });
      if (!isDrawingModeLocked) setActiveTool(null);
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragStateRef.current) {
      updateDrawing(dragStateRef.current.id, { points: dragStateRef.current.currentPoints });
      dragStateRef.current = null;
      setIsDraggingUI(false);
      return;
    }

    if (!isDrawing || !activeTool || !chartObj.current || !mainSeriesObj.current || !canvasRef.current || areDrawingsLocked) return;

    if (['trend', 'rectangle', 'fib', 'fibExtension', 'pitchfork', 'ellipse', 'ray', 'arrow', 'extendedLine', 'ruler', 'brush', 'infoLine', 'trendAngle'].includes(activeTool as string)) {
      if (drawingPoints.length >= 2) {
        addDrawing({
          symbol: config.symbol,
          type: activeTool as any,
          points: drawingPoints,
          properties: { color: currentColor, width: currentWidth, fillColor: 'rgba(41, 98, 255, 0.12)' },
        }).then(newId => {
          if (newId) setSelectedDrawing({ id: newId, x: e.clientX, y: e.clientY });
        });
      }
      setIsDrawing(false);
      setDrawingPoints([]);
      if (!isDrawingModeLocked) setActiveTool(null);
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'path' && isDrawing) {
      if (drawingPoints.length >= 2) {
        addDrawing({
          symbol: config.symbol,
          type: 'path',
          points: drawingPoints.slice(0, -1), // remove the last floating point
          properties: { color: currentColor, width: currentWidth },
        });
      }
      setIsDrawing(false);
      setDrawingPoints([]);
      if (!isDrawingModeLocked) setActiveTool(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartObj.current || !mainSeriesObj.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragStateRef.current) {
      const state = dragStateRef.current;
      const dx = x - state.startX;
      const dy = y - state.startY;

      const newPoints = state.originalPoints.map((pt, i) => {
        if (state.type === 'point' && i !== state.pointIndex) return pt;
        
        let newTime = pt.time;
        const origX = chartObj.current.timeScale().timeToCoordinate(pt.time as any);
        if (origX !== null) {
          const t = getTimeFromCoordinate(origX + dx);
          if (t !== null) newTime = t;
        }

        let newPrice = pt.price;
        const origY = mainSeriesObj.current.priceToCoordinate(pt.price);
        if (origY !== null) {
          const p = mainSeriesObj.current.coordinateToPrice(origY + dy);
          if (p !== null) newPrice = p;
        }
        
        let finalPrice = newPrice;
        if (isMagnetModeEnabled && origX !== null) {
          const candle = candles.find(c => c.time === newTime);
          if (candle) {
            const ohlc = [candle.open, candle.high, candle.low, candle.close];
            finalPrice = ohlc.reduce((prev, curr) => Math.abs(curr - finalPrice) < Math.abs(prev - finalPrice) ? curr : prev);
          }
        }
        
        return { time: newTime, price: finalPrice };
      });
      
      dragStateRef.current.currentPoints = newPoints;
      
      if (drawDrawingsRef.current) drawDrawingsRef.current();
      
      if (selectedDrawing && selectedDrawing.id === state.id) {
         setSelectedDrawing({ id: state.id, x: e.clientX, y: e.clientY });
      }
      return;
    }

    if (!isDrawing || drawingPoints.length === 0) return;

    const time = getTimeFromCoordinate(x);
    let price = mainSeriesObj.current.coordinateToPrice(y);

    if (time === null || price === null) return;

    if (isMagnetModeEnabled) {
      const candle = candles.find(c => c.time === time);
      if (candle) {
        const ohlc = [candle.open, candle.high, candle.low, candle.close];
        price = ohlc.reduce((prev, curr) => Math.abs(curr - price!) < Math.abs(prev - price!) ? curr : prev);
      }
    }

    if (['parallelChannel', 'triangle', 'curve'].includes(activeTool as string)) {
      if (drawingPoints.length === 2) {
        setDrawingPoints([drawingPoints[0], { time, price }]);
      } else if (drawingPoints.length === 3) {
        setDrawingPoints([drawingPoints[0], drawingPoints[1], { time, price }]);
      }
    } else if (activeTool === 'path') {
      setDrawingPoints([...drawingPoints.slice(0, -1), { time, price }]);
    } else if (activeTool === 'brush') {
      setDrawingPoints([...drawingPoints, { time, price }]);
    } else {
      setDrawingPoints([drawingPoints[0], { time, price }]);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textModal || !textInput.trim()) return;

    addDrawing({
      symbol: config.symbol,
      type: 'text',
      points: [{ time: textModal.time, price: textModal.price }],
      properties: { color: currentColor, text: textInput.trim() },
    });

    setTextInput('');
    setTextModal(null);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleOuterMouseMove = (e: React.MouseEvent) => {
    if (activeToolRef.current && activeToolRef.current !== 'crosshair') return; // Canvas handles it
    if (!canvasRef.current || !chartObj.current || !mainSeriesObj.current) return;
    if (dragStateRef.current) return; // Keep current pointer events during drag
    if (areDrawingsLocked) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ptHit = findClosestDrawingPointCb(x, y);
    const lineHit = findClosestDrawing(x, y);
    const hit = ptHit || lineHit;

    if (hit && !isCanvasInteractiveRef.current) {
      isCanvasInteractiveRef.current = true;
      canvasRef.current.style.pointerEvents = 'auto';
      canvasRef.current.style.cursor = ptHit ? 'move' : 'pointer';
    } else if (!hit && isCanvasInteractiveRef.current) {
      isCanvasInteractiveRef.current = false;
      canvasRef.current.style.pointerEvents = 'none';
      canvasRef.current.style.cursor = 'crosshair';
    } else if (hit && isCanvasInteractiveRef.current) {
      canvasRef.current.style.cursor = ptHit ? 'move' : 'pointer';
    }
  };

  return (
    <div 
      ref={outerRef}
      onMouseMove={handleOuterMouseMove}
      onClick={(e) => {
        setActiveChartId(config.id);
        const state = useDrawingStore.getState();
        if (!state.activeTool || ['crosshair', 'arrowCursor', 'dot'].includes(state.activeTool as string)) {
          if (!canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
            setSelectedDrawing(null);
            return;
          }
          
          if (!areDrawingsLocked) {
            const closestId = findClosestDrawing(x, y);
            if (closestId) {
              setSelectedDrawing({ id: closestId, x: e.clientX, y: e.clientY });
            } else {
              setSelectedDrawing(null);
            }
          }
        }
      }}
      onContextMenu={handleContextMenu}
      className={`flex-1 w-full h-full min-w-0 min-h-0 border bg-card rounded-xl overflow-hidden shadow-lg select-none relative ${
        isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border/60'
      }`}
    >
      {/* Chart Legend / HUD overlay */}
      <div className="absolute top-3 left-4 z-30 pointer-events-auto flex flex-col gap-1.5 bg-card/85 backdrop-blur px-3 py-2 rounded-lg border border-border/40 max-w-[90%]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground text-sm tracking-wide">{config.symbol}</span>
            <button
              onClick={toggleStarred}
              title={isStarred ? "Remove from Watchlist" : "Add to Watchlist"}
              className="p-0.5 hover:bg-secondary rounded transition cursor-pointer text-muted-foreground hover:text-amber-500"
            >
              <Star className={`h-3.5 w-3.5 ${isStarred ? 'text-amber-500 fill-amber-500' : ''}`} />
            </button>
          </div>
          <span className="text-xs font-semibold px-1.5 py-0.5 bg-secondary text-primary rounded">{config.timeframe}</span>
          <span className="text-xs text-muted-foreground">{config.chartType}</span>
        </div>
        {ohlc && (
          <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-mono text-muted-foreground">
            <span>O: <span className="text-foreground font-semibold">{ohlc.o.toFixed(2)}</span></span>
            <span>H: <span className="text-bull font-semibold">{ohlc.h.toFixed(2)}</span></span>
            <span>L: <span className="text-bear font-semibold">{ohlc.l.toFixed(2)}</span></span>
            <span>C: <span className="text-foreground font-semibold">{ohlc.c.toFixed(2)}</span></span>
            <span>V: <span className="text-foreground font-semibold">{ohlc.v.toFixed(1)}</span></span>
          </div>
        )}
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur z-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card z-20 p-6 text-center">
          <p className="text-destructive font-semibold mb-2">{error}</p>
          <p className="text-xs text-muted-foreground">Double check your connection or try another symbol pair.</p>
        </div>
      )}

      {/* Main Lightweight Charts Container */}
      <div 
        ref={mainChartRef} 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: containerSize.w > 0 ? containerSize.w : '100%',
          height: containerSize.h > 0 
            ? Math.floor(containerSize.h * (oscIndicators.length === 0 ? 1.0 : Math.max(0.45, 0.75 - oscIndicators.length * 0.08)))
            : '100%'
        }} 
      />

      {/* Global CSS override for LW charts crosshair depending on active cursor */}
      {['crosshair', 'arrowCursor', 'dot', 'eraser'].includes(activeTool as string) && (
        <style>{`
          .tv-lightweight-charts table,
          .tv-lightweight-charts canvas {
            cursor: ${
              activeTool === 'arrowCursor' ? 'default' : 
              activeTool === 'dot' ? "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDEyIDEyIj48Y2lyY2xlIGN4PSI2IiBjeT0iNiIgcj0iMyIgZmlsbD0id2hpdGUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMS41Ii8+PC9zdmc+') 6 6, crosshair" : 
              activeTool === 'eraser' ? "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yMCAyMEg3TDMgMTZDMi41IDE1LjUgMi41IDE0LjUgMyAxNEwxMyA0TDIwIDExTDExIDIwIi8+PC9zdmc+') 4 16, crosshair" :
              'crosshair'
            } !important;
          }
        `}</style>
      )}

      {/* Drawings overlay canvas */}
      {containerSize.w > 0 && containerSize.h > 0 && (
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseMove={handleCanvasMouseMove}
          onDoubleClick={handleCanvasDoubleClick}
          className="absolute top-0 left-0 z-20 w-full"
          style={{
            width: containerSize.w,
            height: Math.floor(containerSize.h * (oscIndicators.length === 0 ? 1.0 : Math.max(0.45, 0.75 - oscIndicators.length * 0.08)))
          }}
          width={containerSize.w}
          height={Math.floor(containerSize.h * (oscIndicators.length === 0 ? 1.0 : Math.max(0.45, 0.75 - oscIndicators.length * 0.08)))}
        />
      )}

      {/* Dynamic Oscillator Panels */}
      {containerSize.h > 0 && oscIndicators.map((ind, idx) => {
        const numOsc = oscIndicators.length;
        const mainHeightPct = Math.max(0.45, 0.75 - numOsc * 0.08);
        const oscTotalHeight = containerSize.h - Math.floor(containerSize.h * mainHeightPct);
        const oscPanelHeight = Math.floor(oscTotalHeight / numOsc);
        const topOffset = Math.floor(containerSize.h * mainHeightPct) + idx * oscPanelHeight;

        return (
          <div 
            key={ind.id}
            ref={(el) => {
              if (el) oscPanelRefs.current.set(ind.id, el);
            }}
            className="border-t border-border bg-background" 
            style={{ 
              position: 'absolute',
              left: 0,
              top: topOffset,
              width: containerSize.w,
              height: oscPanelHeight
            }} 
          />
        );
      })}

      {/* Text Annotation Input Modal */}
      {textModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <form onSubmit={handleTextSubmit} className="glass p-5 rounded-2xl shadow-xl w-80 bg-card border-border flex flex-col gap-3">
            <h4 className="font-bold text-sm text-foreground">Add Annotation Label</h4>
            <input
              autoFocus
              type="text"
              placeholder="Enter text..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary w-full"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setTextModal(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-secondary text-muted-foreground transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition"
              >
                Confirm
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 min-w-[160px] bg-card border border-border rounded-lg shadow-xl py-1 overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={toggleStarred}
            className="w-full px-4 py-2 text-sm text-left hover:bg-secondary transition flex items-center gap-2"
          >
            <Star className={`h-4 w-4 ${isStarred ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
            {isStarred ? 'Remove from Watchlist' : 'Add to Watchlist'}
          </button>
        </div>
      )}

      {/* Floating Drawing Settings Toolbar */}
      {!isDraggingUI && (
        <FloatingToolbar
          selectedDrawing={selectedDrawing}
          currentColor={currentColor}
          currentWidth={currentWidth}
          updateDrawing={updateDrawing}
          setCurrentColor={setCurrentColor}
          setCurrentWidth={setCurrentWidth}
          deleteDrawing={deleteDrawing}
          setSelectedDrawing={setSelectedDrawing}
        />
      )}
    </div>
  );
}
