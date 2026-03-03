import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { portfolioHoldings } from '@/lib/db/schema';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const holdings = await db
      .select()
      .from(portfolioHoldings)
      .where(eq(portfolioHoldings.userId, session.user.id))
      .orderBy(portfolioHoldings.createdAt);

    return NextResponse.json({ holdings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch holdings';
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
    const { symbol, assetType, quantity, avgBuyPrice, notes } = body;

    if (!symbol || !assetType || quantity == null || avgBuyPrice == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (quantity <= 0 || avgBuyPrice < 0) {
      return NextResponse.json({ error: 'Invalid quantity or price' }, { status: 400 });
    }

    const [holding] = await db
      .insert(portfolioHoldings)
      .values({
        userId: session.user.id,
        symbol: symbol.toUpperCase(),
        assetType,
        quantity: String(quantity),
        avgBuyPrice: String(avgBuyPrice),
        notes: notes || null,
      })
      .returning();

    return NextResponse.json({ holding }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create holding';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
