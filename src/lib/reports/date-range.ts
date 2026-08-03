export type DateRangePreset = "today" | "yesterday" | "week" | "month" | "custom";

export interface ResolvedRange {
  preset: DateRangePreset;
  from: Date;
  to: Date;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function resolveDateRange(params: {
  preset?: string;
  from?: string;
  to?: string;
}): ResolvedRange {
  const now = new Date();

  if (params.preset === "custom" && params.from && params.to) {
    return { preset: "custom", from: startOfDay(new Date(params.from)), to: endOfDay(new Date(params.to)) };
  }

  if (params.preset === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { preset: "yesterday", from: startOfDay(yesterday), to: endOfDay(yesterday) };
  }

  if (params.preset === "week") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { preset: "week", from: startOfDay(from), to: endOfDay(now) };
  }

  if (params.preset === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { preset: "month", from: startOfDay(from), to: endOfDay(now) };
  }

  return { preset: "today", from: startOfDay(now), to: endOfDay(now) };
}
