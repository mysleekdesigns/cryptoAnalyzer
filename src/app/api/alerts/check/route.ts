import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { priceAlerts } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

async function fetchCurrentPrice(
  symbol: string,
  assetType: string
): Promise<number | null> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    if (assetType === "crypto") {
      const res = await fetch(
        `${baseUrl}/api/crypto/${encodeURIComponent(symbol)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.detail?.market_data?.current_price?.usd ?? null;
    }

    if (assetType === "stock") {
      const res = await fetch(
        `${baseUrl}/api/stocks/${encodeURIComponent(symbol)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.quote?.c ?? null;
    }

    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all active, not-yet-triggered alerts for this user
    const activeAlerts = await db
      .select()
      .from(priceAlerts)
      .where(
        and(
          eq(priceAlerts.userId, session.user.id),
          eq(priceAlerts.isActive, true),
          isNull(priceAlerts.triggeredAt)
        )
      );

    if (activeAlerts.length === 0) {
      return NextResponse.json({ triggered: [] });
    }

    // Group alerts by symbol+assetType to minimize API calls
    const groupedAlerts = new Map<
      string,
      typeof activeAlerts
    >();
    for (const alert of activeAlerts) {
      const key = `${alert.assetType}:${alert.symbol}`;
      if (!groupedAlerts.has(key)) {
        groupedAlerts.set(key, []);
      }
      groupedAlerts.get(key)!.push(alert);
    }

    const triggered: typeof activeAlerts = [];

    for (const [key, alerts] of groupedAlerts) {
      const [assetType, symbol] = key.split(":");
      const currentPrice = await fetchCurrentPrice(symbol, assetType);

      if (currentPrice === null) continue;

      for (const alert of alerts) {
        const target = parseFloat(alert.targetPrice);
        const isTriggered =
          (alert.condition === "above" && currentPrice >= target) ||
          (alert.condition === "below" && currentPrice <= target);

        if (isTriggered) {
          const [updated] = await db
            .update(priceAlerts)
            .set({
              triggeredAt: new Date(),
              isActive: false,
            })
            .where(eq(priceAlerts.id, alert.id))
            .returning();

          if (updated) {
            triggered.push(updated);
          }
        }
      }
    }

    return NextResponse.json({ triggered });
  } catch {
    return NextResponse.json(
      { error: "Failed to check alerts" },
      { status: 500 }
    );
  }
}
