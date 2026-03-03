'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface AISummaryCardProps {
  symbol: string;
  assetType: 'crypto' | 'stock';
}

interface SummaryData {
  summary: string;
  generatedAt: number;
  disclaimer: string;
  fromCache: boolean;
}

export function AISummaryCard({ symbol, assetType }: AISummaryCardProps) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/analysis/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, assetType }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Failed to generate analysis');
        return;
      }

      setData(json);
    } catch {
      setError('Failed to connect to analysis service');
    } finally {
      setLoading(false);
    }
  }, [symbol, assetType]);

  // Try to load cached summary on mount
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a4 4 0 0 0-4 4c0 2 1.3 3.7 2 5h4c.7-1.3 2-3 2-5a4 4 0 0 0-4-4Z" />
            <path d="M10 11v3a2 2 0 0 0 4 0v-3" />
            <path d="M8 15h8" />
            <path d="M9 18h6" />
            <path d="M10 21h4" />
          </svg>
          AI Analysis
        </CardTitle>
        {data && !loading && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={fetchSummary}
          >
            Regenerate
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <AISummarySkeleton />}

        {error && !loading && (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchSummary}>
              Generate Analysis
            </Button>
          </div>
        )}

        {data && !loading && (
          <>
            <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
              {data.summary.split('\n\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            <p className="text-xs italic text-muted-foreground">
              {data.disclaimer}
            </p>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Generated {new Date(data.generatedAt).toLocaleString()}
              </span>
              {data.fromCache && (
                <span className="rounded bg-muted px-1.5 py-0.5">cached</span>
              )}
            </div>
          </>
        )}

        {!data && !loading && !error && (
          <Button variant="outline" size="sm" onClick={fetchSummary}>
            Generate Analysis
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function AISummarySkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
