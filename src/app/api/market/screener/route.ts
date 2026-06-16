import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// Top 50 Nifty Stocks (Hardcoded for screener since Yahoo Finance doesn't have a broad NSE screener endpoint)
const INDIAN_TOP_STOCKS = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'BHARTIARTL.NS',
  'SBIN.NS', 'INFY.NS', 'LICI.NS', 'ITC.NS', 'HINDUNILVR.NS',
  'LT.NS', 'BAJFINANCE.NS', 'HCLTECH.NS', 'MARUTI.NS', 'SUNPHARMA.NS',
  'ADANIENT.NS', 'KOTAKBANK.NS', 'TITAN.NS', 'ONGC.NS', 'TATAMOTORS.NS',
  'NTPC.NS', 'AXISBANK.NS', 'DMART.NS', 'ADANIPORTS.NS', 'ULTRACEMCO.NS',
  'ASIANPAINT.NS', 'COALINDIA.NS', 'BAJAJFINSV.NS', 'BAJAJ-AUTO.NS', 'POWERGRID.NS',
  'NESTLEIND.NS', 'HAL.NS', 'WIPRO.NS', 'M&M.NS', 'IOC.NS',
  'JIOFIN.NS', 'TATASTEEL.NS', 'SBILIFE.NS', 'IRFC.NS', 'ZOMATO.NS',
  'VBL.NS', 'GRASIM.NS', 'HDFCLIFE.NS', 'TECHM.NS', 'TRENT.NS',
  'INDUSINDBK.NS', 'HINDALCO.NS', 'EICHERMOT.NS', 'DIVISLAB.NS', 'DRREDDY.NS'
];

export async function GET() {
  try {
    // Fetch quotes for all top stocks
    // Yahoo Finance can handle ~100 symbols per request easily
    const quotes = await yahooFinance.quote(INDIAN_TOP_STOCKS);

    // Map to TickerData format expected by ScreenerMain
    const tickers = quotes.map((q: any) => {
      return {
        symbol: q.symbol,
        lastPrice: q.regularMarketPrice || 0,
        priceChangePercent: q.regularMarketChangePercent || 0,
        highPrice: q.regularMarketDayHigh || 0,
        lowPrice: q.regularMarketDayLow || 0,
        volume: q.regularMarketVolume || 0,
        quoteVolume: (q.regularMarketVolume || 0) * (q.regularMarketPrice || 0), // estimate
      };
    });

    return NextResponse.json(tickers);
  } catch (error: any) {
    console.error('Yahoo Finance Screener Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
