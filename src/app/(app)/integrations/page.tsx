import { Plug, Key } from "lucide-react";
import { requireBusinessContext } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateApiKeyDialog } from "@/components/integrations/create-api-key-dialog";
import { RevokeApiKeyButton } from "@/components/integrations/revoke-api-key-button";

export default async function IntegrationsPage() {
  const context = await requireBusinessContext();
  const canManage = context.permissions.has(PERMISSIONS.CHANGE_SETTINGS);

  const apiKeys = await prisma.apiKey.findMany({
    where: { businessId: context.business.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-black">Integrations</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Connect Stockora to e-commerce platforms and other systems via the API.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API keys</CardTitle>
              <CardDescription>
                Scoped to {context.business.name}. Each key is shown once at creation — only a
                hash is stored.
              </CardDescription>
            </div>
            {canManage && <CreateApiKeyDialog />}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <Key className="size-8 text-brand-muted" />
              <p className="text-sm text-brand-muted">No API keys yet.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Key</th>
                  <th className="px-6 py-3 font-medium">Last used</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr key={key.id} className="border-b border-brand-border last:border-0">
                    <td className="px-6 py-3 font-medium text-brand-black">{key.name}</td>
                    <td className="px-6 py-3 font-mono text-xs text-brand-muted">{key.keyPrefix}…</td>
                    <td className="px-6 py-3 text-brand-muted">
                      {key.lastUsedAt ? key.lastUsedAt.toLocaleString() : "Never"}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={key.revokedAt ? "danger" : "success"}>
                        {key.revokedAt ? "Revoked" : "Active"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {canManage && !key.revokedAt && <RevokeApiKeyButton id={key.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="size-4 text-brand-accent" />
            <CardTitle>API reference</CardTitle>
          </div>
          <CardDescription>The public REST API, versioned at /api/v1.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-brand-border bg-brand-bg p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
              GET /api/v1/products
            </p>
            <p className="mt-1 text-sm text-brand-muted">
              Returns active products and variants with price and stock-on-hand, scoped to the
              business that owns the key. Optional <code>?limit=</code> (max 200).
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-brand-black p-3 text-xs text-white">
{`curl "${process.env.NEXT_PUBLIC_APP_URL ?? "https://your-store.stockora.com"}/api/v1/products" \\
  -H "Authorization: Bearer sk_live_..."`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
