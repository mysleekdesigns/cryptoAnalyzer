"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AssetDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div>
            <h2 className="text-lg font-semibold">Failed to load asset</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {error.message || "Could not load asset details. Please try again."}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
            <Button onClick={reset}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
