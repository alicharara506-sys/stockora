import { Search, Bell, ArrowUp } from "lucide-react";

const SALES_POINTS = [12, 18, 14, 22, 19, 27, 24, 31, 28, 35];

function sparklinePath(points: number[], width: number, height: number) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const step = width / (points.length - 1);
  return points
    .map((point, i) => {
      const x = i * step;
      const y = height - ((point - min) / (max - min || 1)) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function DashboardMockup() {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-brand-border bg-white shadow-card-lg">
      <div className="flex items-center justify-between border-b border-brand-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-brand-danger/70" />
          <span className="size-2.5 rounded-full bg-brand-warning/70" />
          <span className="size-2.5 rounded-full bg-brand-success/70" />
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-brand-bg px-2.5 py-1 text-xs text-brand-muted">
          <Search className="size-3.5" />
          Search products
        </div>
        <Bell className="size-4 text-brand-muted" />
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Total Sales", value: "$28,560", delta: "+12.5%" },
            { label: "Today", value: "$1,890", delta: "+8.5%" },
            { label: "Orders", value: "320", delta: "+9.1%" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-brand-border p-2.5">
              <p className="text-[10px] font-medium text-brand-muted">{stat.label}</p>
              <p className="mt-1 font-display text-sm font-bold text-brand-black">{stat.value}</p>
              <p className="mt-0.5 flex items-center gap-0.5 text-[10px] font-medium text-brand-success">
                <ArrowUp className="size-2.5" />
                {stat.delta}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-brand-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-brand-black">Sales overview</p>
            <span className="text-[10px] text-brand-muted">This week</span>
          </div>
          <svg viewBox="0 0 280 60" className="h-14 w-full" preserveAspectRatio="none">
            <path
              d={sparklinePath(SALES_POINTS, 280, 50)}
              fill="none"
              stroke="#7C3AED"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="rounded-xl border border-brand-border p-3">
          <p className="mb-2 text-xs font-semibold text-brand-black">Top selling items</p>
          <div className="space-y-1.5">
            {[
              { name: "Kids T-Shirt", value: "$2,400" },
              { name: "Denim Jeans", value: "$2,165" },
            ].map((row) => (
              <div key={row.name} className="flex items-center justify-between text-xs">
                <span className="text-brand-muted">{row.name}</span>
                <span className="font-semibold text-brand-black">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileMockup() {
  return (
    <div className="w-40 overflow-hidden rounded-[2rem] border-4 border-brand-black bg-white shadow-card-lg">
      <div className="flex items-center justify-center border-b border-brand-border py-2">
        <span className="h-1.5 w-10 rounded-full bg-brand-border" />
      </div>
      <div className="space-y-2 p-2.5">
        <p className="text-[10px] font-bold text-brand-black">
          STOCK<span className="text-brand-purple-bright">ORA</span>
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { name: "T-Shirt", price: "$12" },
            { name: "Jacket", price: "$68" },
            { name: "Sneakers", price: "$42" },
            { name: "Dress", price: "$38" },
          ].map((product) => (
            <div key={product.name} className="rounded-lg border border-brand-border p-1.5">
              <div className="mb-1 h-8 rounded-md bg-brand-purple-lightest" />
              <p className="text-[8px] font-medium text-brand-black">{product.name}</p>
              <p className="text-[8px] font-semibold text-brand-purple">{product.price}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReceiptMockup() {
  return (
    <div className="w-28 rounded-xl border border-brand-border bg-white p-3 shadow-card-lg">
      <p className="text-center text-[9px] font-bold text-brand-black">STOCKORA</p>
      <div className="mt-2 space-y-1 border-t border-dashed border-brand-border pt-2">
        {["Kids T-Shirt", "Sneakers", "Jacket"].map((item) => (
          <div key={item} className="flex justify-between text-[7px] text-brand-muted">
            <span>{item}</span>
            <span>$--</span>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-dashed border-brand-border pt-2 text-[8px] font-bold text-brand-black">
        Total $189.00
      </div>
    </div>
  );
}

export function HeroVisual() {
  return (
    <div className="relative mx-auto flex w-full max-w-lg items-center justify-center py-6 lg:mx-0 lg:justify-start">
      <div className="hidden shrink-0 -translate-y-4 sm:block">
        <MobileMockup />
      </div>
      <div className="z-10 -ml-6 sm:-ml-10">
        <DashboardMockup />
      </div>
      <div className="hidden -ml-6 translate-y-10 lg:block">
        <ReceiptMockup />
      </div>
    </div>
  );
}
