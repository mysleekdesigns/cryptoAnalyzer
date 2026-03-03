import { NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { portfolioTransactions, portfolioHoldings } from '@/lib/db/schema';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const holdingId = searchParams.get('holdingId');

    // First get this user's holding IDs to scope the query
    const userHoldings = await db
      .select({ id: portfolioHoldings.id })
      .from(portfolioHoldings)
      .where(eq(portfolioHoldings.userId, session.user.id));

    const holdingIds = userHoldings.map((h) => h.id);
    if (holdingIds.length === 0) {
      return NextResponse.json({ transactions: [] });
    }

    let transactions;

    if (holdingId) {
      // Verify the holding belongs to this user
      if (!holdingIds.includes(holdingId)) {
        return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
      }
      transactions = await db
        .select()
        .from(portfolioTransactions)
        .where(eq(portfolioTransactions.holdingId, holdingId))
        .orderBy(desc(portfolioTransactions.executedAt));
    } else {
      const all = await db
        .select()
        .from(portfolioTransactions)
        .orderBy(desc(portfolioTransactions.executedAt));
      transactions = all.filter((t) => holdingIds.includes(t.holdingId));
    }

    const filtered = transactions;

    return NextResponse.json({ transactions: filtered });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { holdingId, type, quantity, price, fee, executedAt } = body;

    if (!holdingId || !type || quantity == null || price == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['buy', 'sell'].includes(type)) {
      return NextResponse.json({ error: 'Type must be "buy" or "sell"' }, { status: 400 });
    }

    if (quantity <= 0 || price < 0) {
      return NextResponse.json({ error: 'Invalid quantity or price' }, { status: 400 });
    }

    // Verify the holding belongs to this user
    const [holding] = await db
      .select()
      .from(portfolioHoldings)
      .where(
        and(
          eq(portfolioHoldings.id, holdingId),
          eq(portfolioHoldings.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!holding) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    // Record transaction
    const [transaction] = await db
      .insert(portfolioTransactions)
      .values({
        holdingId,
        type,
        quantity: String(quantity),
        price: String(price),
        fee: String(fee ?? 0),
        executedAt: executedAt ? new Date(executedAt) : new Date(),
      })
      .returning();

    // Update holding quantity and avg price
    const currentQty = Number(holding.quantity);
    const currentAvg = Number(holding.avgBuyPrice);

    let newQty: number;
    let newAvg: number;

    if (type === 'buy') {
      newQty = currentQty + quantity;
      // Weighted average: (oldQty * oldAvg + newQty * newPrice) / totalQty
      newAvg = newQty > 0 ? (currentQty * currentAvg + quantity * price) / newQty : price;
    } else {
      newQty = Math.max(0, currentQty - quantity);
      newAvg = currentAvg; // Avg buy price doesn't change on sell
    }

    await db
      .update(portfolioHoldings)
      .set({
        quantity: String(newQty),
        avgBuyPrice: String(newAvg),
        updatedAt: new Date(),
      })
      .where(eq(portfolioHoldings.id, holdingId));

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record transaction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
