import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { watchlistItems } from "@/lib/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await db
      .select()
      .from(watchlistItems)
      .where(eq(watchlistItems.userId, session.user.id))
      .orderBy(watchlistItems.addedAt);

    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch watchlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { symbol, assetType } = body;

    if (!symbol || !assetType) {
      return NextResponse.json(
        { error: "symbol and assetType are required" },
        { status: 400 }
      );
    }

    if (assetType !== "crypto" && assetType !== "stock") {
      return NextResponse.json(
        { error: "assetType must be 'crypto' or 'stock'" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await db
      .select()
      .from(watchlistItems)
      .where(
        and(
          eq(watchlistItems.userId, session.user.id),
          eq(watchlistItems.symbol, symbol.toLowerCase())
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Asset already in watchlist" },
        { status: 409 }
      );
    }

    const [item] = await db
      .insert(watchlistItems)
      .values({
        userId: session.user.id,
        symbol: symbol.toLowerCase(),
        assetType,
      })
      .returning();

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add to watchlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(watchlistItems)
      .where(
        and(
          eq(watchlistItems.id, id),
          eq(watchlistItems.userId, session.user.id)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Watchlist item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to remove from watchlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
