import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { IndicatorWeights } from "@/types/signals";

function isValidWeights(w: unknown): w is IndicatorWeights {
  if (!w || typeof w !== "object") return false;
  const obj = w as Record<string, unknown>;
  const keys: (keyof IndicatorWeights)[] = [
    "rsi",
    "macd",
    "bollinger_bands",
    "moving_averages",
    "volume",
  ];
  for (const key of keys) {
    if (typeof obj[key] !== "number" || obj[key] < 0 || obj[key] > 1) {
      return false;
    }
  }
  const sum = keys.reduce((s, k) => s + (obj[k] as number), 0);
  if (Math.abs(sum - 1.0) > 0.01) return false;
  return true;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1);

    return NextResponse.json({ preferences: prefs ?? null });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
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
    const body = await request.json();
    const { indicatorWeights } = body;

    if (indicatorWeights !== undefined && !isValidWeights(indicatorWeights)) {
      return NextResponse.json(
        { error: "Invalid indicator weights: each must be 0-1 and sum to 1.0" },
        { status: 400 }
      );
    }

    // Upsert: insert if not exists, update if exists
    const [existing] = await db
      .select({ id: userPreferences.id })
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1);

    let prefs;
    if (existing) {
      [prefs] = await db
        .update(userPreferences)
        .set({
          ...(indicatorWeights !== undefined && { indicatorWeights }),
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, session.user.id))
        .returning();
    } else {
      [prefs] = await db
        .insert(userPreferences)
        .values({
          userId: session.user.id,
          ...(indicatorWeights !== undefined && { indicatorWeights }),
        })
        .returning();
    }

    return NextResponse.json({ preferences: prefs });
  } catch {
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
