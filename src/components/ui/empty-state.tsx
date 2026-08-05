import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Shown when a list has nothing in it.
 *
 * A blank panel reads as a broken page. An empty state names what is missing,
 * says why, and offers the action that fills it — so "nothing here" becomes a
 * next step rather than a dead end.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-brand-purple-lightest text-brand-accent">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <p className="font-display text-sm font-semibold text-brand-black">{title}</p>
        <p className="max-w-sm text-sm text-brand-muted">{description}</p>
        {action && <div className="mt-2">{action}</div>}
      </CardContent>
    </Card>
  );
}
