import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

type LegacyMigrationPageProps = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function LegacyMigrationPage({
  title,
  subtitle,
  rightSlot,
  children,
  className,
}: LegacyMigrationPageProps) {
  return (
    <section className={cn("space-y-6", className)}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[clamp(1.8rem,1.1vw+1.1rem,2.35rem)] font-bold leading-[1.04] tracking-[-0.03em] text-lm-text">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-4xl text-sm leading-6 text-lm-text-muted">{subtitle}</p>
          ) : null}
        </div>
        {rightSlot}
      </header>
      {children}
    </section>
  );
}
