import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AppNotFound() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-accent">
          <SearchX className="size-6" aria-hidden="true" />
        </div>
        <h1 className="font-display text-lg font-semibold text-brand-black">Not found</h1>
        <p className="max-w-md text-sm text-brand-muted">
          This page doesn&apos;t exist, or you don&apos;t have permission to see it.
        </p>
        <Button asChild className="mt-2">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
