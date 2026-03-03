import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/lib/auth';
import { cache } from '@/lib/utils/cache';

const CACHE_TTL_SECONDS = 1800; // 30 minutes
const MAX_REQUESTS_PER_HOUR = 10;

// Simple in-memory rate limiter per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 3600_000 });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_HOUR) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { symbol, assetType } = body as { symbol?: string; assetType?: string };

  if (!symbol || !assetType || (assetType !== 'crypto' && assetType !== 'stock')) {
    return NextResponse.json(
      { error: 'Invalid request. Provide symbol and assetType ("crypto" or "stock").' },
      { status: 400 },
    );
  }

  // Check cache first
  const cacheKey = `ai-summary:${assetType}:${symbol}`;
  const cached = cache.get<{ summary: string; generatedAt: number }>(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, fromCache: true });
  }

  // Rate limit
  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Maximum 10 AI summaries per hour.' },
      { status: 429 },
    );
  }

  try {
    // Fetch signal data for context
    const signalUrl = new URL(
      `/api/signals/${assetType}/${symbol}`,
      request.url,
    );
    const signalRes = await fetch(signalUrl.toString(), {
      headers: { cookie: request.headers.get('cookie') ?? '' },
    });

    let signalContext = 'Signal data unavailable.';
    if (signalRes.ok) {
      const { signal } = await signalRes.json();
      const indicators = signal.indicators
        .map(
          (ind: { type: string; score: number; signal: string; details: string }) =>
            `- ${ind.type}: score ${ind.score}/100 (${ind.signal}) - ${ind.details}`,
        )
        .join('\n');

      signalContext = `Composite Score: ${signal.compositeScore.toFixed(1)}/100 (${signal.signalType.replace('_', ' ').toUpperCase()})
Raw Score (before sentiment): ${signal.rawScore.toFixed(1)}
Sentiment: ${signal.sentiment.classification} (Fear & Greed: ${signal.sentiment.fearGreedValue}, modifier: ${signal.sentiment.modifier > 0 ? '+' : ''}${signal.sentiment.modifier})
Cross Confirmation: ${signal.crossConfirmation.isConfirmed ? `Confirmed ${signal.crossConfirmation.direction} (${signal.crossConfirmation.confidence})` : 'Not confirmed'}

Indicator Breakdown:
${indicators}`;
    }

    // Fetch sentiment separately if signal failed
    let sentimentContext = '';
    if (!signalRes.ok) {
      const sentimentUrl = new URL('/api/sentiment', request.url);
      const sentimentRes = await fetch(sentimentUrl.toString());
      if (sentimentRes.ok) {
        const data = await sentimentRes.json();
        sentimentContext = `\nMarket Sentiment: Fear & Greed Index at ${data.data?.value ?? 'N/A'} (${data.data?.classification ?? 'unknown'})`;
      }
    }

    const client = new Anthropic();

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a technical market analyst. Provide a concise 2-3 paragraph analysis for ${symbol.toUpperCase()} (${assetType}).

Current Analysis Data:
${signalContext}${sentimentContext}

Cover these points:
1. Technical setup - what the indicators are collectively showing and the overall signal direction
2. Key levels to watch - support/resistance implied by the Bollinger Bands and moving averages
3. Risk factors - what could invalidate the current signal, and any divergences or concerns

Keep the tone professional and objective. Do not use markdown headers. Do not recommend specific trades or positions.`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    const summary = textBlock?.text ?? 'Unable to generate analysis.';
    const generatedAt = Date.now();

    const disclaimer =
      'This AI-generated analysis is for informational purposes only and does not constitute financial advice. Always conduct your own research before making investment decisions.';

    const result = { summary, generatedAt, disclaimer };

    // Cache the result
    cache.set(cacheKey, { summary, generatedAt }, CACHE_TTL_SECONDS);

    return NextResponse.json({ ...result, fromCache: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate AI analysis';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
