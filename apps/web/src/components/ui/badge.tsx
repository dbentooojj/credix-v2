import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/src/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/15 text-primary-foreground",
        secondary: "border-border/70 bg-secondary/70 text-secondary-foreground",
        outline: "border-border/80 bg-background/40 text-foreground",
        success: "border-success/25 bg-success/15 text-success-foreground",
        warning: "border-warning/25 bg-warning/15 text-warning-foreground",
        destructive: "border-destructive/25 bg-destructive/15 text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
