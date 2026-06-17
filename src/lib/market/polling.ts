import { Candle, TIMEFRAME_MAP } from './client';

type CandleCallback = (candle: Candle, isFinal: boolean) => void;

interface Subscription {
  symbol: string;
  timeframe: string;
  callbacks: Set<CandleCallback>;
}

class MarketPollingManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private pollingIntervals: Map<string, any> = new Map();

  public subscribe(symbol: string, timeframe: string, callback: CandleCallback): () => void {
    const sym = symbol.toLowerCase();
    const interval = TIMEFRAME_MAP[timeframe] || '1h';
    const streamName = `${sym}@kline_${interval}`;
    
    let sub = this.subscriptions.get(streamName);
    if (!sub) {
      sub = { symbol, timeframe, callbacks: new Set() };
      this.subscriptions.set(streamName, sub);
    }
    
    sub.callbacks.add(callback);

    if (!this.pollingIntervals.has(streamName)) {
      this.startPolling(streamName, symbol, timeframe);
    }

    return () => {
      this.unsubscribe(symbol, timeframe, callback);
    };
  }

  public unsubscribe(symbol: string, timeframe: string, callback?: CandleCallback) {
    const sym = symbol.toLowerCase();
    const interval = TIMEFRAME_MAP[timeframe] || '1h';
    const streamName = `${sym}@kline_${interval}`;
    
    const sub = this.subscriptions.get(streamName);
    if (sub) {
      if (callback) {
        sub.callbacks.delete(callback);
      } else {
        sub.callbacks.clear();
      }

      if (sub.callbacks.size === 0) {
        this.subscriptions.delete(streamName);
        this.stopPolling(streamName);
      }
    }
  }

  private startPolling(streamName: string, symbol: string, timeframe: string) {
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
            const sub = this.subscriptions.get(streamName);
            if (sub) {
              sub.callbacks.forEach(cb => cb(latestCandle, false));
            }
          }
        }
      } catch (err) {
        console.error('Polling error for', symbol, err);
      }
    };

    // Initial poll
    poll();

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
