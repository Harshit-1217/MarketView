'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChartStore, ChartConfig, ChartSeriesType } from '@/lib/store/chartStore';
import { useIndicatorStore, IndicatorInstance } from '@/lib/store/indicatorStore';
import { useDrawingStore, Drawing, DrawingPoint, DrawingProperties } from '@/lib/store/drawingStore';
import { fetchHistoricalCandles, Candle } from '@/lib/binance/client';
import { binanceWSManager } from '@/lib/binance/websocket';
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
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<HTMLDivElement>(null);
  const macdChartRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Load Drawings for symbol on mount/change
  useEffect(() => {
    fetchDrawings(config.symbol);
  }, [config.symbol, fetchDrawings]);

  // Main Chart instantiation & Historical Loading
  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!mainChartRef.current) return;
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

  // Construct / update charts on UI changes
  useEffect(() => {
    if (loading || candles.length === 0) return;

    // Dynamically load Lightweight Charts library
    import('lightweight-charts').then((LW) => {
      if (!mainChartRef.current) return;

      // Clean existing container children
      mainChartRef.current.innerHTML = '';
      if (rsiChartRef.current) rsiChartRef.current.innerHTML = '';
      if (macdChartRef.current) macdChartRef.current.innerHTML = '';

      const baseChartOptions = {
        layout: {
          background: { type: LW.ColorType.Solid, color: '#131722' },
          textColor: '#d1d4dc',
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

      // Create main chart
      const chart = LW.createChart(mainChartRef.current, {
        ...baseChartOptions,
        width: mainChartRef.current.clientWidth,
        height: mainChartRef.current.clientHeight,
      });
      chartObj.current = chart;

      // Add Series based on selected chart type
      let mainSeries: any;
      if (config.chartType === 'candlestick') {
        mainSeries = chart.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });
      } else if (config.chartType === 'area') {
        mainSeries = chart.addAreaSeries({
          topColor: 'rgba(41, 98, 255, 0.56)',
          bottomColor: 'rgba(41, 98, 255, 0.04)',
          lineColor: 'rgba(41, 98, 255, 1)',
          lineWidth: 2,
        });
      } else {
        mainSeries = chart.addLineSeries({
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
            const series = chart.addLineSeries({ color: ind.color, lineWidth: 1.5, title: ind.name });
            series.setData(smaData);
            indicatorSeriesMap.current.set(ind.id, [series]);
          }
        } else if (ind.type === 'ema') {
          const emaData = calculateEMA(candles, ind.params.period || 21);
          if (emaData.length > 0) {
            const series = chart.addLineSeries({ color: ind.color, lineWidth: 1.5, title: ind.name });
            series.setData(emaData);
            indicatorSeriesMap.current.set(ind.id, [series]);
          }
        } else if (ind.type === 'vwap') {
          const vwapData = calculateVWAP(candles);
          if (vwapData.length > 0) {
            const series = chart.addLineSeries({ color: ind.color, lineWidth: 1.5, title: ind.name });
            series.setData(vwapData);
            indicatorSeriesMap.current.set(ind.id, [series]);
          }
        } else if (ind.type === 'bb') {
          const bbData = calculateBollingerBands(candles, ind.params.period || 20, ind.params.multiplier || 2);
          if (bbData.length > 0) {
            const upperSeries = chart.addLineSeries({ color: ind.color, lineWidth: 1, lineStyle: LW.LineStyle.Dashed, title: 'BB Upper' });
            const middleSeries = chart.addLineSeries({ color: ind.color, lineWidth: 1.5, title: 'BB Middle' });
            const lowerSeries = chart.addLineSeries({ color: ind.color, lineWidth: 1, lineStyle: LW.LineStyle.Dashed, title: 'BB Lower' });

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
            width: rsiChartRef.current.clientWidth,
            height: rsiChartRef.current.clientHeight,
            timeScale: { ...baseChartOptions.timeScale, visible: !hasMacd }, // show time scale only on bottommost panel
          });
          rsiChartObj.current = rsiChart;

          const rsiSeries = rsiChart.addLineSeries({
            color: '#9b51e0',
            lineWidth: 1.5,
            title: 'RSI',
          });
          rsiSeries.setData(rsiData);
          rsiSeriesObj.current = rsiSeries;

          // Add overbought / oversold lines
          const lineUpper = rsiChart.addLineSeries({ color: '#f23645', lineWidth: 0.5, lineStyle: LW.LineStyle.Dashed });
          const lineLower = rsiChart.addLineSeries({ color: '#089981', lineWidth: 0.5, lineStyle: LW.LineStyle.Dashed });
          lineUpper.setData(rsiData.map(d => ({ time: d.time, value: 70 })));
          lineLower.setData(rsiData.map(d => ({ time: d.time, value: 30 })));

          // Sync timescale
          chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) rsiChart.timeScale().setVisibleLogicalRange(range);
          });
          rsiChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
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
            width: macdChartRef.current.clientWidth,
            height: macdChartRef.current.clientHeight,
            timeScale: { ...baseChartOptions.timeScale, visible: true },
          });
          macdChartObj.current = macdChart;

          const macdLine = macdChart.addLineSeries({ color: '#2f80ed', lineWidth: 1.5, title: 'MACD' });
          const signalLine = macdChart.addLineSeries({ color: '#f2994a', lineWidth: 1.5, title: 'Signal' });
          const histLine = macdChart.addHistogramSeries({
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
          chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) macdChart.timeScale().setVisibleLogicalRange(range);
          });
          macdChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range) chart.timeScale().setVisibleLogicalRange(range);
          });
          if (rsiChartObj.current) {
            rsiChartObj.current.timeScale().subscribeVisibleLogicalRangeChange((range) => {
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

              // Draw circular nodes
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
              // Draw main diagonal line
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

                // Draw text label
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
              
              // Draw node dot
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

      // Redraw drawings on dynamic resize
      const handleResize = () => {
        if (!mainChartRef.current || !canvasRef.current) return;
        const w = mainChartRef.current.clientWidth;
        const h = mainChartRef.current.clientHeight;

        chart.resize(w, h);
        canvasRef.current.width = w;
        canvasRef.current.height = h;

        if (rsiChartObj.current && rsiChartRef.current) {
          rsiChartObj.current.resize(rsiChartRef.current.clientWidth, rsiChartRef.current.clientHeight);
        }
        if (macdChartObj.current && macdChartRef.current) {
          macdChartObj.current.resize(macdChartRef.current.clientWidth, macdChartRef.current.clientHeight);
        }

        drawAllDrawings();
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(mainChartRef.current);
      
      canvasRef.current.width = mainChartRef.current.clientWidth;
      canvasRef.current.height = mainChartRef.current.clientHeight;
      drawAllDrawings();

      // Hook WebSocket Streaming
      if (binanceWSManager) {
        binanceWSManager.subscribe(config.symbol, config.timeframe, (realtimeCandle, isFinal) => {
          mainSeries.update(realtimeCandle);
          
          setCandles((prev) => {
            if (prev.length === 0) return [realtimeCandle];
            const last = prev[prev.length - 1];
            if (last.time === realtimeCandle.time) {
              // Replace last candle
              const updated = [...prev.slice(0, -1), realtimeCandle];
              return updated;
            } else {
              // Append new candle
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
        resizeObserver.disconnect();
        if (binanceWSManager) {
          binanceWSManager.unsubscribe(config.symbol, config.timeframe);
        }
        chart.removeSeries(mainSeries);
        chart.destroy();
        if (rsiChartObj.current) rsiChartObj.current.destroy();
        if (macdChartObj.current) macdChartObj.current.destroy();
      };
    });
  }, [loading, candles, config.chartType, indicators, hasRsi, hasMacd, activeDrawings, isDrawing, drawingPoints, activeTool, currentColor, currentWidth]);

  // Synchronized Crosshair Position updates
  useEffect(() => {
    if (!syncCrosshair || !crosshairPosition || !chartObj.current || !mainSeriesObj.current) return;
    
    // Convert crosshair position coordinates to active charts
    const time = crosshairPosition.time;
    // Set custom hover state or coordinate mappings
  }, [crosshairPosition, syncCrosshair]);

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
        // Complete drawing
        addDrawing({
          symbol: config.symbol,
          type: activeTool,
          points: [drawingPoints[0], point],
          properties: { color: currentColor, width: currentWidth, fillColor: 'rgba(41, 98, 255, 0.12)' },
        });
        setIsDrawing(false);
        setDrawingPoints([]);
        setActiveTool(null); // Return to selector tool
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
      onClick={() => setActiveChartId(config.id)}
      className={`flex-1 flex flex-col min-w-0 border bg-[#131722] rounded-xl overflow-hidden shadow-lg select-none relative ${
        isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border/60'
      }`}
    >
      {/* Chart Legend / HUD overlay */}
      <div className="absolute top-3 left-4 z-10 pointer-events-none flex flex-col gap-1.5 bg-[#131722]/85 backdrop-blur px-3 py-2 rounded-lg border border-border/40 max-w-[90%]">
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

      {/* Main Split Panels */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Main Price Chart */}
        <div 
          ref={mainChartRef} 
          className="relative"
          style={{ height: hasRsi || hasMacd ? '68%' : '100%' }}
        />

        {/* Dynamic Drawings Canvas Layer */}
        {activeTool && (
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            className="absolute top-0 left-0 w-full cursor-crosshair z-10 pointer-events-auto"
            style={{ height: hasRsi || hasMacd ? '68%' : '100%' }}
          />
        )}

        {/* RSI Oscillator Panel */}
        {hasRsi && (
          <div 
            ref={rsiChartRef} 
            className="border-t border-border"
            style={{ height: hasMacd ? '16%' : '32%' }}
          />
        )}

        {/* MACD Oscillator Panel */}
        {hasMacd && (
          <div 
            ref={macdChartRef} 
            className="border-t border-border"
            style={{ height: '32%' }}
          />
        )}
      </div>

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
