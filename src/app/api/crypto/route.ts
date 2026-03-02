import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMarkets, getTrending } from '@/lib/api/coingecko';

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const perPage = Math.min(parseInt(searchParams.get('per_page') ?? '50', 10), 250);
    const vsCurrency = searchParams.get('vs_currency') ?? 'usd';
    const includeTrending = searchParams.get('trending') === 'true';

    const [marketsResponse, trendingResponse] = await Promise.all([
      getMarkets(vsCurrency, page, perPage),
      includeTrending ? getTrending() : null,
    ]);

    return NextResponse.json({
      markets: marketsResponse.data,
      trending: trendingResponse?.data ?? null,
      isStale: marketsResponse.isStale,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch crypto markets';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
