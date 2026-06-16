import { create } from 'zustand';
import { Candle } from '../binance/client';

export interface BacktestTrade {
  id: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryTime: number;
  exitTime: number;
  pnl: number;
  pnlPercent: number;
}

interface BacktestState {
  candles: Candle[];
  currentIndex: number; // Index in the candles array
  isPlaying: boolean;
  playbackSpeed: number; // ms per frame
  activeTrade: { type: 'BUY' | 'SELL'; entryPrice: number; entryTime: number; quantity: number } | null;
  trades: BacktestTrade[];
  equityCurve: { time: number; value: number }[];
  initialBalance: number;
  balance: number;

  // Actions
  loadCandles: (candles: Candle[]) => void;
  resetReplay: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  executeBuy: () => void;
  executeSell: () => void;
  getStatistics: () => {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    netProfit: number;
    netProfitPercent: number;
  };
}

export const useBacktestStore = create<BacktestState>((set, get) => ({
  candles: [],
  currentIndex: 0,
  isPlaying: false,
  playbackSpeed: 500,
  activeTrade: null,
  trades: [],
  equityCurve: [],
  initialBalance: 10000,
  balance: 10000,

  loadCandles: (candles) => {
    // Start replay at 80% through the candles list so they can play the remaining 20%
    const startIndex = Math.max(0, Math.floor(candles.length * 0.8));
    set({
      candles,
      currentIndex: startIndex,
      isPlaying: false,
      activeTrade: null,
      trades: [],
      balance: 10000,
      equityCurve: [{ time: candles[startIndex]?.time || 0, value: 10000 }],
    });
  },

  resetReplay: () => {
    const { candles, initialBalance } = get();
    const startIndex = Math.max(0, Math.floor(candles.length * 0.8));
    set({
      currentIndex: startIndex,
      isPlaying: false,
      activeTrade: null,
      trades: [],
      balance: initialBalance,
      equityCurve: [{ time: candles[startIndex]?.time || 0, value: initialBalance }],
    });
  },

  stepForward: () => {
    const { candles, currentIndex, activeTrade, balance, equityCurve } = get();
    if (currentIndex >= candles.length - 1) {
      set({ isPlaying: false });
      return;
    }

    const nextIndex = currentIndex + 1;
    const currentCandle = candles[nextIndex];

    // Update equity curve based on current balance + active trade floating profit
    let currentEquity = balance;
    if (activeTrade) {
      const priceDiff = currentCandle.close - activeTrade.entryPrice;
      const tradePnl = activeTrade.type === 'BUY' 
        ? priceDiff * activeTrade.quantity 
        : -priceDiff * activeTrade.quantity;
      currentEquity = balance + tradePnl;
    }

    set({
      currentIndex: nextIndex,
      equityCurve: [...equityCurve, { time: currentCandle.time, value: currentEquity }],
    });
  },

  stepBackward: () => {
    const { currentIndex, equityCurve } = get();
    if (currentIndex <= 0) return;
    
    set({
      currentIndex: currentIndex - 1,
      equityCurve: equityCurve.slice(0, -1),
    });
  },

  setPlaying: (isPlaying) => set({ isPlaying }),
  setSpeed: (playbackSpeed) => set({ playbackSpeed }),

  executeBuy: () => {
    const { candles, currentIndex, activeTrade, balance, trades } = get();
    const currentCandle = candles[currentIndex];
    if (!currentCandle) return;

    if (activeTrade) {
      // Close active trade if it's a SELL (short)
      if (activeTrade.type === 'SELL') {
        const exitPrice = currentCandle.close;
        const priceDiff = activeTrade.entryPrice - exitPrice;
        const pnl = priceDiff * activeTrade.quantity;
        const pnlPercent = (priceDiff / activeTrade.entryPrice) * 100;
        const finalBalance = balance + pnl;

        const newTrade: BacktestTrade = {
          id: `trade-${Date.now()}`,
          type: 'SELL',
          entryPrice: activeTrade.entryPrice,
          exitPrice,
          quantity: activeTrade.quantity,
          entryTime: activeTrade.entryTime,
          exitTime: currentCandle.time,
          pnl,
          pnlPercent,
        };

        set({
          balance: finalBalance,
          activeTrade: null,
          trades: [...trades, newTrade],
        });
      }
    } else {
      // Open new BUY position
      const quantity = Math.floor((balance * 0.95) / currentCandle.close); // use 95% of balance
      if (quantity <= 0) return;

      set({
        activeTrade: {
          type: 'BUY',
          entryPrice: currentCandle.close,
          entryTime: currentCandle.time,
          quantity,
        },
      });
    }
  },

  executeSell: () => {
    const { candles, currentIndex, activeTrade, balance, trades } = get();
    const currentCandle = candles[currentIndex];
    if (!currentCandle) return;

    if (activeTrade) {
      // Close active trade if it's a BUY (long)
      if (activeTrade.type === 'BUY') {
        const exitPrice = currentCandle.close;
        const priceDiff = exitPrice - activeTrade.entryPrice;
        const pnl = priceDiff * activeTrade.quantity;
        const pnlPercent = (priceDiff / activeTrade.entryPrice) * 100;
        const finalBalance = balance + pnl;

        const newTrade: BacktestTrade = {
          id: `trade-${Date.now()}`,
          type: 'BUY',
          entryPrice: activeTrade.entryPrice,
          exitPrice,
          quantity: activeTrade.quantity,
          entryTime: activeTrade.entryTime,
          exitTime: currentCandle.time,
          pnl,
          pnlPercent,
        };

        set({
          balance: finalBalance,
          activeTrade: null,
          trades: [...trades, newTrade],
        });
      }
    } else {
      // Open new SELL position
      const quantity = Math.floor((balance * 0.95) / currentCandle.close);
      if (quantity <= 0) return;

      set({
        activeTrade: {
          type: 'SELL',
          entryPrice: currentCandle.close,
          entryTime: currentCandle.time,
          quantity,
        },
      });
    }
  },

  getStatistics: () => {
    const { trades, initialBalance, balance } = get();
    const totalTrades = trades.length;
    
    if (totalTrades === 0) {
      return { totalTrades: 0, winRate: 0, profitFactor: 0, netProfit: 0, netProfitPercent: 0 };
    }

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);
    const winRate = (wins.length / totalTrades) * 100;

    const totalWinsSum = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLossSum = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLossSum === 0 ? totalWinsSum : totalWinsSum / totalLossSum;

    const netProfit = balance - initialBalance;
    const netProfitPercent = (netProfit / initialBalance) * 100;

    return {
      totalTrades,
      winRate,
      profitFactor,
      netProfit,
      netProfitPercent,
    };
  },
}));
