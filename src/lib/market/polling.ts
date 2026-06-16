import { Candle, TIMEFRAME_MAP } from './client';

type CandleCallback = (candle: Candle, isFinal: boolean) => void;

interface Subscription {
  symbol: string;
  timeframe: string;
  callback: CandleCallback;
}

class MarketPollingManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private pollingIntervals: Map<string, any> = new Map();

  public subscribe(symbol: string, timeframe: string, callback: CandleCallback) {
    const sym = symbol.toLowerCase();
    const interval = TIMEFRAME_MAP[timeframe] || '1h';
    const streamName = `${sym}@kline_${interval}`;
    
    this.subscriptions.set(streamName, { symbol, timeframe, callback });
    this.startPolling(symbol, timeframe, callback);
  }

  public unsubscribe(symbol: string, timeframe: string) {
    const sym = symbol.toLowerCase();
    const interval = TIMEFRAME_MAP[timeframe] || '1h';
    const streamName = `${sym}@kline_${interval}`;
    
    this.subscriptions.delete(streamName);
    this.stopPolling(streamName);
  }

  private startPolling(symbol: string, timeframe: string, callback: CandleCallback) {
    const sym = symbol.toLowerCase();
    const interval = TIMEFRAME_MAP[timeframe] || '1h';
    const streamName = `${sym}@kline_${interval}`;

    if (this.pollingIntervals.has(streamName)) {
      clearInterval(this.pollingIntervals.get(streamName));
    }

    const poll = async () => {
      try {
        const querySymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
        const url = `/api/market/history?symbol=${querySymbol.toUpperCase()}&interval=${timeframe}&limit=2`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const latestCandle = data[data.length - 1];
            callback(latestCandle, false);
          }
        }
      } catch (err) {
        console.error('Polling error for', symbol, err);
      }
    };

    // Poll every 10 seconds
    const intervalId = setInterval(poll, 10000);
    this.pollingIntervals.set(streamName, intervalId);
  }

  private stopPolling(streamName: string) {
    if (this.pollingIntervals.has(streamName)) {
      clearInterval(this.pollingIntervals.get(streamName));
      this.pollingIntervals.delete(streamName);
    }
  }
}

// Singleton manager
export const marketManager = typeof window !== 'undefined' 
  ? new MarketPollingManager() 
  : null;
