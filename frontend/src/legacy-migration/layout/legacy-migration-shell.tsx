import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";
import { legacyMigrationClasses } from "../theme/tokens";

type LegacyMigrationShellProps = {
  children: ReactNode;
  className?: string;
};

export function LegacyMigrationShell({ children, className }: LegacyMigrationShellProps) {
  return (
    <div className={cn("min-h-screen", legacyMigrationClasses.appBackground, className)}>
      {children}
    </div>
  );
}
