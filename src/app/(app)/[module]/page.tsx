import { notFound } from "next/navigation";
import { requireBusinessContext } from "@/lib/tenancy";
import { APP_NAV } from "@/lib/nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const item = APP_NAV.find((nav) => nav.slug === module);
  if (!item) notFound();

  await requireBusinessContext();
  const Icon = item.icon;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-4 p-10">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-purple-lightest text-brand-accent">
            <Icon className="size-6" />
          </div>
          <h1 className="font-display text-xl font-bold text-brand-black">{item.label}</h1>
          <Badge variant="outline">Scheduled for Phase {item.phase}</Badge>
          <p className="text-sm text-brand-muted">
            This module is on the Stockora build roadmap and isn&apos;t implemented yet. It will
            ship as a fully functional, tenant-scoped feature rather than a static mockup.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
