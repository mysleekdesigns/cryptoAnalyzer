import { db } from '@/lib/db';
import { signalHistory } from '@/lib/db/schema';
import type { CompositeSignal } from '@/types/signals';

/**
 * Persist a generated composite signal to the signalHistory table.
 * This is optional — signal generation itself does not require auth,
 * but persistence does require a userId.
 */
export async function persistSignal(
  userId: string,
  signal: CompositeSignal,
): Promise<string> {
  const [row] = await db
    .insert(signalHistory)
    .values({
      userId,
      symbol: signal.symbol,
      assetType: signal.assetType,
      signalType: signal.signalType,
      compositeScore: Math.round(signal.compositeScore),
      indicators: signal.indicators,
      sentiment: signal.sentiment,
    })
    .returning({ id: signalHistory.id });

  return row.id;
}
