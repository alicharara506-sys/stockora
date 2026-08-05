"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Catches render and data errors inside the app shell so one broken page
 * shows a recoverable message instead of a blank screen.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced server-side too, but logging here keeps the digest alongside
    // whatever the browser recorded just before the failure.
    console.error("App route error:", error);
  }, [error]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-brand-danger/10 text-brand-danger">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <h1 className="font-display text-lg font-semibold text-brand-black">
          Something went wrong
        </h1>
        <p className="max-w-md text-sm text-brand-muted">
          This page couldn&apos;t load. Your data is safe — nothing was changed.
        </p>
        {error.digest && (
          <p className="text-xs text-brand-muted">
            Reference: <code className="font-mono">{error.digest}</code>
          </p>
        )}
        <Button onClick={reset} className="mt-2">
          <RotateCcw className="size-4" />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
