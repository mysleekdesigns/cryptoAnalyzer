import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { priceAlerts } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // 'active' | 'triggered' | null (all)

    let conditions = [eq(priceAlerts.userId, session.user.id)];

    if (status === "active") {
      conditions.push(eq(priceAlerts.isActive, true));
    } else if (status === "triggered") {
      conditions.push(eq(priceAlerts.isActive, false));
    }

    const alerts = await db
      .select()
      .from(priceAlerts)
      .where(and(...conditions))
      .orderBy(desc(priceAlerts.createdAt));

    return NextResponse.json({ alerts });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { symbol, assetType, condition, targetPrice } = await request.json();

    if (!symbol || !assetType || !condition || targetPrice == null) {
      return NextResponse.json(
        { error: "symbol, assetType, condition, and targetPrice are required" },
        { status: 400 }
      );
    }

    if (!["crypto", "stock"].includes(assetType)) {
      return NextResponse.json(
        { error: "assetType must be 'crypto' or 'stock'" },
        { status: 400 }
      );
    }

    if (!["above", "below"].includes(condition)) {
      return NextResponse.json(
        { error: "condition must be 'above' or 'below'" },
        { status: 400 }
      );
    }

    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { error: "targetPrice must be a positive number" },
        { status: 400 }
      );
    }

    const [alert] = await db
      .insert(priceAlerts)
      .values({
        userId: session.user.id,
        symbol,
        assetType,
        condition,
        targetPrice: String(price),
      })
      .returning();

    return NextResponse.json({ alert }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, isActive } = await request.json();

    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "id and isActive (boolean) are required" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(priceAlerts)
      .set({ isActive })
      .where(
        and(eq(priceAlerts.id, id), eq(priceAlerts.userId, session.user.id))
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json({ alert: updated });
  } catch {
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
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

    const [deleted] = await db
      .delete(priceAlerts)
      .where(
        and(eq(priceAlerts.id, id), eq(priceAlerts.userId, session.user.id))
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}
