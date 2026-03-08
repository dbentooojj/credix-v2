"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";
import { adminNavigation } from "@/src/lib/navigation";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-7" aria-label="Navegacao principal">
      {adminNavigation.map((section) => (
        <div key={section.title} className="space-y-3">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
            {section.title}
          </p>
          <div className="space-y-2">
            {section.items.map((item) => {
              const isActive = item.match === "prefix"
                ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                : pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-start gap-3 rounded-[24px] border px-4 py-3 transition-all",
                    isActive
                      ? "border-primary/30 bg-primary/10 text-foreground shadow-lg shadow-primary/10"
                      : "border-transparent bg-transparent text-muted-foreground hover:border-border/70 hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border transition-colors",
                      isActive
                        ? "border-primary/30 bg-primary/15 text-primary"
                        : "border-border/70 bg-background/50 text-muted-foreground group-hover:text-primary",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
