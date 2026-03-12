import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { cn } from "@/src/lib/utils";

type LegacyMigrationHeaderProps = {
  userName?: string;
  onMenuToggle?: () => void;
  brandHref?: string;
  rightSlot?: ReactNode;
  className?: string;
};

export function LegacyMigrationHeader({
  userName = "Administrador",
  onMenuToggle,
  brandHref = "/app/visao-geral",
  rightSlot,
  className,
}: LegacyMigrationHeaderProps) {
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-lm-border bg-[rgba(18,10,31,0.9)] backdrop-blur",
        className,
      )}
    >
      <div className="flex h-16 items-center justify-between px-3 sm:h-20 sm:px-6">
        <div className="flex items-center">
          <button
            aria-label="Alternar menu lateral"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-lm-text-muted transition hover:bg-lm-card hover:text-lm-text"
            onClick={onMenuToggle}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link aria-label="Credix" className="ml-3 text-2xl font-semibold tracking-tight text-lm-text sm:ml-6" href={brandHref}>
            <span>Cred</span>
            <span className="text-lm-primary-strong">ix</span>
          </Link>
        </div>

        {rightSlot ?? (
          <button
            className="flex items-center gap-2 rounded-xl px-2 py-2 text-lm-text-muted transition hover:text-lm-text"
            type="button"
          >
            <span className="font-semibold">Ola, {userName}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}
