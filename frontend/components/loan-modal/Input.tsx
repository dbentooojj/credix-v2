import type { InputHTMLAttributes } from "react";
import { cn, fieldControlBaseClass } from "./utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helperText?: string;
  wrapperClassName?: string;
  emphasis?: boolean;
};

export function Input({
  label,
  helperText,
  wrapperClassName,
  className,
  emphasis = false,
  ...props
}: InputProps) {
  return (
    <div className={cn("space-y-1.5", wrapperClassName)}>
      <label className="block text-sm font-medium text-slate-300/85">{label}</label>
      <input
        className={cn(
          fieldControlBaseClass,
          emphasis &&
            "border-teal-300/35 bg-teal-400/[0.08] text-slate-50 shadow-[0_0_0_1px_rgba(45,212,191,0.22)]",
          className,
        )}
        {...props}
      />
      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
    </div>
  );
}
