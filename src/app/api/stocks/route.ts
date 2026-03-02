import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQuote } from '@/lib/api/finnhub';
import type { FinnhubQuote } from '@/types/market';

// Default market overview symbols
const OVERVIEW_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'JPM', 'V', 'SPY'];

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');
    const symbols = symbolsParam
      ? symbolsParam.split(',').map(s => s.trim().toUpperCase()).slice(0, 20)
      : OVERVIEW_SYMBOLS;

    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const response = await getQuote(symbol);
        return {
          symbol,
          quote: response.data,
          isStale: response.isStale,
        };
      }),
    );

    const quotes = results
      .filter((r): r is PromiseFulfilledResult<{ symbol: string; quote: FinnhubQuote; isStale: boolean }> => r.status === 'fulfilled')
      .map(r => r.value);

    const failed = results
      .map((r, i) => ({ result: r, symbol: symbols[i] }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ symbol }) => symbol);

    return NextResponse.json({
      quotes,
      failed,
      isStale: quotes.some(q => q.isStale),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stock overview';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
