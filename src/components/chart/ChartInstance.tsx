'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChartStore, ChartConfig, ChartSeriesType } from '@/lib/store/chartStore';
import { useIndicatorStore, IndicatorInstance } from '@/lib/store/indicatorStore';
import { useDrawingStore, Drawing, DrawingPoint, DrawingProperties } from '@/lib/store/drawingStore';
import { fetchHistoricalCandles, Candle } from '@/lib/market/client';
import { marketManager } from '@/lib/market/polling';
import { 
  calculateSMA, 
  calculateEMA, 
  calculateVWAP, 
  calculateBollingerBands, 
  calculateRSI, 
  calculateMACD 
} from '@/lib/indicators/technicals';
import { Sliders, Maximize2, Minimize2, Trash2 } from 'lucide-react';

interface ChartInstanceProps {
  config: ChartConfig;
  onOpenIndicators: () => void;
}

export default function ChartInstance({ config, onOpenIndicators }: ChartInstanceProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<HTMLDivElement>(null);
  const macdChartRef = useRef<HTMLDivElement>(null);
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
  const { chartIndicators } = useIndicatorStore();
  const indicators = chartIndicators[config.id] || [];
  const { drawings, activeTool, setActiveTool, currentColor, currentWidth, addDrawing, deleteDrawing, fetchDrawings } = useDrawingStore();

  // Active drawings for this symbol
  const activeDrawings = drawings.filter((d) => d.symbol === config.symbol);

  // Active chart objects
  const chartObj = useRef<any>(null);
  const mainSeriesObj = useRef<any>(null);
  const rsiChartObj = useRef<any>(null);
  const rsiSeriesObj = useRef<any>(null);
  const macdChartObj = useRef<any>(null);
  const macdMacdSeriesObj = useRef<any>(null);
  const macdSignalSeriesObj = useRef<any>(null);
  const macdHistSeriesObj = useRef<any>(null);

  // Indicators overlay series objects map
  const indicatorSeriesMap = useRef<Map<string, any[]>>(new Map());

  // Drawing state tracking
  const [drawingPoints, setDrawingPoints] = useState<DrawingPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textModal, setTextModal] = useState<{ open: boolean; x: number; y: number; time: number; price: number } | null>(null);
  const [textInput, setTextInput] = useState('');

  const isActive = activeChartId === config.id;

  // Determine if helper sub-charts are enabled
  const hasRsi = indicators.some((ind) => ind.type === 'rsi');
  const hasMacd = indicators.some((ind) => ind.type === 'macd');

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
  useEffect(() => {
    console.log('[ChartInstance] Chart effect: loading=', loading, 'candles=', candles.length, 'containerSize=', containerSize, 'mainChartRef=', !!mainChartRef.current);
    if (loading || candles.length === 0) return;
    if (containerSize.w === 0 || containerSize.h === 0) return;
    if (!mainChartRef.current) return;
    console.log('[ChartInstance] Creating chart with dimensions:', containerSize.w, 'x', containerSize.h);

    // Dynamically load Lightweight Charts library
    let destroyed = false;
    import('lightweight-charts').then((LW) => {
      if (destroyed || !mainChartRef.current) return;

      // Clean existing container children
      mainChartRef.current.innerHTML = '';
      if (rsiChartRef.current) rsiChartRef.current.innerHTML = '';
      if (macdChartRef.current) macdChartRef.current.innerHTML = '';

      const baseChartOptions: any = {
        layout: {
          background: { type: LW.ColorType.Solid, color: '#131722' },
          textColor: '#d1d4dc',
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: '#2a2e39' },
          horzLines: { color: '#2a2e39' },
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
          borderColor: '#2a2e39',
          timeVisible: true,
          secondsVisible: false,
        },
      };

      // Compute explicit pixel heights for sub-panels
      const totalHeight = containerSize.h;
      const mainHeight = hasRsi || hasMacd
        ? Math.floor(totalHeight * 0.68)
        : totalHeight;
      const rsiHeight = hasRsi
        ? (hasMacd ? Math.floor(totalHeight * 0.16) : Math.floor(totalHeight * 0.32))
        : 0;
      const macdHeight = hasMacd ? Math.floor(totalHeight * 0.32) : 0;

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

      mainSeries.setData(candles);
      mainSeriesObj.current = mainSeries;

      // Reset indicator map
      indicatorSeriesMap.current.forEach(seriesList => seriesList.forEach(s => chart.removeSeries(s)));
      indicatorSeriesMap.current.clear();

      // Render Overlay Indicators
      indicators.forEach((ind) => {
        if (ind.type === 'sma') {
          const smaData = calculateSMA(candles, ind.params.period || 9);
          if (smaData.length > 0) {
            const series = chart.addSeries(LW.LineSeries, { color: ind.color, lineWidth: 1.5, title: ind.name });
            series.setData(smaData);
            indicatorSeriesMap.current.set(ind.id, [series]);
          }
        } else if (ind.type === 'ema') {
          const emaData = calculateEMA(candles, ind.params.period || 21);
          if (emaData.length > 0) {
            const series = chart.addSeries(LW.LineSeries, { color: ind.color, lineWidth: 1.5, title: ind.name });
            series.setData(emaData);
            indicatorSeriesMap.current.set(ind.id, [series]);
          }
        } else if (ind.type === 'vwap') {
          const vwapData = calculateVWAP(candles);
          if (vwapData.length > 0) {
            const series = chart.addSeries(LW.LineSeries, { color: ind.color, lineWidth: 1.5, title: ind.name });
            series.setData(vwapData);
            indicatorSeriesMap.current.set(ind.id, [series]);
          }
        } else if (ind.type === 'bb') {
          const bbData = calculateBollingerBands(candles, ind.params.period || 20, ind.params.multiplier || 2);
          if (bbData.length > 0) {
            const upperSeries = chart.addSeries(LW.LineSeries, { color: ind.color, lineWidth: 1, lineStyle: LW.LineStyle.Dashed, title: 'BB Upper' });
            const middleSeries = chart.addSeries(LW.LineSeries, { color: ind.color, lineWidth: 1.5, title: 'BB Middle' });
            const lowerSeries = chart.addSeries(LW.LineSeries, { color: ind.color, lineWidth: 1, lineStyle: LW.LineStyle.Dashed, title: 'BB Lower' });

            upperSeries.setData(bbData.map(d => ({ time: d.time, value: d.upper })));
            middleSeries.setData(bbData.map(d => ({ time: d.time, value: d.middle })));
            lowerSeries.setData(bbData.map(d => ({ time: d.time, value: d.lower })));

            indicatorSeriesMap.current.set(ind.id, [upperSeries, middleSeries, lowerSeries]);
          }
        }
      });

      // Render Sub-panel Oscillator Indicators
      if (hasRsi && rsiChartRef.current) {
        const rsiData = calculateRSI(candles, indicators.find(i => i.type === 'rsi')?.params.rsiPeriod || 14);
        if (rsiData.length > 0) {
          const rsiChart = LW.createChart(rsiChartRef.current, {
            ...baseChartOptions,
            width: containerSize.w,
            height: rsiHeight,
            timeScale: { ...baseChartOptions.timeScale, visible: !hasMacd },
          });
          rsiChartObj.current = rsiChart;

          const rsiSeries = rsiChart.addSeries(LW.LineSeries, {
            color: '#9b51e0',
            lineWidth: 1.5,
            title: 'RSI',
          });
          rsiSeries.setData(rsiData);
          rsiSeriesObj.current = rsiSeries;

          // Add overbought / oversold lines
          const lineUpper = rsiChart.addSeries(LW.LineSeries, { color: '#f23645', lineWidth: 0.5, lineStyle: LW.LineStyle.Dashed });
          const lineLower = rsiChart.addSeries(LW.LineSeries, { color: '#089981', lineWidth: 0.5, lineStyle: LW.LineStyle.Dashed });
          lineUpper.setData(rsiData.map(d => ({ time: d.time, value: 70 })));
          lineLower.setData(rsiData.map(d => ({ time: d.time, value: 30 })));

          // Sync timescale
          chart.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
            if (range) rsiChart.timeScale().setVisibleLogicalRange(range);
          });
          rsiChart.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
            if (range) chart.timeScale().setVisibleLogicalRange(range);
          });
        }
      }

      if (hasMacd && macdChartRef.current) {
        const macdConfig = indicators.find(i => i.type === 'macd')?.params || {};
        const macdData = calculateMACD(
          candles,
          macdConfig.fastPeriod || 12,
          macdConfig.slowPeriod || 26,
          macdConfig.signalPeriod || 9
        );

        if (macdData.length > 0) {
          const macdChart = LW.createChart(macdChartRef.current, {
            ...baseChartOptions,
            width: containerSize.w,
            height: macdHeight,
            timeScale: { ...baseChartOptions.timeScale, visible: true },
          });
          macdChartObj.current = macdChart;

          const macdLine = macdChart.addSeries(LW.LineSeries, { color: '#2f80ed', lineWidth: 1.5, title: 'MACD' });
          const signalLine = macdChart.addSeries(LW.LineSeries, { color: '#f2994a', lineWidth: 1.5, title: 'Signal' });
          const histLine = macdChart.addSeries(LW.HistogramSeries, {
            color: '#27ae60',
            title: 'Histogram',
          });

          macdLine.setData(macdData.map(d => ({ time: d.time, value: d.macd })));
          signalLine.setData(macdData.map(d => ({ time: d.time, value: d.signal })));
          histLine.setData(
            macdData.map(d => ({
              time: d.time,
              value: d.histogram,
              color: d.histogram >= 0 ? '#26a69a' : '#ef5350',
            }))
          );

          macdMacdSeriesObj.current = macdLine;
          macdSignalSeriesObj.current = signalLine;
          macdHistSeriesObj.current = histLine;

          // Sync timescales
          chart.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
            if (range) macdChart.timeScale().setVisibleLogicalRange(range);
          });
          macdChart.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
            if (range) chart.timeScale().setVisibleLogicalRange(range);
          });
          if (rsiChartObj.current) {
            rsiChartObj.current.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
              if (range) macdChart.timeScale().setVisibleLogicalRange(range);
            });
          }
        }
      }

      // Handle Crosshair Position updates for Legend and Crosshair Sync
      chart.subscribeCrosshairMove((param: any) => {
        if (!param || !param.time || param.point === undefined) {
          return;
        }
        
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

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        activeDrawings.forEach((drawing) => {
          ctx.strokeStyle = drawing.properties.color || '#2962ff';
          ctx.fillStyle = drawing.properties.color || '#2962ff';
          ctx.lineWidth = drawing.properties.width || 2;

          const points = drawing.points.map((pt) => {
            const x = chart.timeScale().timeToCoordinate(pt.time);
            const y = mainSeries.priceToCoordinate(pt.price);
            return { x, y };
          });

          // Draw depending on type
          if (drawing.type === 'trend' && points.length === 2) {
            const [p1, p2] = points;
            if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
              ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (drawing.type === 'horizontal' && points.length >= 1) {
            const [p1] = points;
            if (p1.y !== null) {
              ctx.beginPath();
              ctx.moveTo(0, p1.y);
              ctx.lineTo(canvas.width, p1.y);
              ctx.stroke();
            }
          } else if (drawing.type === 'vertical' && points.length >= 1) {
            const [p1] = points;
            if (p1.x !== null) {
              ctx.beginPath();
              ctx.moveTo(p1.x, 0);
              ctx.lineTo(p1.x, canvas.height);
              ctx.stroke();
            }
          } else if (drawing.type === 'rectangle' && points.length === 2) {
            const [p1, p2] = points;
            if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null) {
              ctx.beginPath();
              ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
              ctx.stroke();
              ctx.fillStyle = drawing.properties.fillColor || 'rgba(41, 98, 255, 0.15)';
              ctx.fill();
            }
          } else if (drawing.type === 'fib' && points.length === 2) {
            const [p1, p2] = points;
            if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null) {
              ctx.beginPath();
              ctx.strokeStyle = '#787b86';
              ctx.lineWidth = 1;
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();

              const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
              const colors = ['#f23645', '#ff9800', '#4caf50', '#00bcd4', '#2196f3', '#9c27b0', '#787b86'];
              const diff = p2.y - p1.y;
              const priceDiff = drawing.points[1].price - drawing.points[0].price;

              levels.forEach((lvl, idx) => {
                const y = p1.y + diff * lvl;
                ctx.strokeStyle = colors[idx];
                ctx.beginPath();
                ctx.moveTo(Math.min(p1.x, p2.x), y);
                ctx.lineTo(Math.max(p1.x, p2.x), y);
                ctx.stroke();

                ctx.fillStyle = colors[idx];
                ctx.font = '9px Arial';
                const priceVal = (drawing.points[0].price + priceDiff * lvl).toFixed(2);
                ctx.fillText(`Fib ${lvl} (${priceVal})`, Math.min(p1.x, p2.x) + 5, y - 4);
              });
            }
          } else if (drawing.type === 'text' && points.length >= 1) {
            const [p1] = points;
            if (p1.x !== null && p1.y !== null) {
              ctx.fillStyle = drawing.properties.color || '#fff';
              ctx.font = '12px Arial';
              ctx.fillText(drawing.properties.text || '', p1.x + 8, p1.y + 4);
              ctx.beginPath();
              ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });

        // Draw active drawing in progress
        if (isDrawing && drawingPoints.length > 0) {
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = currentWidth;
          ctx.fillStyle = currentColor;

          const p1 = {
            x: chart.timeScale().timeToCoordinate(drawingPoints[0].time),
            y: mainSeries.priceToCoordinate(drawingPoints[0].price),
          };

          if (p1.x !== null && p1.y !== null) {
            if (activeTool === 'trend' && drawingPoints.length === 2) {
              const p2 = {
                x: chart.timeScale().timeToCoordinate(drawingPoints[1].time),
                y: mainSeries.priceToCoordinate(drawingPoints[1].price),
              };
              if (p2.x !== null && p2.y !== null) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
              }
            } else if (activeTool === 'rectangle' && drawingPoints.length === 2) {
              const p2 = {
                x: chart.timeScale().timeToCoordinate(drawingPoints[1].time),
                y: mainSeries.priceToCoordinate(drawingPoints[1].price),
              };
              if (p2.x !== null && p2.y !== null) {
                ctx.beginPath();
                ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
                ctx.stroke();
              }
            } else if (activeTool === 'fib' && drawingPoints.length === 2) {
              const p2 = {
                x: chart.timeScale().timeToCoordinate(drawingPoints[1].time),
                y: mainSeries.priceToCoordinate(drawingPoints[1].price),
              };
              if (p2.x !== null && p2.y !== null) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
              }
            }
          }
        }
      };

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
      if (marketManager) {
        marketManager.subscribe(config.symbol, config.timeframe, (realtimeCandle, isFinal) => {
          mainSeries.update(realtimeCandle);
          
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

          setOhlc({
            o: realtimeCandle.open,
            h: realtimeCandle.high,
            l: realtimeCandle.low,
            c: realtimeCandle.close,
            v: realtimeCandle.volume,
          });
        });
      }

      // Cleanup
      return () => {
        destroyed = true;
        if (marketManager) {
          marketManager.unsubscribe(config.symbol, config.timeframe);
        }
        try { chart.remove(); } catch (e) { /* ignore */ }
        try { if (rsiChartObj.current) rsiChartObj.current.remove(); } catch (e) { /* ignore */ }
        try { if (macdChartObj.current) macdChartObj.current.remove(); } catch (e) { /* ignore */ }
      };
    });

    // The dynamic import returns a promise; we can't return the cleanup directly.
    // Instead we track `destroyed` flag and clean up from within the .then()
    return () => {
      destroyed = true;
      if (marketManager) {
        marketManager.unsubscribe(config.symbol, config.timeframe);
      }
      try { if (chartObj.current) chartObj.current.remove(); } catch (e) { /* ignore */ }
      try { if (rsiChartObj.current) rsiChartObj.current.remove(); } catch (e) { /* ignore */ }
      try { if (macdChartObj.current) macdChartObj.current.remove(); } catch (e) { /* ignore */ }
      chartObj.current = null;
      rsiChartObj.current = null;
      macdChartObj.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, candles.length, config.chartType, config.symbol, config.timeframe, containerSize.w, containerSize.h, indicators.length, hasRsi, hasMacd]);

  // Resize existing chart when container size changes (without full rebuild)
  useEffect(() => {
    if (containerSize.w === 0 || containerSize.h === 0) return;
    const mainHeight = hasRsi || hasMacd
      ? Math.floor(containerSize.h * 0.68)
      : containerSize.h;
    if (chartObj.current) {
      try { chartObj.current.resize(containerSize.w, mainHeight); } catch (e) { /* ignore */ }
    }
    if (rsiChartObj.current) {
      const rsiH = hasRsi ? (hasMacd ? Math.floor(containerSize.h * 0.16) : Math.floor(containerSize.h * 0.32)) : 0;
      try { rsiChartObj.current.resize(containerSize.w, rsiH); } catch (e) { /* ignore */ }
    }
    if (macdChartObj.current) {
      const macdH = hasMacd ? Math.floor(containerSize.h * 0.32) : 0;
      try { macdChartObj.current.resize(containerSize.w, macdH); } catch (e) { /* ignore */ }
    }
    if (canvasRef.current) {
      canvasRef.current.width = containerSize.w;
      canvasRef.current.height = mainHeight;
    }
  }, [containerSize.w, containerSize.h, hasRsi, hasMacd]);

  // Handle Drawings Canvas Clicks
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeTool || !chartObj.current || !mainSeriesObj.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const time = chartObj.current.timeScale().coordinateToTime(x);
    const price = mainSeriesObj.current.coordinateToPrice(y);

    if (time === null || price === null) return;

    const point = { time, price };

    if (activeTool === 'trend' || activeTool === 'rectangle' || activeTool === 'fib') {
      if (!isDrawing) {
        setIsDrawing(true);
        setDrawingPoints([point, point]);
      } else {
        addDrawing({
          symbol: config.symbol,
          type: activeTool,
          points: [drawingPoints[0], point],
          properties: { color: currentColor, width: currentWidth, fillColor: 'rgba(41, 98, 255, 0.12)' },
        });
        setIsDrawing(false);
        setDrawingPoints([]);
        setActiveTool(null);
      }
    } else if (activeTool === 'horizontal') {
      addDrawing({
        symbol: config.symbol,
        type: 'horizontal',
        points: [point],
        properties: { color: currentColor, width: currentWidth },
      });
      setActiveTool(null);
    } else if (activeTool === 'vertical') {
      addDrawing({
        symbol: config.symbol,
        type: 'vertical',
        points: [point],
        properties: { color: currentColor, width: currentWidth },
      });
      setActiveTool(null);
    } else if (activeTool === 'text') {
      setTextModal({ open: true, x: e.clientX, y: e.clientY, time, price });
      setActiveTool(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || drawingPoints.length === 0 || !chartObj.current || !mainSeriesObj.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const time = chartObj.current.timeScale().coordinateToTime(x);
    const price = mainSeriesObj.current.coordinateToPrice(y);

    if (time === null || price === null) return;

    setDrawingPoints([drawingPoints[0], { time, price }]);
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

  return (
    <div 
      ref={outerRef}
      onClick={() => setActiveChartId(config.id)}
      className={`flex-1 w-full h-full min-w-0 min-h-0 border bg-[#131722] rounded-xl overflow-hidden shadow-lg select-none relative ${
        isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border/60'
      }`}
    >
      {/* Chart Legend / HUD overlay */}
      <div className="absolute top-3 left-4 z-30 pointer-events-none flex flex-col gap-1.5 bg-[#131722]/85 backdrop-blur px-3 py-2 rounded-lg border border-border/40 max-w-[90%]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-bold text-foreground text-sm tracking-wide">{config.symbol}</span>
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
        <div className="absolute inset-0 flex items-center justify-center bg-[#131722]/60 backdrop-blur z-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#131722] z-20 p-6 text-center">
          <p className="text-destructive font-semibold mb-2">{error}</p>
          <p className="text-xs text-muted-foreground">Double check your connection or try another symbol pair.</p>
        </div>
      )}

      {/* Chart Panels — absolutely positioned with explicit pixel dimensions */}
      {/* Main Price Chart — always rendered so ref is available */}
      <div 
        ref={mainChartRef} 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: containerSize.w > 0 ? containerSize.w : '100%',
          height: containerSize.h > 0 
            ? (hasRsi || hasMacd 
                ? Math.floor(containerSize.h * 0.68)
                : containerSize.h)
            : '100%'
        }} 
      />

      {/* Dynamic Drawings Canvas Layer */}
      {activeTool && containerSize.w > 0 && (
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          className="cursor-crosshair z-10 pointer-events-auto"
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: containerSize.w, 
            height: hasRsi || hasMacd 
              ? Math.floor(containerSize.h * 0.68)
              : containerSize.h 
          }}
        />
      )}

      {/* RSI Oscillator Panel */}
      {hasRsi && containerSize.h > 0 && (
        <div 
          ref={rsiChartRef} 
          className="border-t border-border" 
          style={{ 
            position: 'absolute',
            left: 0,
            top: Math.floor(containerSize.h * 0.68),
            width: containerSize.w,
            height: hasMacd 
              ? Math.floor(containerSize.h * 0.16) 
              : Math.floor(containerSize.h * 0.32)
          }} 
        />
      )}

      {/* MACD Oscillator Panel */}
      {hasMacd && containerSize.h > 0 && (
        <div 
          ref={macdChartRef} 
          className="border-t border-border" 
          style={{ 
            position: 'absolute',
            left: 0,
            top: Math.floor(containerSize.h * (hasRsi ? 0.84 : 0.68)),
            width: containerSize.w,
            height: Math.floor(containerSize.h * 0.32)
          }} 
        />
      )}

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
    </div>
  );
}
