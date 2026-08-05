"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export function SettingsTabs({
  general,
  roles,
  catalog,
  tax,
  billing,
}: {
  general: React.ReactNode;
  roles: React.ReactNode;
  catalog: React.ReactNode;
  tax: React.ReactNode;
  billing: React.ReactNode;
}) {
  return (
    <Tabs.Root defaultValue="general">
      <Tabs.List className="inline-flex flex-wrap gap-1 rounded-full border border-brand-border bg-white p-1">
        <TabTrigger value="general">General</TabTrigger>
        <TabTrigger value="roles">Roles &amp; Permissions</TabTrigger>
        <TabTrigger value="catalog">Catalog</TabTrigger>
        <TabTrigger value="tax">Tax</TabTrigger>
        <TabTrigger value="billing">Billing</TabTrigger>
      </Tabs.List>
      <Tabs.Content value="general" className="mt-6">
        {general}
      </Tabs.Content>
      <Tabs.Content value="roles" className="mt-6">
        {roles}
      </Tabs.Content>
      <Tabs.Content value="catalog" className="mt-6">
        {catalog}
      </Tabs.Content>
      <Tabs.Content value="tax" className="mt-6">
        {tax}
      </Tabs.Content>
      <Tabs.Content value="billing" className="mt-6">
        {billing}
      </Tabs.Content>
    </Tabs.Root>
  );
}

function TabTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-medium text-brand-muted transition-colors",
        "data-[state=active]:bg-brand-purple data-[state=active]:text-white",
      )}
    >
      {children}
    </Tabs.Trigger>
  );
}
