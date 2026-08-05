import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        purple: "bg-brand-purple-lightest text-brand-accent",
        purpleSolid: "bg-brand-purple text-white",
        dark: "bg-brand-black text-white",
        success: "bg-brand-success/10 text-brand-success",
        warning: "bg-brand-warning/10 text-brand-warning",
        danger: "bg-brand-danger/10 text-brand-danger",
        outline: "border border-brand-border text-brand-muted",
      },
    },
    defaultVariants: {
      variant: "purple",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
