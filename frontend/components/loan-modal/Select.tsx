import type { SelectHTMLAttributes } from "react";
import { cn, fieldControlBaseClass } from "./utils";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: SelectOption[];
  wrapperClassName?: string;
};

export function Select({
  label,
  options,
  wrapperClassName,
  className,
  ...props
}: SelectProps) {
  return (
    <div className={cn("space-y-1.5", wrapperClassName)}>
      <label className="block text-sm font-medium text-slate-300/85">{label}</label>
      <div className="relative">
        <select
          className={cn(
            fieldControlBaseClass,
            "appearance-none pr-10",
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option
              key={`${option.value}-${option.label}`}
              value={option.value}
              className="bg-slate-900 text-slate-100"
            >
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}
