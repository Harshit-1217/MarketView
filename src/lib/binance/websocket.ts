import { Candle, TIMEFRAME_MAP } from './client';

type CandleCallback = (candle: Candle, isFinal: boolean) => void;

interface Subscription {
  symbol: string;
  timeframe: string;
  callback: CandleCallback;
}

class BinanceWebSocketManager {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private reconnectInterval = 5000;
  private isConnecting = false;

  constructor() {
    // Only run on client side
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  private connect() {
    if (this.ws || this.isConnecting) return;
    this.isConnecting = true;

    try {
      // Connect to Binance multi-stream endpoint
      this.ws = new WebSocket('wss://stream.binance.com:9443/ws');

      this.ws.onopen = () => {
        console.log('Connected to Binance WebSocket');
        this.isConnecting = false;
        
        // Re-subscribe to any existing streams
        if (this.subscriptions.size > 0) {
          const streams = Array.from(this.subscriptions.keys());
          this.sendSubscribe(streams);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Check if message is a kline update
          if (message.e === 'kline') {
            const symbol = message.s.toLowerCase();
            const interval = message.k.i;
            const key = `${symbol}@kline_${interval}`;
            
            const subscription = this.subscriptions.get(key);
            if (subscription) {
              const candle: Candle = {
                time: Math.floor(message.k.t / 1000), // convert to seconds
                open: parseFloat(message.k.o),
                high: parseFloat(message.k.h),
                low: parseFloat(message.k.l),
                close: parseFloat(message.k.c),
                volume: parseFloat(message.k.v),
              };
              
              subscription.callback(candle, message.k.x); // x is true if kline is closed
            }
          }
        } catch (e) {
          // Ignore parse errors or other messages
        }
      };

      this.ws.onerror = (error) => {
        console.error('Binance WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Binance WebSocket connection closed. Reconnecting...');
        this.ws = null;
        this.isConnecting = false;
        setTimeout(() => this.connect(), this.reconnectInterval);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.isConnecting = false;
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  public subscribe(symbol: string, timeframe: string, callback: CandleCallback) {
    const sym = symbol.toLowerCase();
    const interval = TIMEFRAME_MAP[timeframe] || '1h';
    const streamName = `${sym}@kline_${interval}`;
    
    // Add to subscriptions map
    this.subscriptions.set(streamName, { symbol, timeframe, callback });
    
    // Send subscription command if WebSocket is open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscribe([streamName]);
    }
  }

  public unsubscribe(symbol: string, timeframe: string) {
    const sym = symbol.toLowerCase();
    const interval = TIMEFRAME_MAP[timeframe] || '1h';
    const streamName = `${sym}@kline_${interval}`;
    
    this.subscriptions.delete(streamName);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendUnsubscribe([streamName]);
    }
  }

  private sendSubscribe(streams: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    const payload = {
      method: 'SUBSCRIBE',
      params: streams,
      id: Math.floor(Math.random() * 10000)
    };
    
    this.ws.send(JSON.stringify(payload));
  }

  private sendUnsubscribe(streams: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    const payload = {
      method: 'UNSUBSCRIBE',
      params: streams,
      id: Math.floor(Math.random() * 10000)
    };
    
    this.ws.send(JSON.stringify(payload));
  }
}

// Singleton manager
export const binanceWSManager = typeof window !== 'undefined' 
  ? new BinanceWebSocketManager() 
  : null;
