export interface Candle {
  time: number; // in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const TIMEFRAME_MAP: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1D': '1d',
  '1W': '1w',
  '1M': '1M',
};

/**
 * Fetches historical candle data from our Yahoo Finance API proxy.
 * @param symbol Trading symbol (e.g., RELIANCE.NS)
 * @param timeframe Timeframe string (e.g., '1h', '1D')
 * @param limit Number of bars (max 1000)
 */
export async function fetchHistoricalCandles(
  symbol: string,
  timeframe: string,
  limit = 500
): Promise<Candle[]> {
  // Ensure we append .NS if user submits a raw symbol (unless it already has an extension)
  const querySymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
  const url = `/api/market/history?symbol=${querySymbol}&interval=${timeframe}&limit=${limit}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Market API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch historical candles:', error);
    throw error;
  }
}
