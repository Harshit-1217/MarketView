'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useBacktestStore } from '@/lib/store/backtestStore';
import { fetchHistoricalCandles, Candle } from '@/lib/market/client';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  Coins,
  Settings
} from 'lucide-react';

export default function StrategyEditor() {
  const chartRef = useRef<HTMLDivElement>(null);
  const equityChartRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<any>(null);

  // Store bindings
  const { 
    candles, 
    currentIndex, 
    isPlaying, 
    playbackSpeed, 
    activeTrade, 
    trades, 
    equityCurve, 
    balance, 
    loadCandles, 
    resetReplay, 
    stepForward, 
    stepBackward, 
    setPlaying, 
    setSpeed, 
    executeBuy, 
    executeSell 
  } = useBacktestStore();

  const [symbol, setSymbol] = useState('RELIANCE.NS');
  const [timeframe, setTimeframe] = useState('1h');
  const [loading, setLoading] = useState(false);

  // Ticker choices
  const symbolsList = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS'];
  const timeframesList = ['15m', '1h', '4h', '1D'];

  // Load candles from Binance REST API on submit
  const handleLoadData = async () => {
    setLoading(true);
    try {
      const data = await fetchHistoricalCandles(symbol, timeframe, 500);
      loadCandles(data);
    } catch (e) {
      console.error(e);
      alert('Failed to load historical candles for backtesting.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger initial fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      handleLoadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [handleLoadData]);

  // Handle Play Interval Loop
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        stepForward();
      }, playbackSpeed);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, stepForward]);

  // Construct charts inside useEffect on index changes
  useEffect(() => {
    if (candles.length === 0) return;

    import('lightweight-charts').then((LW) => {
      if (!chartRef.current || !equityChartRef.current) return;

      // Clean existing HTML
      chartRef.current.innerHTML = '';
      equityChartRef.current.innerHTML = '';

      const chartOptions = {
        layout: {
          background: { type: LW.ColorType.Solid, color: '#131722' },
          textColor: '#d1d4dc',
        },
        grid: {
          vertLines: { color: '#2a2e39' },
          horzLines: { color: '#2a2e39' },
        },
        timeScale: {
          borderColor: '#2a2e39',
          timeVisible: true,
        },
      };

      // 1. Replay Candlestick Chart
      const chart = LW.createChart(chartRef.current, {
        ...chartOptions,
        width: chartRef.current.clientWidth,
        height: chartRef.current.clientHeight,
      });

      const candleSeries = chart.addSeries(LW.CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      // Show data only up to current index
      const slicedCandles = candles.slice(0, currentIndex + 1);
      candleSeries.setData(slicedCandles as any);

      // Add trade markers (entries/exits) on the replay chart
      const markers: any[] = [];
      trades.forEach((trade) => {
        // Entry Marker
        markers.push({
          time: trade.entryTime,
          position: trade.type === 'BUY' ? 'belowBar' : 'aboveBar',
          color: trade.type === 'BUY' ? '#26a69a' : '#ef5350',
          shape: trade.type === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: `${trade.type} @ ${trade.entryPrice.toFixed(1)}`,
        });

        // Exit Marker
        markers.push({
          time: trade.exitTime,
          position: trade.type === 'BUY' ? 'aboveBar' : 'belowBar',
          color: '#2962ff',
          shape: 'circle',
          text: `CLOSE @ ${trade.exitPrice.toFixed(1)} PnL: ${trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(1)}`,
        });
      });

      // Handle active trade entry marker
      if (activeTrade) {
        markers.push({
          time: activeTrade.entryTime,
          position: activeTrade.type === 'BUY' ? 'belowBar' : 'aboveBar',
          color: '#e7c617',
          shape: 'arrowUp',
          text: `OPEN ${activeTrade.type} @ ${activeTrade.entryPrice.toFixed(1)}`,
        });
      }

      (candleSeries as any).setMarkers(markers.sort((a, b) => (a.time as number) - (b.time as number)));

      // 2. Equity Curve Chart
      const equityChart = LW.createChart(equityChartRef.current, {
        ...chartOptions,
        width: equityChartRef.current.clientWidth,
        height: equityChartRef.current.clientHeight,
        localization: {
          priceFormatter: (val: number) => `$${val.toFixed(2)}`,
        },
      });

      const equitySeries = equityChart.addSeries(LW.LineSeries, {
        color: '#26a69a',
        lineWidth: 2,
        title: 'Balance/Equity',
      });

      equitySeries.setData(equityCurve as any);

      // Sync Scales
      chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range) equityChart.timeScale().setVisibleLogicalRange(range);
      });
      equityChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range) chart.timeScale().setVisibleLogicalRange(range);
      });

      // Handle Resize
      const handleResize = () => {
        if (chartRef.current && equityChartRef.current) {
          chart.resize(chartRef.current.clientWidth, chartRef.current.clientHeight);
          equityChart.resize(equityChartRef.current.clientWidth, equityChartRef.current.clientHeight);
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
        equityChart.remove();
      };
    });
  }, [candles, currentIndex, trades, activeTrade, equityCurve]);

  const currentCandle = candles[currentIndex];

  return (
    <div className="flex-grow flex flex-col min-h-0 bg-[#131722]">
      {/* Control settings header */}
      <div className="h-14 border-b border-border bg-card/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0 w-full z-10 select-none">
        <div className="flex items-center gap-3">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-secondary border border-border rounded-lg text-xs font-bold px-2 py-1.5 text-foreground"
          >
            {symbolsList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-secondary border border-border rounded-lg text-xs font-semibold px-2 py-1.5 text-foreground"
          >
            {timeframesList.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>

          <button
            onClick={handleLoadData}
            disabled={loading}
            className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/95 transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
          >
            {loading ? 'Loading...' : 'Load Replay'}
          </button>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5 bg-secondary/40 p-0.5 rounded-lg border border-border">
          <button
            onClick={stepBackward}
            title="Step Back"
            className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          
          <button
            onClick={() => setPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play Replay'}
            className="p-2 bg-primary text-white rounded-lg hover:bg-primary/95 transition shadow shadow-primary/15 cursor-pointer"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-white" />}
          </button>

          <button
            onClick={stepForward}
            title="Step Forward"
            className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={resetReplay}
            title="Reset simulation"
            className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Replay Speed */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            className="bg-secondary border border-border rounded-lg text-xs font-semibold px-2 py-1 text-foreground"
          >
            <option value={1000}>1s</option>
            <option value={500}>0.5s</option>
            <option value={200}>0.2s</option>
            <option value={50}>Realtime</option>
          </select>
        </div>
      </div>

      {/* Replay Canvas Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Main Candles Replay Chart */}
          <div ref={chartRef} className="flex-grow min-h-0" />

          {/* Equity Chart */}
          <div ref={equityChartRef} className="h-44 border-t border-border" />
        </div>

        {/* Simulated Execution Panel */}
        <div className="w-full md:w-60 border-t md:border-t-0 md:border-l border-border bg-card p-4 flex flex-col justify-between shrink-0 select-none">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Simulated Order Desk</h3>
            
            <div className="flex gap-2">
              <button
                onClick={executeBuy}
                className={`flex-1 py-3 bg-bull text-white font-bold rounded-xl text-xs shadow-md shadow-bull/15 transition hover:brightness-110 flex flex-col items-center gap-1 cursor-pointer`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>{activeTrade?.type === 'SELL' ? 'CLOSE SHORT' : 'BUY LONG'}</span>
              </button>

              <button
                onClick={executeSell}
                className={`flex-1 py-3 bg-bear text-white font-bold rounded-xl text-xs shadow-md shadow-bear/15 transition hover:brightness-110 flex flex-col items-center gap-1 cursor-pointer`}
              >
                <TrendingDown className="h-4 w-4" />
                <span>{activeTrade?.type === 'BUY' ? 'CLOSE LONG' : 'SELL SHORT'}</span>
              </button>
            </div>

            {/* Active Position Info */}
            <div className="p-3 bg-secondary/50 rounded-xl border border-border">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Active Position</div>
              {activeTrade ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-muted-foreground">Type:</span>
                    <span className={`font-bold ${activeTrade.type === 'BUY' ? 'text-bull' : 'text-bear'}`}>
                      {activeTrade.type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-muted-foreground">Qty:</span>
                    <span className="font-mono font-bold text-foreground">{activeTrade.quantity}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-muted-foreground">Entry:</span>
                    <span className="font-mono font-bold text-foreground">${activeTrade.entryPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-border/50 pt-2">
                    <span className="font-semibold text-muted-foreground">Current:</span>
                    <span className="font-mono font-bold text-foreground">
                      ${currentCandle ? currentCandle.close.toFixed(2) : '---'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-2">No open positions</p>
              )}
            </div>
          </div>

          {/* Balance / Equity counters */}
          <div className="space-y-3 mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-semibold flex items-center gap-1">
                <Coins className="h-4 w-4 text-amber-500" />
                <span>Sim Balance:</span>
              </span>
              <span className="font-mono font-bold text-foreground">${balance.toFixed(2)}</span>
            </div>
            {currentCandle && (
              <div className="text-[10px] text-muted-foreground font-mono text-right">
                Tick: {new Date(typeof currentCandle.time === 'number' ? currentCandle.time * 1000 : currentCandle.time).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
