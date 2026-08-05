"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export function PerformanceTabs({
  leaderboard,
  targets,
  rules,
  payouts,
}: {
  leaderboard: React.ReactNode;
  targets: React.ReactNode;
  rules: React.ReactNode;
  payouts: React.ReactNode;
}) {
  return (
    <Tabs.Root defaultValue="leaderboard">
      <Tabs.List className="inline-flex flex-wrap gap-1 rounded-full border border-brand-border bg-white p-1">
        <TabTrigger value="leaderboard">Leaderboard</TabTrigger>
        <TabTrigger value="targets">Targets</TabTrigger>
        <TabTrigger value="rules">Commission rules</TabTrigger>
        <TabTrigger value="payouts">Payouts</TabTrigger>
      </Tabs.List>
      <Tabs.Content value="leaderboard" className="mt-6">
        {leaderboard}
      </Tabs.Content>
      <Tabs.Content value="targets" className="mt-6">
        {targets}
      </Tabs.Content>
      <Tabs.Content value="rules" className="mt-6">
        {rules}
      </Tabs.Content>
      <Tabs.Content value="payouts" className="mt-6">
        {payouts}
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
