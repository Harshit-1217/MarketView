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
    case '30m': return '30m';
    case '1h': return '1h';
    case '1D': return '1d';
    case '1W': return '1wk';
    case '1M': return '1mo';
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

    // Calculate period1 based on requested limit to avoid Yahoo Finance auto-downsampling
    let period1Date = new Date();
    const now = new Date();
    
    // Safety buffer multiplier (weekends/holidays)
    const daysNeeded = Math.ceil(
      (yahooInterval === '1m' ? limit / 390 :
       yahooInterval === '5m' ? limit / 78 :
       yahooInterval === '15m' ? limit / 26 :
       yahooInterval === '30m' ? limit / 13 :
       yahooInterval === '60m' || yahooInterval === '1h' ? limit / 7 :
       yahooInterval === '1d' ? limit :
       yahooInterval === '1wk' ? limit * 7 :
       yahooInterval === '1mo' ? limit * 30 :
       limit) * 1.6
    );

    // Enforce Yahoo API maximums to avoid throwing errors
    if (yahooInterval === '1m' || yahooInterval === '5m') {
      period1Date.setDate(now.getDate() - Math.min(daysNeeded, 7));
    } else if (yahooInterval === '15m' || yahooInterval === '30m' || yahooInterval === '60m' || yahooInterval === '1h') {
      period1Date.setDate(now.getDate() - Math.min(daysNeeded, 59));
    } else {
      period1Date.setDate(now.getDate() - daysNeeded);
    }

    // Call Yahoo Finance
    const result = await yahooFinance.chart(symbol, {
      period1: period1Date, // Pass Date object or valid string
      interval: yahooInterval,
      return: 'array' // Return flat array of objects
    });

    // Extract the quotes array from the chart result
    const quotes = result.quotes || [];

    const isDaily = yahooInterval === '1d' || yahooInterval === '1wk' || yahooInterval === '1mo' || yahooInterval === '3mo';

    // Map to the Candle format expected by our frontend
    // Candle: { time: number | string, open: number, high: number, low: number, close: number, volume: number }
    const formattedData = quotes
      .filter((q: any) => q.open !== null && q.high !== null && q.low !== null && q.close !== null)
      .map((q: any) => {
        const d = new Date(q.date);
        let timeValue: string | number;

        if (isDaily) {
          // Format as YYYY-MM-DD for lightweight-charts Daily/Weekly/Monthly to avoid timezone shift issues
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          timeValue = `${year}-${month}-${day}`;
        } else {
          // Intraday: Unix timestamp in seconds
          timeValue = Math.floor(d.getTime() / 1000);
        }

        return {
          time: timeValue,
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          volume: q.volume || 0
        };
      });

    // Slice to the requested limit
    const limitedData = formattedData.slice(-limit);

    return NextResponse.json(limitedData);
  } catch (error: any) {
    console.error('Yahoo Finance Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch data', stack: error.stack }, { status: 500 });
  }
}
