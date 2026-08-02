import { cn } from "@/lib/utils";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("size-9", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="stockora-mark" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#6D28D9" />
        </linearGradient>
      </defs>
      <path
        d="M40 8H17c-3 0-4.5 3.6-2.4 5.7L33 32H8c-3 0-4.5 3.6-2.4 5.7l6.7 6.7a4 4 0 0 0 2.8 1.2H31c3 0 4.5-3.6 2.4-5.7L15 20h25c3 0 4.5-3.6 2.4-5.7l-6.7-6.7A4 4 0 0 0 32.9 6"
        fill="url(#stockora-mark)"
      />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  showSubtitle = false,
  dark = false,
}: {
  className?: string;
  markClassName?: string;
  showSubtitle?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <div className="leading-none">
        <span
          className={cn(
            "font-display text-xl font-extrabold tracking-tight",
            dark ? "text-white" : "text-brand-black",
          )}
        >
          STOCK
          <span className="text-brand-purple-bright">ORA</span>
        </span>
        {showSubtitle && (
          <div
            className={cn(
              "mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
              dark ? "text-white/60" : "text-brand-muted",
            )}
          >
            Smart Retail POS &amp; Inventory
          </div>
        )}
      </div>
    </div>
  );
}
