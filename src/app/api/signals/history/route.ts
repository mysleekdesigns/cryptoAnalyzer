import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { signalHistory } from '@/lib/db/schema';
import { eq, and, desc, gte, lte, count, type SQL } from 'drizzle-orm';
import type { SignalType } from '@/types/signals';
import type { AssetType } from '@/types/market';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const assetType = searchParams.get('assetType') as AssetType | null;
    const signalType = searchParams.get('signalType') as SignalType | null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1), 100);
    const offset = (page - 1) * limit;

    // Build filter conditions
    const conditions: SQL[] = [eq(signalHistory.userId, session.user.id)];

    if (symbol) {
      conditions.push(eq(signalHistory.symbol, symbol));
    }
    if (assetType && (assetType === 'crypto' || assetType === 'stock')) {
      conditions.push(eq(signalHistory.assetType, assetType));
    }
    if (signalType) {
      conditions.push(eq(signalHistory.signalType, signalType));
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!isNaN(from.getTime())) {
        conditions.push(gte(signalHistory.createdAt, from));
      }
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (!isNaN(to.getTime())) {
        conditions.push(lte(signalHistory.createdAt, to));
      }
    }

    const where = and(...conditions);

    // Fetch paginated results and total count in parallel
    const [rows, [totalResult]] = await Promise.all([
      db
        .select()
        .from(signalHistory)
        .where(where)
        .orderBy(desc(signalHistory.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(signalHistory)
        .where(where),
    ]);

    return NextResponse.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: totalResult.count,
        totalPages: Math.ceil(totalResult.count / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch signal history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
