import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/src/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lm-primary focus-visible:ring-offset-2 focus-visible:ring-offset-lm-bg disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-lm-primary text-lm-text hover:bg-lm-primary-strong",
        secondary: "border border-lm-border bg-lm-card text-lm-text hover:bg-lm-sidebar",
        ghost: "text-lm-text-muted hover:bg-lm-card hover:text-lm-text",
        danger: "bg-lm-danger text-lm-text hover:bg-rose-500",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
