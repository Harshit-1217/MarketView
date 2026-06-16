import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  try {
    const results = await yahooFinance.search(query);
    
    // Filter to prioritize Indian equities if possible, but search returns globally.
    // We can filter by exchange if needed, or just return what we got.
    const equities = results.quotes
      .filter((q: any) => q.quoteType === 'EQUITY' && (q.exchange === 'NSI' || q.exchange === 'BSE' || q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO')))
      .slice(0, 10);

    return NextResponse.json(equities);
  } catch (error: any) {
    console.error('Yahoo Finance Search Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
