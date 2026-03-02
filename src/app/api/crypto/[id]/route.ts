import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCoinDetail, getMarketChart } from '@/lib/api/coingecko';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const vsCurrency = searchParams.get('vs_currency') ?? 'usd';
    const days = searchParams.get('days') ?? '7';
    const parsedDays = days === 'max' ? 'max' as const : parseInt(days, 10);

    const [detailResponse, chartResponse] = await Promise.all([
      getCoinDetail(id),
      getMarketChart(id, vsCurrency, parsedDays),
    ]);

    return NextResponse.json({
      detail: detailResponse.data,
      chart: chartResponse.data,
      isStale: detailResponse.isStale || chartResponse.isStale,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch coin detail';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
