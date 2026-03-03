import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { portfolioHoldings } from '@/lib/db/schema';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { quantity, avgBuyPrice, notes } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (quantity != null) updateData.quantity = String(quantity);
    if (avgBuyPrice != null) updateData.avgBuyPrice = String(avgBuyPrice);
    if (notes !== undefined) updateData.notes = notes || null;

    const [updated] = await db
      .update(portfolioHoldings)
      .set(updateData)
      .where(
        and(
          eq(portfolioHoldings.id, id),
          eq(portfolioHoldings.userId, session.user.id),
        ),
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    return NextResponse.json({ holding: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update holding';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(portfolioHoldings)
      .where(
        and(
          eq(portfolioHoldings.id, id),
          eq(portfolioHoldings.userId, session.user.id),
        ),
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete holding';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
