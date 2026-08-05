import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMessages } from "@/lib/i18n/server";

export default async function AppNotFound() {
  const { messages } = await getMessages();

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-accent">
          <SearchX className="size-6" aria-hidden="true" />
        </div>
        <h1 className="font-display text-lg font-semibold text-brand-black">
          {messages.errors.notFoundTitle}
        </h1>
        <p className="max-w-md text-sm text-brand-muted">
          {messages.errors.notFoundBody}
        </p>
        <Button asChild className="mt-2">
          <Link href="/dashboard">{messages.errors.backToDashboard}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
