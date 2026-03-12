import * as React from "react";
import { cn } from "@/src/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-lm-border bg-lm-sidebar px-3 py-2 text-sm text-lm-text placeholder:text-lm-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lm-primary focus-visible:ring-offset-2 focus-visible:ring-offset-lm-bg disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
