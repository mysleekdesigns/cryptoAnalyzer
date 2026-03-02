import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFearGreedIndex, getFearGreedHistory } from '@/lib/api/sentiment';

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days');

    if (days) {
      const parsedDays = Math.min(Math.max(parseInt(days, 10), 1), 365);
      const response = await getFearGreedHistory(parsedDays);
      return NextResponse.json({
        history: response.data,
        isStale: response.isStale,
      });
    }

    const response = await getFearGreedIndex();
    return NextResponse.json({
      current: response.data,
      isStale: response.isStale,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sentiment data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
