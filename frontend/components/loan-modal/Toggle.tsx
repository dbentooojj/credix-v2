import { cn } from "./utils";

type ToggleProps = {
  label: string;
  helperText?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  id?: string;
  className?: string;
};

export function Toggle({
  label,
  helperText,
  checked = false,
  onChange,
  id = "loan-toggle",
  className,
}: ToggleProps) {
  return (
    <label htmlFor={id} className={cn("inline-flex items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange?.(event.currentTarget.checked)}
        className="peer sr-only"
      />
      <span className="relative mt-0.5 h-6 w-11 rounded-full border border-white/20 bg-white/10 transition duration-200 peer-checked:border-teal-300/60 peer-checked:bg-teal-400/35 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-300 after:absolute after:left-[2px] after:top-[2px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:after:translate-x-[20px]" />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium text-slate-200">{label}</span>
        {helperText ? (
          <span className="block text-xs text-slate-500">{helperText}</span>
        ) : null}
      </span>
    </label>
  );
}
