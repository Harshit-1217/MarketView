export interface Candle {
  time: number; // in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const BASE_URL = process.env.NEXT_PUBLIC_BINANCE_API_URL || 'https://api.binance.com';

/**
 * Maps charting timeframes to Binance API intervals.
 */
export const TIMEFRAME_MAP: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1D': '1d',
  '1W': '1w',
};

/**
 * Fetches historical candle data from Binance.
 * @param symbol Trading symbol (e.g., BTCUSDT)
 * @param timeframe Timeframe string (e.g., '1h', '1D')
 * @param limit Number of bars (max 1000)
 */
export async function fetchHistoricalCandles(
  symbol: string,
  timeframe: string,
  limit = 500
): Promise<Candle[]> {
  const interval = TIMEFRAME_MAP[timeframe] || '1h';
  const url = `${BASE_URL}/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`);
    }
    const data = await response.json();

    // Map Binance array format to Candle objects
    // Binance response format:
    // [
    //   [
    //     1499040000000,      // [0] Open time
    //     "0.01634790",       // [1] Open
    //     "0.80000000",       // [2] High
    //     "0.01575800",       // [3] Low
    //     "0.01577100",       // [4] Close
    //     "148976.11427815",  // [5] Volume
    //     1499644799999,      // [6] Close time
    //     ...
    //   ]
    // ]
    return data.map((item: any) => ({
      time: Math.floor(Number(item[0]) / 1000), // convert to seconds
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
    }));
  } catch (error) {
    console.error('Failed to fetch historical candles:', error);
    throw error;
  }
}

/**
 * Fetches the 24h ticker for screener filtering.
 */
export async function fetch24hTicker(): Promise<any[]> {
  const url = `${BASE_URL}/api/v3/ticker/24hr`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance ticker error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch 24h ticker info:', error);
    return [];
  }
}
