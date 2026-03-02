import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getQuote, getCandles } from '@/lib/api/finnhub';
import { getDailyTimeSeries, getCompanyOverview } from '@/lib/api/alpha-vantage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { symbol } = await params;
    const upperSymbol = symbol.toUpperCase();
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') ?? '30', 10);

    const now = Math.floor(Date.now() / 1000);
    const from = now - days * 86400;

    const [quoteResponse, candleResponse, overviewResponse, dailyResponse] = await Promise.allSettled([
      getQuote(upperSymbol),
      getCandles(upperSymbol, 'D', from, now),
      getCompanyOverview(upperSymbol),
      getDailyTimeSeries(upperSymbol, days > 100 ? 'full' : 'compact'),
    ]);

    return NextResponse.json({
      quote: quoteResponse.status === 'fulfilled' ? quoteResponse.value.data : null,
      candles: candleResponse.status === 'fulfilled' ? candleResponse.value.data : null,
      overview: overviewResponse.status === 'fulfilled' ? overviewResponse.value.data : null,
      dailySeries: dailyResponse.status === 'fulfilled' ? dailyResponse.value.data : null,
      isStale: [quoteResponse, candleResponse, overviewResponse, dailyResponse]
        .some(r => r.status === 'fulfilled' && r.value.isStale),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stock detail';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
