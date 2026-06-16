import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

/**
 * Maps Binance-style timeframes to Yahoo Finance valid intervals.
 */
function getYahooInterval(timeframe: string): "1m" | "2m" | "5m" | "15m" | "30m" | "60m" | "90m" | "1h" | "1d" | "5d" | "1wk" | "1mo" | "3mo" {
  switch (timeframe) {
    case '1m': return '1m';
    case '5m': return '5m';
    case '15m': return '15m';
    case '1h': return '1h';
    case '4h': return '1h'; // Yahoo doesn't support 4h directly, fallback to 1h
    case '1D': return '1d';
    case '1W': return '1wk';
    default: return '1d';
  }
}

/**
 * Maps timeframe to Yahoo range parameter to optimize data fetching
 */
function getYahooRange(timeframe: string, limit: number): string {
  if (timeframe === '1m' || timeframe === '5m') return '7d'; // max allowed for small intervals
  if (timeframe === '15m') return '60d';
  if (timeframe === '1h' || timeframe === '4h') return '730d';
  if (timeframe === '1D') return '10y';
  return 'max';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const intervalParam = searchParams.get('interval') || '1d'; // Usually 1m, 1h, 1D etc.
  const limit = parseInt(searchParams.get('limit') || '500');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const yahooInterval = getYahooInterval(intervalParam);

    // Calculate period1 based on interval limits
    let period1Date = new Date('1970-01-01');
    const now = new Date();
    
    if (yahooInterval === '1m' || yahooInterval === '5m') {
      period1Date = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Max 7 days
    } else if (yahooInterval === '15m' || yahooInterval === '60m' || yahooInterval === '1h') {
      period1Date = new Date(now.getTime() - 59 * 24 * 60 * 60 * 1000); // Max 60 days
    }

    // Call Yahoo Finance
    const result = await yahooFinance.chart(symbol, {
      period1: period1Date, // Pass Date object or valid string
      interval: yahooInterval,
      return: 'array' // Return flat array of objects
    });

    // Extract the quotes array from the chart result
    const quotes = result.quotes || [];

    // Map to the Candle format expected by our frontend
    // Candle: { time: number, open: number, high: number, low: number, close: number, volume: number }
    const formattedData = quotes
      .filter((q: any) => q.open !== null && q.high !== null && q.low !== null && q.close !== null)
      .map((q: any) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume || 0
      }));

    // Slice to the requested limit
    const limitedData = formattedData.slice(-limit);

    return NextResponse.json(limitedData);
  } catch (error: any) {
    console.error('Yahoo Finance Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch data', stack: error.stack }, { status: 500 });
  }
}
